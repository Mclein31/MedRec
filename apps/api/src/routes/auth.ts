import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../lib/auth';
import { hashPassword, randomToken, sha256, verifyPassword } from '../lib/crypto';
import { one } from '../lib/db';
import { body, clientIp, issueSession, loadPublicUser } from '../lib/http';
import { decoyChallenge, resendChallenge, startChallenge, verifyChallenge } from '../lib/otp';
import { ipHash, logActivity, rateLimit } from '../lib/security';
import { HttpError, SYSTEM, asUser, type AppEnv } from '../lib/types';

export const auth = new Hono<AppEnv>();

const Email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(254);
const Password = z.string().min(10, 'Use at least 10 characters.').max(128);
const DeviceLabel = z.string().trim().max(80).optional();
const Code = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code.');

export const TRUST_DAYS = 30;
const LOCK_AFTER = 10;
const LOCK_MINUTES = 15;

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  email_verified_at: string | null;
  token_version: number;
  locked_until: string | null;
}

const BAD_CREDENTIALS = () => new HttpError(401, 'INVALID_CREDENTIALS', "That email and password don't match. Check both, or reset your password.");

// Unknown emails still pay the hashing cost, so response time doesn't reveal accounts.
let dummyHash: Promise<string> | undefined;
const burnHash = (password: string) => (dummyHash ??= hashPassword('medrec-timing-equaliser')).then((h) => verifyPassword(password, h));

const findUser = (c: { get: (k: 'services') => AppEnv['Variables']['services'] }, email: string) =>
  one<UserRow>(
    c.get('services').db,
    SYSTEM,
    'SELECT id, email, password_hash, email_verified_at, token_version, locked_until FROM users WHERE lower(email) = $1',
    [email],
  );

