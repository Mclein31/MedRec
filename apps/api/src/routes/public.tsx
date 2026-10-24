import { Hono, type Context } from 'hono';
import { randomToken } from '../lib/crypto';
import { filesFor, signedFiles } from '../lib/records';
import { firstInWindow, ipHash, logActivity, rateLimit, verifyFileSignature } from '../lib/security';
import { CATEGORY_NAMES, openShare, scopeLabel, sharedRecords } from '../lib/shares';
import { HttpError, SYSTEM, type AppEnv } from '../lib/types';
import { EmergencyPage } from '../views/emergency';
import { Notice } from '../views/layout';
import { SharePage, type SharedRecord } from '../views/share';
import { loadProfile } from './profile';

export const pub = new Hono<AppEnv>();

function secureHtml(c: Context<AppEnv>, nonce: string) {
  c.header('cache-control', 'no-store');
  c.header('x-frame-options', 'DENY');
  c.header('referrer-policy', 'no-referrer');
  c.header('content-security-policy', `default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`);
}

function endsIn(expiresAt: string, now: Date) {
  const mins = Math.max(1, Math.round((new Date(expiresAt).getTime() - now.getTime()) / 60_000));
  if (mins < 60) return `in ${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  return `in ${Math.round(hours / 24)} days`;
}

const UNAVAILABLE = {
  title: 'This link is no longer available',
  message: 'Shared MedRec links expire after a short time, and patients can turn them off. Ask the patient to show you a new QR code.',
};

pub.get('/s/:token', async (c) => {
  const s = c.get('services');
  const nonce = randomToken(16);
  secureHtml(c, nonce);
  await rateLimit(s.db, `share-view:ip:${c.req.header('cf-connecting-ip') ?? 'local'}`, 60, 600, s.now());
  const share = await openShare(s.db, c.env, c.req.param('token'), s.now());
  if (!share) return c.html(<Notice {...UNAVAILABLE} />, 404);

  const [viewed] = await s.db.query<{ first: boolean }>(
    SYSTEM,
    `UPDATE shares SET view_count = view_count + 1, first_view_at = coalesce(first_view_at, now())
      WHERE id = $1 RETURNING view_count = 1 AS first`,
    [share.id],
  );
  if (viewed?.first) {
    await logActivity(s.db, {
      userId: share.user_id,
      kind: 'share_viewed',
      title: 'Your shared records were opened',
      detail: scopeLabel(share, CATEGORY_NAMES),
      meta: { shareId: share.id },
      ipHash: await ipHash(c.req.header('cf-connecting-ip'), c.env.JWT_SECRET),
    });
  }

  const profile = await loadProfile(c, share.user_id);
  const rows = await sharedRecords(s.db, share);
  const files = await filesFor(s.db, share.user_id, rows.map((r) => r.id));
  // File links never outlive the share itself.
  const ttl = Math.max(60, Math.min(900, Math.floor((new Date(share.expires_at).getTime() - s.now().getTime()) / 1000)));
  const records: SharedRecord[] = await Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      title: r.title,
      categoryName: CATEGORY_NAMES[r.category] ?? r.category,
      eventDate: r.event_date,
      provider: r.provider,
      facility: r.facility,
      notes: r.notes,
      ai: r.ai as SharedRecord['ai'],
      files: await signedFiles(c.env, files.get(r.id) ?? [], s.now(), ttl),
    })),
  );
  return c.html(
    <SharePage
      patient={profile}
      scopeLabel={scopeLabel(share, CATEGORY_NAMES)}
      endsIn={endsIn(share.expires_at, s.now())}
      records={records}
      nonce={nonce}
      now={s.now()}
    />,
  );
});

pub.get('/e/:slug', async (c) => {
  const s = c.get('services');
  secureHtml(c, randomToken(16));
  const ip = c.req.header('cf-connecting-ip') ?? 'local';
  await rateLimit(s.db, `emergency:ip:${ip}`, 30, 600, s.now());
  const slug = c.req.param('slug');
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(slug)) return c.html(<Notice {...EMERGENCY_OFF} />, 404);
  const [row] = await s.db.query<{ user_id: string }>(SYSTEM, 'SELECT user_id FROM profiles WHERE emergency_slug = $1 AND emergency_enabled', [slug]);
  if (!row) return c.html(<Notice {...EMERGENCY_OFF} />, 404);

  // Notify the patient, at most once per 10 minutes per viewer.
  if (await firstInWindow(s.db, `emergency-log:${row.user_id}:${await ipHash(ip, c.env.JWT_SECRET)}`, 600, s.now())) {
    await logActivity(s.db, {
      userId: row.user_id,
      kind: 'emergency_viewed',
      title: 'Your Medical ID was viewed',
      ipHash: await ipHash(ip, c.env.JWT_SECRET),
    });
  }
  const p = await loadProfile(c, row.user_id);
  return c.html(
    <EmergencyPage
      name={p.name}
      dateOfBirth={p.dateOfBirth}
      bloodType={p.bloodType}
      allergies={p.allergies}
      conditions={p.conditions}
      medications={p.medications}
      organDonor={p.organDonor}
      contact={{ name: p.emergencyContactName, phone: p.emergencyContactPhone, relation: p.emergencyContactRelation }}
      now={s.now()}
    />,
  );
});

const EMERGENCY_OFF = {
  title: 'Medical ID is not available',
  message: 'The person has turned this Medical ID off or replaced the link. In an emergency, call your local emergency number.',
};

/** Streams a private R2 object for a valid, unexpired signature. */
pub.get('/files/:key', async (c) => {
  const s = c.get('services');
  const key = c.req.param('key');
  const ok = await verifyFileSignature(key, c.req.query('exp') ?? '', c.req.query('sig') ?? '', c.env.FILE_SIGNING_SECRET, s.now());
  if (!ok) throw new HttpError(403, 'LINK_EXPIRED', 'This file link expired. Reopen the record to get a new one.');
  const obj = await c.env.VAULT.get(key);
  if (!obj) throw new HttpError(404, 'NOT_FOUND', 'This file was deleted.');
  return new Response(obj.body, {
    headers: {
      'content-type': obj.httpMetadata?.contentType ?? 'application/octet-stream',
      'content-length': String(obj.size),
      'cache-control': 'private, max-age=600',
      'content-disposition': 'inline',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      'cross-origin-resource-policy': 'cross-origin',
    },
  });
});
