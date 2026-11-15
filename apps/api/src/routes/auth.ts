import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../lib/auth';
import { hashPassword, randomToken, sha256, verifyPassword } from '../lib/crypto';
import { one } from '../lib/db';
import { body, clientIp, issueSession, loadPublicUser } from '../lib/http';
import { existingAccountEmail } from '../lib/email';
import { resendChallenge, startChallenge, startDecoyChallenge, verifyChallenge } from '../lib/otp';
import { assertUnderLimit, countHit, firstInWindow, ipHash, logActivity, rateLimit } from '../lib/security';
import { HttpError, SYSTEM, asUser, type AppEnv } from '../lib/types';

export const auth = new Hono<AppEnv>();

const Email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(254);
const Password = z.string().min(10, 'Use at least 10 characters.').max(128);
const DeviceLabel = z.string().trim().max(80).optional();
const Code = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code.');

export const TRUST_DAYS = 30;
/**
 * Wrong passwords per email per hour before sign-in from untrusted devices pauses.
 * There is no hard account lock: a stranger who knows an address could otherwise keep
 * its owner signed out (DD-21 SEC-R01). Trusted devices and existing sessions are never
 * affected, and every new device still needs the emailed code after a correct password.
 */
export const LOGIN_FAILURES_PER_HOUR = 100;

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  email_verified_at: string | null;
  token_version: number;
}

const BAD_CREDENTIALS = () => new HttpError(401, 'INVALID_CREDENTIALS', "That email and password don't match. Check both, or reset your password.");

// Unknown emails still pay the hashing cost, so response time doesn't reveal accounts.
let dummyHash: Promise<string> | undefined;
const burnHash = (password: string) => (dummyHash ??= hashPassword('medrec-timing-equaliser')).then((h) => verifyPassword(password, h));

const findUser = (c: { get: (k: 'services') => AppEnv['Variables']['services'] }, email: string) =>
  one<UserRow>(
    c.get('services').db,
    SYSTEM,
    'SELECT id, email, password_hash, email_verified_at, token_version FROM users WHERE lower(email) = $1',
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
    // Answer exactly as for a new account, so sign-up can't reveal who has one. The owner
    // gets a notice instead of a code (at most hourly), telling them to sign in or reset.
    const existing = await findUser(c, input.email);
    if (existing && (await firstInWindow(s.db, `register-notice:${input.email}`, 3600, s.now()))) {
      await s.mailer.send({ to: existing.email, ...existingAccountEmail() });
    }
    return c.json({ status: 'verify_email', challenge: await startDecoyChallenge(c.env, s, input.email, 'verify_email') }, 201);
  }
  await s.db.query(asUser(user.id), 'INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);
  const challenge = await startChallenge(c.env, s, user, 'verify_email');
  return c.json({ status: 'verify_email', challenge }, 201);
});

auth.post('/login', async (c) => {
  const input = await body(c, z.object({ email: Email, password: z.string().min(1).max(128), deviceToken: z.string().max(100).optional() }));
  const s = c.get('services');
  const ip = clientIp(c) ?? 'local';
  await rateLimit(s.db, `login:ip:${ip}`, 30, 900, s.now());
  // Per email *and* address: one caller's wrong guesses never throttle the owner's own attempts.
  await rateLimit(s.db, `login:email-ip:${input.email}:${ip}`, 10, 900, s.now());

  const user = await findUser(c, input.email);
  // A device that already passed an emailed code is exempt from the per-email limit below.
  const trusted =
    user && input.deviceToken
      ? await one<{ id: string; label: string | null }>(
          s.db,
          asUser(user.id),
          'SELECT id, label FROM trusted_devices WHERE user_id = $1 AND token_hash = $2 AND expires_at > now()',
          [user.id, await sha256(input.deviceToken)],
        )
      : undefined;
  // Applied the same way to unknown emails, so the limit itself reveals nothing about accounts.
  const failures = `login-fail:${input.email}`;
  if (!trusted) {
    await assertUnderLimit(s.db, failures, LOGIN_FAILURES_PER_HOUR, 3600, s.now(), {
      code: 'LOGIN_PAUSED',
      message: (wait) => `Too many incorrect passwords for this email. Try again in ${wait}, or reset your password.`,
    });
  }
  if (!user) {
    await burnHash(input.password);
    await countHit(s.db, failures, 3600, s.now());
    throw BAD_CREDENTIALS();
  }
  if (!(await verifyPassword(input.password, user.password_hash))) {
    await countHit(s.db, failures, 3600, s.now());
    throw BAD_CREDENTIALS();
  }

  if (!user.email_verified_at) {
    return c.json({ status: 'verify_email', challenge: await startChallenge(c.env, s, user, 'verify_email') }, 202);
  }
  // The device was named when it was trusted; reuse that so sessions don't show as unknown.
  if (trusted) return c.json(await signedIn(c, user, trusted.label, { existing: trusted.id }));
  return c.json({ status: 'otp_required', challenge: await startChallenge(c.env, s, user, 'login') }, 202);
});

type Ctx = Context<AppEnv>;

/**
 * Opens a session and records the sign-in. `device` is 'trust' to trust this device now,
 * or the trusted device the sign-in came from; either way the session is linked to it.
 */
