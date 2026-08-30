-- Enables gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL, -- bcrypt hash
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL CHECK (type IN (
    'consultation', 'diagnosis', 'lab', 'prescription', 'medication', 'appointment', 'other'
  )),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medical_records_user_id ON medical_records(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_user_date ON medical_records(user_id, date DESC);

-- Idempotent column additions for existing medical_records installations
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS attachment_url TEXT;

CREATE TABLE IF NOT EXISTS shared_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(128) UNIQUE NOT NULL,
  -- Optional: restrict which record types are visible to this share, NULL = all
  allowed_types VARCHAR(40)[] DEFAULT NULL,
  -- Optional: restrict to specific record IDs. Takes priority over allowed_types. NULL = use allowed_types or all.
  record_ids UUID[] DEFAULT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_access_token ON shared_access(token);
CREATE INDEX IF NOT EXISTS idx_shared_access_user_id ON shared_access(user_id);

-- Idempotent column additions for existing shared_access installations
ALTER TABLE shared_access ADD COLUMN IF NOT EXISTS allowed_types VARCHAR(40)[] DEFAULT NULL;
ALTER TABLE shared_access ADD COLUMN IF NOT EXISTS record_ids UUID[] DEFAULT NULL;

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  biological_sex VARCHAR(20) CHECK (biological_sex IN ('male', 'female', 'other', 'undisclosed')),
  height VARCHAR(20),
  weight VARCHAR(20),
  blood_type VARCHAR(10) CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown')),
  allergies TEXT,
  medical_conditions TEXT,
  medications_summary TEXT,
  emergency_contact_name VARCHAR(120),
  emergency_contact_relationship VARCHAR(60),
  emergency_contact_phone VARCHAR(30),
  phone VARCHAR(30),
  address TEXT,
  avatar_url TEXT,
  organ_donor BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Idempotent column additions for existing user_profiles installations
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS height VARCHAR(20);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS weight VARCHAR(20);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS organ_donor BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS revoked_tokens (
  jti UUID PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;