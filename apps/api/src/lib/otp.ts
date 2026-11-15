import { otpCode, safeEqual, sha256 } from './crypto';
import { maskEmail, otpEmail } from './email';
import { assertUnderLimit, rateLimit } from './security';
import { HttpError, SYSTEM, type Bindings, type Services } from './types';

export type OtpPurpose = 'login' | 'verify_email' | 'reset_password';

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_SECONDS = 60;
export const OTP_MAX_SENDS = 5;
/**
 * Wrong codes allowed per email address and purpose per day, across every challenge and resend.
 * Per-code limits alone renew with each new code, which let a patient attacker
 * guess a reset code over days; this caps the odds at about 1 in 67,000 per day.
 */
export const OTP_DAILY_FAILURES = 15;

const codeHash = (secret: string, challengeId: string, code: string) => sha256(`${secret}:otp:${challengeId}:${code}`);
// Per purpose, so someone guessing reset codes for an address can't also block that person's sign-in codes.
const failureKey = (purpose: OtpPurpose, email: string) => `otp-fail:${purpose}:${email.toLowerCase()}`;
const DAILY_LIMIT = {
  code: 'OTP_DAILY_LIMIT',
  message: (wait: string) => `Too many incorrect codes for this email today. Try again in ${wait}.`,
};

export interface ChallengeResponse {
  challengeId: string;
  purpose: OtpPurpose;
  maskedEmail: string;
  expiresIn: number;
  resendIn: number;
}

const response = (id: string, purpose: OtpPurpose, email: string): ChallengeResponse => ({
  challengeId: id,
  purpose,
  maskedEmail: maskEmail(email),
  expiresIn: OTP_TTL_MINUTES * 60,
  resendIn: OTP_RESEND_SECONDS,
});

/** Creates a challenge and emails its code. Earlier open challenges of the same purpose are closed. */
export async function startChallenge(
  env: Bindings,
  { db, mailer, now }: Services,
  user: { id: string; email: string },
  purpose: OtpPurpose,
): Promise<ChallengeResponse> {
  await db.query(SYSTEM, `UPDATE otp_challenges SET consumed_at = now() WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL`, [
    user.id,
    purpose,
  ]);
  const id = crypto.randomUUID();
  const code = otpCode();
  const expiresAt = new Date(now().getTime() + OTP_TTL_MINUTES * 60_000);
  await db.query(
    SYSTEM,
    `INSERT INTO otp_challenges (id, user_id, purpose, code_hash, expires_at, last_sent_at) VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, user.id, purpose, await codeHash(env.JWT_SECRET, id, code), expiresAt.toISOString(), now().toISOString()],
  );
  await mailer.send({ to: user.email, ...otpEmail(purpose, code, OTP_TTL_MINUTES) });
  return response(id, purpose, user.email);
}

/**
 * A real challenge row with no account behind it and no email sent, used where answering
 * truthfully would reveal whether an address has an account (password reset for unknown
 * emails, registration for taken ones). Resend, cooldown, attempt and expiry behaviour is
 * identical to a real challenge; no code can ever match because none was sent.
 */
export async function startDecoyChallenge(env: Bindings, { db, now }: Services, email: string, purpose: OtpPurpose): Promise<ChallengeResponse> {
  await db.query(SYSTEM, `UPDATE otp_challenges SET consumed_at = now() WHERE decoy_email = $1 AND purpose = $2 AND consumed_at IS NULL`, [
    email,
    purpose,
  ]);
  const id = crypto.randomUUID();
  await db.query(
    SYSTEM,
    `INSERT INTO otp_challenges (id, decoy_email, purpose, code_hash, expires_at, last_sent_at) VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, email, purpose, await codeHash(env.JWT_SECRET, id, otpCode()), new Date(now().getTime() + OTP_TTL_MINUTES * 60_000).toISOString(), now().toISOString()],
  );
  return response(id, purpose, email);
}

interface ChallengeRow {
  id: string;
  user_id: string | null;
  purpose: OtpPurpose;
  code_hash: string;
  attempts: number;
  send_count: number;
  last_sent_at: string;
  expires_at: string;
  consumed_at: string | null;
  email: string;
}

