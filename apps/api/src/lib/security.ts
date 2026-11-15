import { b64url, fromB64url, hmac, safeEqual, sha256 } from './crypto';
import { HttpError, SYSTEM, asUser, type Db } from './types';

const windowOf = (windowSeconds: number, now: Date) => new Date(Math.floor(now.getTime() / (windowSeconds * 1000)) * windowSeconds * 1000);

/** Fixed-window limiter backed by Postgres, so it holds across Worker isolates. */
export async function rateLimit(
  db: Db,
  key: string,
  limit: number,
  windowSeconds: number,
  now: Date,
  error: { code?: string; message?: (wait: string) => string } = {},
) {
  const windowStart = windowOf(windowSeconds, now);
  const [row] = await db.query<{ hits: number }>(
    SYSTEM,
    `INSERT INTO rate_limits (key, window_start) VALUES ($1, $2)
     ON CONFLICT (key, window_start) DO UPDATE SET hits = rate_limits.hits + 1
     RETURNING hits`,
    [key, windowStart.toISOString()],
  );
  if (row && row.hits > limit) throw limited(windowStart, windowSeconds, now, error);
}

/** Throws if a key has already reached its limit in the current window, without counting this call. */
export async function assertUnderLimit(
  db: Db,
  key: string,
  limit: number,
  windowSeconds: number,
  now: Date,
  error: { code?: string; message?: (wait: string) => string } = {},
) {
  const windowStart = windowOf(windowSeconds, now);
  const [row] = await db.query<{ hits: number }>(SYSTEM, 'SELECT hits FROM rate_limits WHERE key = $1 AND window_start = $2', [key, windowStart.toISOString()]);
  if (row && row.hits >= limit) throw limited(windowStart, windowSeconds, now, error);
}

function limited(windowStart: Date, windowSeconds: number, now: Date, error: { code?: string; message?: (wait: string) => string }) {
  const retryAfter = Math.ceil((windowStart.getTime() + windowSeconds * 1000 - now.getTime()) / 1000);
  const wait = formatWait(retryAfter);
  return new HttpError(429, error.code ?? 'RATE_LIMITED', error.message?.(wait) ?? `Too many attempts. Try again in ${wait}.`, { retryAfter });
}

/** Service-wide hourly cap on paid AI calls, so many accounts can't multiply the operator's Gemini spend. */
export const AI_HOURLY_LIMIT_DEFAULT = 500;
export async function aiBudget(db: Db, env: { AI_HOURLY_LIMIT?: string }, now: Date) {
  const limit = Number(env.AI_HOURLY_LIMIT) > 0 ? Number(env.AI_HOURLY_LIMIT) : AI_HOURLY_LIMIT_DEFAULT;
  await rateLimit(db, 'ai:global', limit, 3600, now, {
    code: 'AI_BUSY',
    message: (wait) => `MedRec's AI reader is busy right now. Try again in ${wait}.`,
  });
}

function formatWait(seconds: number) {
  return seconds < 90 ? `${seconds} seconds` : `${Math.ceil(seconds / 60)} minutes`;
}

export async function ipHash(ip: string | undefined, secret: string) {
  return ip ? (await sha256(`${secret}:${ip}`)).slice(0, 24) : null;
}

export async function logActivity(
  db: Db,
  entry: { userId: string; kind: string; title: string; detail?: string; meta?: Record<string, unknown>; ipHash?: string | null },
) {
  await db.query(
    asUser(entry.userId),
    `INSERT INTO activity (user_id, kind, title, detail, meta, ip_hash) VALUES ($1, $2, $3, $4, $5, $6)`,
    [entry.userId, entry.kind, entry.title, entry.detail ?? null, JSON.stringify(entry.meta ?? {}), entry.ipHash ?? null],
  );
}

// Share links: token = base64url(shareId bytes ‖ first 16 bytes of HMAC(shareId)).
function uuidBytes(id: string) {
  return Uint8Array.from(id.replace(/-/g, '').match(/../g)!.map((h) => parseInt(h, 16)));
}

function bytesUuid(bytes: Uint8Array) {
  const h = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export async function shareToken(shareId: string, secret: string) {
  const mac = (await hmac(secret, `share:${shareId}`)).slice(0, 16);
  const out = new Uint8Array(32);
  out.set(uuidBytes(shareId), 0);
  out.set(mac, 16);
  return b64url(out);
}

export async function shareIdFromToken(token: string, secret: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const raw = fromB64url(token);
  const id = bytesUuid(raw.slice(0, 16));
  const expected = (await hmac(secret, `share:${id}`)).slice(0, 16);
  return safeEqual(expected, raw.slice(16)) ? id : null;
}

const fileMessage = (key: string, exp: number, shareId?: string) => (shareId ? `file:${key}:${exp}:share:${shareId}` : `file:${key}:${exp}`);

/**
 * Short-lived signed path for streaming a private R2 object through the Worker.
 * Links issued on a share page carry the share id inside the signature, so the
 * file route can refuse them as soon as that share is revoked or expires.
 */
export async function signFilePath(key: string, secret: string, ttlSeconds: number, now: Date, shareId?: string) {
  const exp = Math.floor(now.getTime() / 1000) + ttlSeconds;
  const sig = b64url((await hmac(secret, fileMessage(key, exp, shareId))).slice(0, 18));
  return `/files/${encodeURIComponent(key)}?exp=${exp}&sig=${sig}${shareId ? `&share=${shareId}` : ''}`;
}

export async function verifyFileSignature(key: string, exp: string, sig: string, secret: string, now: Date, shareId?: string) {
  const expNum = Number(exp);
  if (!Number.isInteger(expNum) || expNum * 1000 < now.getTime()) return false;
  const expected = b64url((await hmac(secret, fileMessage(key, expNum, shareId))).slice(0, 18));
  return safeEqual(expected, sig);
}

/** Counts one hit of a key in the current window and returns the window's total, never failing the request. */
export async function countHit(db: Db, key: string, windowSeconds: number, now: Date) {
  const [row] = await db.query<{ hits: number }>(
    SYSTEM,
    `INSERT INTO rate_limits (key, window_start) VALUES ($1, $2)
     ON CONFLICT (key, window_start) DO UPDATE SET hits = rate_limits.hits + 1 RETURNING hits`,
    [key, windowOf(windowSeconds, now).toISOString()],
  );
  return row?.hits ?? 0;
}

/** True for the first hit of a key within the window; used to throttle notifications without failing the request. */
export async function firstInWindow(db: Db, key: string, windowSeconds: number, now: Date) {
  return (await countHit(db, key, windowSeconds, now)) === 1;
}
