-- Caregiver profiles (DD-55): family members whose records the account holder keeps.
-- A record or share with person_id NULL belongs to the account holder, so existing data is unchanged.
-- Idempotent: safe to run repeatedly.

CREATE TABLE IF NOT EXISTS people (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                       text NOT NULL,
  relation                   text,
  date_of_birth              date,
  sex                        text CHECK (sex IN ('female', 'male', 'intersex', 'unspecified')),
  blood_type                 text CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown')),
  allergies                  text[] NOT NULL DEFAULT '{}',
  conditions                 text[] NOT NULL DEFAULT '{}',
  medications                text[] NOT NULL DEFAULT '{}',
  organ_donor                boolean,
  emergency_contact_name     text,
  emergency_contact_phone    text,
  emergency_contact_relation text,
  emergency_enabled          boolean NOT NULL DEFAULT false,
  emergency_slug             text UNIQUE,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS people_user_idx ON people (user_id, created_at);

ALTER TABLE records ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES people(id) ON DELETE CASCADE;
ALTER TABLE shares  ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES people(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS records_person_date_idx ON records (user_id, person_id, event_date DESC NULLS LAST, created_at DESC);

ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE people FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS owner_rows ON people;
CREATE POLICY owner_rows ON people
  USING (user_id = app_user_id() OR app_is_system())
  WITH CHECK (user_id = app_user_id() OR app_is_system());

GRANT SELECT, INSERT, UPDATE, DELETE ON people TO medrec_app;