auth.post('/register', async (c) => {
  const input = await body(c, z.object({ name: z.string().trim().min(1, 'Enter your name.').max(100), email: Email, password: Password }));
  const s = c.get('services');
  await rateLimit(s.db, `register:ip:${clientIp(c) ?? 'local'}`, 10, 3600, s.now());
  const hash = await hashPassword(input.password);
  const [user] = await s.db.query<{ id: string; email: string }>(
    SYSTEM,
    `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT (lower(email)) DO NOTHING RETURNING id, email`,
    [input.email, input.name, hash],
  );
  if (!user) {
    throw new HttpError(409, 'EMAIL_ALREADY_EXISTS', 'An account already uses this email. Sign in instead, or reset your password.');
  }
  await s.db.query(asUser(user.id), 'INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);
  const challenge = await startChallenge(c.env, s, user, 'verify_email');
  return c.json({ status: 'verify_email', challenge }, 201);
});

auth.post('/login', async (c) => {
  const input = await body(c, z.object({ email: Email, password: z.string().min(1).max(128), deviceToken: z.string().max(100).optional() }));
  const s = c.get('services');
  await rateLimit(s.db, `login:ip:${clientIp(c) ?? 'local'}`, 30, 900, s.now());
  await rateLimit(s.db, `login:email:${input.email}`, 10, 900, s.now());

  const user = await findUser(c, input.email);
  if (!user) {
    await burnHash(input.password);
    throw BAD_CREDENTIALS();
  }
  if (user.locked_until && new Date(user.locked_until) > s.now()) {
    throw new HttpError(423, 'ACCOUNT_LOCKED', `Too many incorrect passwords. Try again in ${LOCK_MINUTES} minutes, or reset your password.`);
  }
  if (!(await verifyPassword(input.password, user.password_hash))) {
    await s.db.query(
      SYSTEM,
      `UPDATE users SET failed_logins = failed_logins + 1,
         locked_until = CASE WHEN failed_logins + 1 >= $2 THEN now() + make_interval(mins => $3) ELSE locked_until END
       WHERE id = $1`,
      [user.id, LOCK_AFTER, LOCK_MINUTES],
    );
    throw BAD_CREDENTIALS();
  }
  await s.db.query(SYSTEM, 'UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1', [user.id]);

  if (!user.email_verified_at) {
    return c.json({ status: 'verify_email', challenge: await startChallenge(c.env, s, user, 'verify_email') }, 202);
  }
  if (input.deviceToken) {
    const trusted = await one(
      s.db,
      asUser(user.id),
      'SELECT id FROM trusted_devices WHERE user_id = $1 AND token_hash = $2 AND expires_at > now()',
      [user.id, await sha256(input.deviceToken)],
    );
    if (trusted) return c.json(await signedIn(c, user, null, false));
  }
  return c.json({ status: 'otp_required', challenge: await startChallenge(c.env, s, user, 'login') }, 202);
});

type Ctx = Context<AppEnv>;

/** Opens a session (and optionally trusts this device) and records the sign-in. */
async function signedIn(c: Ctx, user: { id: string; token_version: number }, deviceLabel: string | null, trustDevice: boolean) {
  const s = c.get('services');
  const session = await issueSession(c, user, deviceLabel);
  let deviceToken: string | undefined;
  if (trustDevice) {
    deviceToken = randomToken(32);
    await s.db.query(
      asUser(user.id),
      'INSERT INTO trusted_devices (user_id, token_hash, label, expires_at) VALUES ($1, $2, $3, $4)',
      [user.id, await sha256(deviceToken), deviceLabel, new Date(s.now().getTime() + TRUST_DAYS * 86400_000).toISOString()],
    );
  }
  await logActivity(s.db, {
    userId: user.id,
    kind: 'sign_in',
    title: 'New sign-in',
    detail: deviceLabel ?? undefined,
    ipHash: await ipHash(clientIp(c), c.env.JWT_SECRET),
  });
  return { status: 'signed_in' as const, session, user: await loadPublicUser(s.db, user.id), ...(deviceToken ? { deviceToken } : {}) };
}

auth.post('/verify', async (c) => {
  const input = await body(
    c,
    z.object({
      challengeId: z.string().uuid(),
      code: Code,
      purpose: z.enum(['login', 'verify_email']),
      trustDevice: z.boolean().default(false),
      deviceLabel: DeviceLabel,
    }),
  );
  const s = c.get('services');
  await rateLimit(s.db, `verify:ip:${clientIp(c) ?? 'local'}`, 40, 900, s.now());
  const { userId } = await verifyChallenge(c.env, s, input.challengeId, input.code, input.purpose);
  const [user] = await s.db.query<{ id: string; token_version: number }>(
    SYSTEM,
    input.purpose === 'verify_email'
      ? 'UPDATE users SET email_verified_at = coalesce(email_verified_at, now()) WHERE id = $1 RETURNING id, token_version'
      : 'SELECT id, token_version FROM users WHERE id = $1',
    [userId],
  );
  if (!user) throw new HttpError(401, 'SESSION_EXPIRED', 'Please sign in again.');
  return c.json(await signedIn(c, user, input.deviceLabel ?? null, input.trustDevice));
});

auth.post('/resend', async (c) => {
  const { challengeId } = await body(c, z.object({ challengeId: z.string().uuid() }));
  const s = c.get('services');
  await rateLimit(s.db, `resend:ip:${clientIp(c) ?? 'local'}`, 15, 3600, s.now());
  return c.json({ challenge: await resendChallenge(c.env, s, challengeId) });
});

/** Rotates the refresh token. Reusing an already-rotated token revokes that session. */
auth.post('/refresh', async (c) => {
  const { refreshToken } = await body(c, z.object({ refreshToken: z.string().min(20).max(100) }));
  const s = c.get('services');
  await rateLimit(s.db, `refresh:ip:${clientIp(c) ?? 'local'}`, 120, 900, s.now());
  const hash = await sha256(refreshToken);
  const [row] = await s.db.query<{ id: string; user_id: string; token_version: number; device_label: string | null; usable: boolean }>(
    SYSTEM,
    `SELECT s.id, s.user_id, u.token_version, s.device_label, (s.revoked_at IS NULL AND s.expires_at > now()) AS usable
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.refresh_hash = $1`,
    [hash],
  );
  if (!row || !row.usable) throw new HttpError(401, 'SESSION_EXPIRED', 'Your session ended. Please sign in again.');
  // Conditional revoke: of two concurrent refreshes with one token, only one wins.
  const [claimed] = await s.db.query(SYSTEM, 'UPDATE sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL RETURNING id', [row.id]);
  if (!claimed) throw new HttpError(401, 'SESSION_EXPIRED', 'Your session ended. Please sign in again.');
  const session = await issueSession(c, { id: row.user_id, token_version: row.token_version }, row.device_label);
  return c.json({ session });
});

auth.post('/password/forgot', async (c) => {
  const { email } = await body(c, z.object({ email: Email }));
  const s = c.get('services');
  await rateLimit(s.db, `forgot:ip:${clientIp(c) ?? 'local'}`, 10, 3600, s.now());
  await rateLimit(s.db, `forgot:email:${email}`, 5, 3600, s.now());
  const user = await findUser(c, email);
  // Same response either way, so this can't be used to discover accounts.
  const challenge = user ? await startChallenge(c.env, s, user, 'reset_password') : decoyChallenge(email, 'reset_password');
  return c.json({ challenge }, 202);
});

/** Sets a new password, then signs out every device and forgets trusted devices. */
auth.post('/password/reset', async (c) => {
  const input = await body(c, z.object({ challengeId: z.string().uuid(), code: Code, password: Password }));
  const s = c.get('services');
  await rateLimit(s.db, `reset:ip:${clientIp(c) ?? 'local'}`, 20, 900, s.now());
  const { userId } = await verifyChallenge(c.env, s, input.challengeId, input.code, 'reset_password');
  await replacePassword(c, userId, input.password);
  return c.json({ status: 'password_reset' });
});

async function replacePassword(c: Ctx, userId: string, password: string) {
  const { db } = c.get('services');
  const ctx = asUser(userId);
  await db.query(
    ctx,
    `UPDATE users SET password_hash = $2, token_version = token_version + 1, failed_logins = 0, locked_until = NULL,
       email_verified_at = coalesce(email_verified_at, now()), updated_at = now() WHERE id = $1`,
    [userId, await hashPassword(password)],
  );
  await db.query(ctx, 'UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
  await db.query(ctx, 'DELETE FROM trusted_devices WHERE user_id = $1', [userId]);
  await logActivity(db, { userId, kind: 'password_changed', title: 'Password changed', detail: 'All devices were signed out.' });
}

auth.use('/me', requireAuth);
auth.use('/logout', requireAuth);
auth.use('/password/change', requireAuth);
auth.use('/sessions', requireAuth);
auth.use('/sessions/*', requireAuth);
auth.use('/trusted-devices', requireAuth);

auth.get('/me', async (c) => c.json({ user: await loadPublicUser(c.get('services').db, c.get('userId')) }));

auth.post('/logout', async (c) => {
  const { db } = c.get('services');
  await db.query(asUser(c.get('userId')), 'UPDATE sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL', [c.get('sessionId')]);
  return c.json({ signedOut: true });
});

auth.post('/password/change', async (c) => {
  const input = await body(c, z.object({ currentPassword: z.string().min(1).max(128), newPassword: Password }));
  const s = c.get('services');
  const userId = c.get('userId');
  await rateLimit(s.db, `change:user:${userId}`, 5, 900, s.now());
  const [user] = await s.db.query<{ password_hash: string }>(asUser(userId), 'SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (!user || !(await verifyPassword(input.currentPassword, user.password_hash))) {
    // Distinct from SESSION_EXPIRED: a wrong current password must not sign the user out.
    throw new HttpError(400, 'WRONG_PASSWORD', "Your current password isn't right.", { field: 'currentPassword' });
  }
  await replacePassword(c, userId, input.newPassword);
  return c.json({ status: 'password_changed' });
});

auth.get('/sessions', async (c) => {
  const { db } = c.get('services');
  const rows = await db.query<{ id: string; device_label: string | null; created_at: string; last_used_at: string }>(
    asUser(c.get('userId')),
    `SELECT id, device_label, created_at, last_used_at FROM sessions
      WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now() ORDER BY last_used_at DESC`,
    [c.get('userId')],
  );
  return c.json({
    sessions: rows.map((r) => ({ id: r.id, device: r.device_label, createdAt: r.created_at, lastUsedAt: r.last_used_at, current: r.id === c.get('sessionId') })),
  });
});

auth.delete('/sessions/:id', async (c) => {
  const { db } = c.get('services');
  const id = c.req.param('id');
  if (!z.string().uuid().safeParse(id).success) throw new HttpError(404, 'NOT_FOUND', 'That session no longer exists.');
  await db.query(asUser(c.get('userId')), 'UPDATE sessions SET revoked_at = now() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL', [id, c.get('userId')]);
  return c.json({ revoked: true });
});

auth.delete('/trusted-devices', async (c) => {
  const { db } = c.get('services');
  await db.query(asUser(c.get('userId')), 'DELETE FROM trusted_devices WHERE user_id = $1', [c.get('userId')]);
  return c.json({ cleared: true });
});
