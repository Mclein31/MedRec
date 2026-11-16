-- Medication reminders & dose adherence logs (DD-59).
-- person_id NULL means the account holder (DD-55); deleting a person cascades their medications.
-- Deleting a source record keeps the medication row with source_record_id = NULL.
-- Idempotent: safe to run repeatedly.

CREATE TABLE IF NOT EXISTS medications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  person_id           uuid REFERENCES people(id) ON DELETE CASCADE,
  source_record_id    uuid REFERENCES records(id) ON DELETE SET NULL,
  name                text NOT NULL,
  strength            text,
  dose                text,
  instructions        text,
  prescriber          text,
  prescribed_date     date,
  schedule_kind       text NOT NULL CHECK (schedule_kind IN ('daily_times', 'interval_hours', 'as_needed')),
  times               text[] NOT NULL DEFAULT '{}',
  interval_hours      integer CHECK (interval_hours IS NULL OR (interval_hours >= 1 AND interval_hours <= 24)),
  meal_timing         text CHECK (meal_timing IS NULL OR meal_timing IN ('before_meal', 'with_meal', 'after_meal', 'anytime')),
  start_date          date NOT NULL,
  end_date            date,
  duration_days       integer CHECK (duration_days IS NULL OR (duration_days >= 1 AND duration_days <= 365)),
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stopped', 'completed')),
  reminders_enabled   boolean NOT NULL DEFAULT true,
  confirmed_at        timestamptz NOT NULL DEFAULT now(),
  stopped_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT medications_end_after_start CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS medications_user_person_idx ON medications (user_id, person_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS medications_record_idx ON medications (source_record_id) WHERE source_record_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS medication_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  medication_id   uuid NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  scheduled_date  date NOT NULL,
  scheduled_time  text NOT NULL,
  outcome         text NOT NULL CHECK (outcome IN ('taken', 'skipped')),
  acted_at        timestamptz NOT NULL DEFAULT now(),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (medication_id, scheduled_date, scheduled_time)
);
CREATE INDEX IF NOT EXISTS medication_logs_user_date_idx ON medication_logs (user_id, scheduled_date DESC);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS owner_rows ON medications;
CREATE POLICY owner_rows ON medications
  USING (user_id = app_user_id() OR app_is_system())
  WITH CHECK (user_id = app_user_id() OR app_is_system());

ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS owner_rows ON medication_logs;
CREATE POLICY owner_rows ON medication_logs
  USING (user_id = app_user_id() OR app_is_system())
  WITH CHECK (user_id = app_user_id() OR app_is_system());

GRANT SELECT, INSERT, UPDATE, DELETE ON medications, medication_logs TO medrec_app;
