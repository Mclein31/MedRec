import { otpCode, safeEqual, sha256 } from './crypto';
import { maskEmail, otpEmail } from './email';
import { HttpError, SYSTEM, type Bindings, type Services } from './types';

export type OtpPurpose = 'login' | 'verify_email' | 'reset_password';

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_SECONDS = 60;
export const OTP_MAX_SENDS = 5;

const codeHash = (secret: string, challengeId: string, code: string) => sha256(`${secret}:otp:${challengeId}:${code}`);

export interface ChallengeResponse {
  challengeId: string;
  purpose: OtpPurpose;
  maskedEmail: string;
  expiresIn: number;
  resendIn: number;
}

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
  return { challengeId: id, purpose, maskedEmail: maskEmail(user.email), expiresIn: OTP_TTL_MINUTES * 60, resendIn: OTP_RESEND_SECONDS };
}

/**
 * A look-alike response for unknown emails on password reset, so the endpoint
 * doesn't reveal which addresses have accounts.
 */
export function decoyChallenge(email: string, purpose: OtpPurpose): ChallengeResponse {
  return { challengeId: crypto.randomUUID(), purpose, maskedEmail: maskEmail(email), expiresIn: OTP_TTL_MINUTES * 60, resendIn: OTP_RESEND_SECONDS };
}

interface ChallengeRow {
  id: string;
  user_id: string;
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
    `SELECT c.*, u.email FROM otp_challenges c JOIN users u ON u.id = c.user_id WHERE c.id = $1`,
    [id],
  );
  return row;
}

const INVALID = () => new HttpError(400, 'OTP_INVALID', "That code isn't right. Check the latest email from MedRec and try again.");

/** Verifies a code. Wrong codes count toward the attempt limit; the challenge closes on success. */
export async function verifyChallenge(env: Bindings, { db, now }: Services, id: string, code: string, purpose: OtpPurpose) {
  const row = await loadChallenge(db, id);
  if (!row || row.purpose !== purpose) throw INVALID();
  if (row.consumed_at) throw new HttpError(400, 'OTP_USED', 'This code was already used or replaced. Request a new one.');
  if (new Date(row.expires_at) <= now()) throw new HttpError(400, 'OTP_EXPIRED', 'This code has expired. Send a new code to continue.');
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    throw new HttpError(429, 'OTP_LOCKED', 'Too many incorrect codes. Send a new code to continue.');
  }
  // Count the attempt before comparing so parallel guesses can't exceed the limit.
  const [{ attempts } = { attempts: OTP_MAX_ATTEMPTS + 1 }] = await db.query<{ attempts: number }>(
    SYSTEM,
    `UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1 AND consumed_at IS NULL RETURNING attempts`,
    [id],
  );
  if (attempts > OTP_MAX_ATTEMPTS) throw new HttpError(429, 'OTP_LOCKED', 'Too many incorrect codes. Send a new code to continue.');

  if (!safeEqual(await codeHash(env.JWT_SECRET, id, code), row.code_hash)) {
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

/** Emails a fresh code for an open challenge, honouring the cooldown and send cap. */
export async function resendChallenge(env: Bindings, { db, mailer, now }: Services, id: string): Promise<ChallengeResponse> {
  const row = await loadChallenge(db, id);
  // Unknown ids (including decoys) get the same shaped answer without sending anything.
  if (!row || row.consumed_at) {
    return { challengeId: id, purpose: row?.purpose ?? 'reset_password', maskedEmail: row ? maskEmail(row.email) : '', expiresIn: OTP_TTL_MINUTES * 60, resendIn: OTP_RESEND_SECONDS };
  }
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
  await mailer.send({ to: row.email, ...otpEmail(row.purpose, code, OTP_TTL_MINUTES) });
  return { challengeId: id, purpose: row.purpose, maskedEmail: maskEmail(row.email), expiresIn: OTP_TTL_MINUTES * 60, resendIn: OTP_RESEND_SECONDS };
}
