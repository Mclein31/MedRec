-- ============================================================================
-- MedRec Schema — PostgreSQL (Standard PostgreSQL & Production Cloud)
-- ============================================================================

-- 1. Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Core Users Table (Backend-Owned Authentication)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  token_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Ensure columns exist and legacy constraints do not conflict
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name VARCHAR(120);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON public.users(google_id) WHERE google_id IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password') THEN
    ALTER TABLE public.users ALTER COLUMN password DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN
    ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;
  END IF;
END $$;

-- 3. Public User Profiles (1:1 Demographic, Clinical Baseline & Emergency Medical ID)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name VARCHAR(120),
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

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS full_name VARCHAR(120);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS biological_sex VARCHAR(20);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS height VARCHAR(20);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS weight VARCHAR(20);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS blood_type VARCHAR(10);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS medical_conditions TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS medications_summary TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(120);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(60);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(30);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS organ_donor BOOLEAN DEFAULT FALSE;

-- 4. Public Medical Records (Longitudinal Clinical Timeline)
CREATE TABLE IF NOT EXISTS public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_medical_records_user_id ON public.medical_records(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_user_date ON public.medical_records(user_id, date DESC);

ALTER TABLE public.medical_records ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Idempotently add the type CHECK constraint for pre-existing tables that may have been created
-- without it (e.g. during early development before this constraint was defined inline).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'medical_records_type_check'
      AND table_name = 'medical_records'
      AND constraint_schema = 'public'
  ) THEN
    ALTER TABLE public.medical_records
      ADD CONSTRAINT medical_records_type_check CHECK (type IN (
        'consultation', 'diagnosis', 'lab', 'prescription', 'medication', 'appointment', 'other'
      ));
  END IF;
END $$;

-- 5. Public Shared Access (Doctor Consultation QR Tokens & Scoping)
CREATE TABLE IF NOT EXISTS public.shared_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token VARCHAR(128) UNIQUE NOT NULL,
  allowed_types VARCHAR(40)[] DEFAULT NULL,
  record_ids UUID[] DEFAULT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_access_token ON public.shared_access(token);
CREATE INDEX IF NOT EXISTS idx_shared_access_user_id ON public.shared_access(user_id);

ALTER TABLE public.shared_access ADD COLUMN IF NOT EXISTS allowed_types VARCHAR(40)[] DEFAULT NULL;
ALTER TABLE public.shared_access ADD COLUMN IF NOT EXISTS record_ids UUID[] DEFAULT NULL;

-- 6. Public Notifications (In-App Audit & Activity Ledger)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = FALSE;

-- 7. Ensure Foreign Keys point to public.users (Idempotent constraint update)
DO $$
BEGIN
  -- user_profiles FK
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_profiles_user_id_fkey' AND table_name = 'user_profiles') THEN
    ALTER TABLE public.user_profiles DROP CONSTRAINT user_profiles_user_id_fkey;
  END IF;
  ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

  -- medical_records FK
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'medical_records_user_id_fkey' AND table_name = 'medical_records') THEN
    ALTER TABLE public.medical_records DROP CONSTRAINT medical_records_user_id_fkey;
  END IF;
  ALTER TABLE public.medical_records ADD CONSTRAINT medical_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

  -- shared_access FK
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'shared_access_user_id_fkey' AND table_name = 'shared_access') THEN
    ALTER TABLE public.shared_access DROP CONSTRAINT shared_access_user_id_fkey;
  END IF;
  ALTER TABLE public.shared_access ADD CONSTRAINT shared_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

  -- notifications FK
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'notifications_user_id_fkey' AND table_name = 'notifications') THEN
    ALTER TABLE public.notifications DROP CONSTRAINT notifications_user_id_fkey;
  END IF;
  ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
END $$;

-- 8. Automatic Profile Provisioning Trigger on User Creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    user_id,
    full_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.name,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.user_profiles.full_name),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_created ON public.users;
CREATE TRIGGER on_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();