async function loadChallenge(db: Services['db'], id: string) {
  const [row] = await db.query<ChallengeRow>(
    SYSTEM,
    `SELECT c.*, coalesce(u.email, c.decoy_email) AS email FROM otp_challenges c LEFT JOIN users u ON u.id = c.user_id WHERE c.id = $1`,
    [id],
  );
  return row;
}

const INVALID = () => new HttpError(400, 'OTP_INVALID', "That code isn't right. Check the latest email from MedRec and try again.");

/**
 * Verifies a code. Wrong codes count toward the per-code limit and the per-email daily
 * limit; the challenge closes on success.
 */
export async function verifyChallenge(env: Bindings, { db, now }: Services, id: string, code: string, purpose: OtpPurpose) {
  const row = await loadChallenge(db, id);
  if (!row || row.purpose !== purpose) throw INVALID();
  if (row.consumed_at) throw new HttpError(400, 'OTP_USED', 'This code was already used or replaced. Request a new one.');
  if (new Date(row.expires_at) <= now()) throw new HttpError(400, 'OTP_EXPIRED', 'This code has expired. Send a new code to continue.');
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    throw new HttpError(429, 'OTP_LOCKED', 'Too many incorrect codes. Send a new code to continue.');
  }
  // Checked before comparing, so a correct guess after the daily limit is still refused.
  await assertUnderLimit(db, failureKey(row.purpose, row.email), OTP_DAILY_FAILURES, 86_400, now(), DAILY_LIMIT);
  // Count the attempt before comparing so parallel guesses can't exceed the limit.
  const [{ attempts } = { attempts: OTP_MAX_ATTEMPTS + 1 }] = await db.query<{ attempts: number }>(
    SYSTEM,
    `UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1 AND consumed_at IS NULL RETURNING attempts`,
    [id],
  );
  if (attempts > OTP_MAX_ATTEMPTS) throw new HttpError(429, 'OTP_LOCKED', 'Too many incorrect codes. Send a new code to continue.');

  if (!row.user_id || !safeEqual(await codeHash(env.JWT_SECRET, id, code), row.code_hash)) {
    await rateLimit(db, failureKey(row.purpose, row.email), OTP_DAILY_FAILURES, 86_400, now(), DAILY_LIMIT);
    const left = OTP_MAX_ATTEMPTS - attempts;
    const err = INVALID();
    err.extra = { attemptsLeft: left };
    if (left > 0) err.message = `That code isn't right. ${left} ${left === 1 ? 'try' : 'tries'} left.`;
    throw err;
  }
  const [closed] = await db.query(SYSTEM, `UPDATE otp_challenges SET consumed_at = now() WHERE id = $1 AND consumed_at IS NULL RETURNING id`, [id]);
  if (!closed) throw new HttpError(400, 'OTP_USED', 'This code was already used. Request a new one.');
  return { userId: row.user_id };
}

/** Emails a fresh code for an open challenge, honouring the cooldown and send cap. Decoys go through the same steps without an email. */
export async function resendChallenge(env: Bindings, { db, mailer, now }: Services, id: string): Promise<ChallengeResponse> {
  const row = await loadChallenge(db, id);
  if (!row || row.consumed_at) throw new HttpError(400, 'OTP_USED', 'This code was already used or replaced. Start again.');
  const wait = Math.ceil((new Date(row.last_sent_at).getTime() + OTP_RESEND_SECONDS * 1000 - now().getTime()) / 1000);
  if (wait > 0) throw new HttpError(429, 'OTP_COOLDOWN', `You can request another code in ${wait} seconds.`, { retryAfter: wait });
  if (row.send_count >= OTP_MAX_SENDS) {
    throw new HttpError(429, 'OTP_SEND_LIMIT', 'We already sent several codes. Start again from the sign-in screen.');
  }
  const code = otpCode();
  const expiresAt = new Date(now().getTime() + OTP_TTL_MINUTES * 60_000);
  await db.query(
    SYSTEM,
    `UPDATE otp_challenges SET code_hash = $2, attempts = 0, send_count = send_count + 1, last_sent_at = $3, expires_at = $4 WHERE id = $1`,
    [id, await codeHash(env.JWT_SECRET, id, code), now().toISOString(), expiresAt.toISOString()],
  );
  if (row.user_id) await mailer.send({ to: row.email, ...otpEmail(row.purpose, code, OTP_TTL_MINUTES) });
  return response(id, row.purpose, row.email);
}
