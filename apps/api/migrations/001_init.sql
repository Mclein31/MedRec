-- MedRec v2 schema (Neon Postgres). Idempotent: safe to run repeatedly.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text NOT NULL,
  name              text NOT NULL,
  password_hash     text NOT NULL,
  email_verified_at timestamptz,
  token_version     integer NOT NULL DEFAULT 1,
  failed_logins     integer NOT NULL DEFAULT 0,
  locked_until      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));

-- One-time codes emailed for sign-in, email verification and password reset.
CREATE TABLE IF NOT EXISTS otp_challenges (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose      text NOT NULL CHECK (purpose IN ('login', 'verify_email', 'reset_password')),
  code_hash    text NOT NULL,
  attempts     integer NOT NULL DEFAULT 0,
  send_count   integer NOT NULL DEFAULT 1,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  consumed_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS otp_user_idx ON otp_challenges (user_id, purpose, created_at DESC);

-- Rotating refresh-token sessions, one per signed-in device.
CREATE TABLE IF NOT EXISTS sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_hash text NOT NULL UNIQUE,
  device_label text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id) WHERE revoked_at IS NULL;

-- "Trust this device for 30 days" skips the emailed code on that device only.
CREATE TABLE IF NOT EXISTS trusted_devices (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  label      text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id                 uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth           date,
  sex                     text CHECK (sex IN ('female', 'male', 'intersex', 'unspecified')),
  blood_type              text CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown')),
  height_cm               numeric(5,1),
  weight_kg               numeric(5,1),
  allergies               text[] NOT NULL DEFAULT '{}',
  conditions              text[] NOT NULL DEFAULT '{}',
  medications             text[] NOT NULL DEFAULT '{}',
  organ_donor             boolean,
  phone                   text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  emergency_contact_relation text,
  avatar_key              text,
  emergency_enabled       boolean NOT NULL DEFAULT false,
  emergency_slug          text UNIQUE,
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS records (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  category    text NOT NULL CHECK (category IN
                ('consultation','lab','prescription','imaging','vaccination','hospitalization','dental_vision','other')),
  event_date  date,
  provider    text,
  facility    text,
  notes       text,
  ai          jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  search      tsvector GENERATED ALWAYS AS (
                to_tsvector('simple',
                  coalesce(title,'') || ' ' || coalesce(provider,'') || ' ' ||
                  coalesce(facility,'') || ' ' || coalesce(notes,''))) STORED
);
CREATE INDEX IF NOT EXISTS records_user_date_idx ON records (user_id, event_date DESC NULLS LAST, created_at DESC);
CREATE INDEX IF NOT EXISTS records_search_idx ON records USING gin (search);

-- Pages/files attached to a record, stored privately in R2 under {user_id}/...
CREATE TABLE IF NOT EXISTS record_files (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id    uuid REFERENCES records(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  object_key   text NOT NULL UNIQUE,
  content_type text NOT NULL,
  size_bytes   integer NOT NULL,
  position     integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS record_files_record_idx ON record_files (record_id, position);

-- Time-limited doctor access. The token itself is never stored: it is an
-- HMAC of the share id, so a database leak exposes no usable links.
CREATE TABLE IF NOT EXISTS shares (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label         text,
  scope         text NOT NULL CHECK (scope IN ('all','categories','records')),
  categories    text[] NOT NULL DEFAULT '{}',
  record_ids    uuid[] NOT NULL DEFAULT '{}',
  expires_at    timestamptz NOT NULL,
  revoked_at    timestamptz,
  first_view_at timestamptz,
  view_count    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shares_user_idx ON shares (user_id, created_at DESC);

-- Append-only activity ledger: audit trail and in-app notifications.
-- Holds metadata only, never clinical values.
CREATE TABLE IF NOT EXISTS activity (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       text NOT NULL,
  title      text NOT NULL,
  detail     text,
  meta       jsonb NOT NULL DEFAULT '{}',
  ip_hash    text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_user_idx ON activity (user_id, created_at DESC);

ALTER TABLE users ADD COLUMN IF NOT EXISTS activity_seen_at timestamptz NOT NULL DEFAULT now();

-- Fixed-window counters for rate limiting.
CREATE TABLE IF NOT EXISTS rate_limits (
  key          text NOT NULL,
  window_start timestamptz NOT NULL,
  hits         integer NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);
