import type { Context } from 'hono';
import type { z } from 'zod';
import { randomToken, sha256, signJwt } from './crypto';
import { HttpError, SYSTEM, asUser, type AppEnv, type Db } from './types';

export async function body<S extends z.ZodType>(c: Context<AppEnv>, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'Request body must be JSON.');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.join('.') || 'request';
    // Custom messages read on their own under the field; generic ones get the field name.
    const custom = issue && !/^(Invalid|Expected|Required|Too )/.test(issue.message);
    throw new HttpError(422, 'VALIDATION', custom ? issue.message : `${field}: ${issue?.message ?? 'invalid value'}`, { field });
  }
  return parsed.data;
}

export const ACCESS_TTL = 15 * 60;
export const REFRESH_TTL_DAYS = 30;

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}

export async function issueSession(
  c: Context<AppEnv>,
  user: { id: string; token_version: number },
  deviceLabel: string | null,
) {
  const { db, now } = c.get('services');
  const refreshToken = randomToken(32);
  const [session] = await db.query<{ id: string }>(
    SYSTEM,
    `INSERT INTO sessions (user_id, refresh_hash, device_label, expires_at)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [user.id, await sha256(refreshToken), deviceLabel, new Date(now().getTime() + REFRESH_TTL_DAYS * 86400_000).toISOString()],
  );
  const accessToken = await signJwt({ sub: user.id, tv: user.token_version, sid: session!.id }, c.env.JWT_SECRET, ACCESS_TTL, now());
  return { accessToken, refreshToken, expiresIn: ACCESS_TTL };
}

export async function loadPublicUser(db: Db, id: string): Promise<PublicUser> {
  const [u] = await db.query<{ id: string; name: string; email: string; email_verified_at: string | null }>(
    asUser(id),
    'SELECT id, name, email, email_verified_at FROM users WHERE id = $1',
    [id],
  );
  if (!u) throw new HttpError(401, 'SESSION_EXPIRED', 'Please sign in again.');
  return { id: u.id, name: u.name, email: u.email, emailVerified: !!u.email_verified_at };
}

export function clientIp(c: Context<AppEnv>) {
  return c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
}