async function signedIn(c: Ctx, user: { id: string; token_version: number }, deviceLabel: string | null, device: 'trust' | { existing: string } | null) {
  const s = c.get('services');
  let deviceToken: string | undefined;
  let trustedDeviceId = device && device !== 'trust' ? device.existing : null;
  if (device === 'trust') {
    deviceToken = randomToken(32);
    const [row] = await s.db.query<{ id: string }>(
      asUser(user.id),
      'INSERT INTO trusted_devices (user_id, token_hash, label, expires_at) VALUES ($1, $2, $3, $4) RETURNING id',
      [user.id, await sha256(deviceToken), deviceLabel, new Date(s.now().getTime() + TRUST_DAYS * 86400_000).toISOString()],
    );
    trustedDeviceId = row!.id;
  }
  const session = await issueSession(c, user, deviceLabel, trustedDeviceId);
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
  return c.json(await signedIn(c, user, input.deviceLabel ?? null, input.trustDevice ? 'trust' : null));
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
  const [row] = await s.db.query<{ id: string; user_id: string; token_version: number; device_label: string | null; trusted_device_id: string | null; usable: boolean }>(
    SYSTEM,
    `SELECT s.id, s.user_id, u.token_version, s.device_label, s.trusted_device_id, (s.revoked_at IS NULL AND s.expires_at > now()) AS usable
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.refresh_hash = $1`,
    [hash],
  );
  if (!row || !row.usable) throw new HttpError(401, 'SESSION_EXPIRED', 'Your session ended. Please sign in again.');
  // Conditional revoke: of two concurrent refreshes with one token, only one wins.
  const [claimed] = await s.db.query(SYSTEM, 'UPDATE sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL RETURNING id', [row.id]);
  if (!claimed) throw new HttpError(401, 'SESSION_EXPIRED', 'Your session ended. Please sign in again.');
  const session = await issueSession(c, { id: row.user_id, token_version: row.token_version }, row.device_label, row.trusted_device_id);
  return c.json({ session });
});

auth.post('/password/forgot', async (c) => {
  const { email } = await body(c, z.object({ email: Email }));
  const s = c.get('services');
  await rateLimit(s.db, `forgot:ip:${clientIp(c) ?? 'local'}`, 10, 3600, s.now());
  await rateLimit(s.db, `forgot:email:${email}`, 5, 3600, s.now());
  const user = await findUser(c, email);
  // Same response either way, so this can't be used to discover accounts.
  const challenge = user ? await startChallenge(c.env, s, user, 'reset_password') : await startDecoyChallenge(c.env, s, email, 'reset_password');
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

/**
 * Signs one session out and forgets the trusted device it was opened with, so that device
 * needs an emailed code again (DD-58). The device is removed first: its ON DELETE SET NULL
 * touches the session row, which must not also be updated in the same statement.
 */
async function endSession(db: AppEnv['Variables']['services']['db'], userId: string, sessionId: string) {
  const ctx = asUser(userId);
  await db.query(
    ctx,
    `DELETE FROM trusted_devices WHERE user_id = $2
       AND id = (SELECT trusted_device_id FROM sessions WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL)`,
    [sessionId, userId],
  );
  await db.query(ctx, 'UPDATE sessions SET revoked_at = now() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL', [sessionId, userId]);
}

auth.post('/logout', async (c) => {
  await endSession(c.get('services').db, c.get('userId'), c.get('sessionId'));
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
  await endSession(db, c.get('userId'), id);
  return c.json({ revoked: true });
});

auth.delete('/trusted-devices', async (c) => {
  const { db } = c.get('services');
  await db.query(asUser(c.get('userId')), 'DELETE FROM trusted_devices WHERE user_id = $1', [c.get('userId')]);
  return c.json({ cleared: true });
});

/**
 * Permanently deletes the account: every stored file, then the user row, which cascades to
 * profile, records, shares, sessions, devices, codes and activity. Requires the current password.
 */
auth.use('/account', requireAuth);
auth.delete('/account', async (c) => {
  const { password } = await body(c, z.object({ password: z.string().min(1, 'Enter your password.').max(128) }));
  const s = c.get('services');
  const userId = c.get('userId');
  const ctx = asUser(userId);
  await rateLimit(s.db, `delete:user:${userId}`, 5, 900, s.now());
  const [user] = await s.db.query<{ password_hash: string }>(ctx, 'SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw new HttpError(400, 'WRONG_PASSWORD', "That password isn't right.", { field: 'password' });
  }
  const files = await s.db.query<{ object_key: string }>(ctx, 'SELECT object_key FROM record_files WHERE user_id = $1', [userId]);
  const [profileRow] = await s.db.query<{ avatar_key: string | null }>(ctx, 'SELECT avatar_key FROM profiles WHERE user_id = $1', [userId]);
  const keys = [...files.map((f) => f.object_key), ...(profileRow?.avatar_key ? [profileRow.avatar_key] : [])];
  for (let i = 0; i < keys.length; i += 500) await c.env.VAULT.delete(keys.slice(i, i + 500));
  await s.db.query(ctx, 'DELETE FROM users WHERE id = $1', [userId]);
  return c.json({ deleted: true });
});
