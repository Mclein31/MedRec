-- Link each session to the trusted device it was opened with (security fix, 2026-11-16, DD-58).
-- Signing a session out (remotely or by logging out) forgets that device, so a phone the owner
-- signed out can't skip the emailed code with only the password. Refresh carries the link forward.
-- Sessions opened before this migration have no link; "Forget trusted devices" still clears them.
-- Idempotent: safe to run repeatedly.

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS trusted_device_id uuid REFERENCES trusted_devices(id) ON DELETE SET NULL;
