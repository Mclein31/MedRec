-- Decoy one-time-code challenges (security fix, 2026-11-16).
-- Password reset and registration for an address that has no account (or already has one)
-- create a real challenge row with no user and no email sent, so every later step —
-- resend cooldown, send cap, attempt counting, expiry — answers exactly as it would for a
-- real challenge and cannot be used to discover which addresses have accounts.
-- Idempotent: safe to run repeatedly.

ALTER TABLE otp_challenges ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE otp_challenges ADD COLUMN IF NOT EXISTS decoy_email text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'otp_challenges_owner_check') THEN
    ALTER TABLE otp_challenges ADD CONSTRAINT otp_challenges_owner_check
      CHECK ((user_id IS NULL) <> (decoy_email IS NULL));
  END IF;
END $$;
