-- Row-level security. Default deny: a query that does not set app.user_id or
-- app.role='system' (see src/lib/db.ts) sees and changes nothing.
-- The Worker connects as medrec_app, which owns no tables and cannot bypass RLS.

CREATE OR REPLACE FUNCTION app_user_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.user_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app_is_system() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('app.role', true), '') = 'system'
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','records','record_files','shares','activity','sessions','trusted_devices','otp_challenges'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS owner_rows ON %I', t);
    EXECUTE format(
      'CREATE POLICY owner_rows ON %I USING (user_id = app_user_id() OR app_is_system()) WITH CHECK (user_id = app_user_id() OR app_is_system())',
      t);
  END LOOP;
END $$;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS self_row ON users;
CREATE POLICY self_row ON users
  USING (id = app_user_id() OR app_is_system())
  WITH CHECK (id = app_user_id() OR app_is_system());

-- Activity is append-only for the app role: the ledger can't be rewritten.
DROP POLICY IF EXISTS owner_rows ON activity;
DROP POLICY IF EXISTS activity_read ON activity;
DROP POLICY IF EXISTS activity_insert ON activity;
CREATE POLICY activity_read ON activity FOR SELECT USING (user_id = app_user_id() OR app_is_system());
CREATE POLICY activity_insert ON activity FOR INSERT WITH CHECK (user_id = app_user_id() OR app_is_system());

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS system_only ON rate_limits;
CREATE POLICY system_only ON rate_limits USING (app_is_system()) WITH CHECK (app_is_system());

-- Least-privilege runtime role. Its password is set by scripts/migrate.mjs.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'medrec_app') THEN
    CREATE ROLE medrec_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO medrec_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON users, profiles, records, record_files, shares, sessions, trusted_devices, otp_challenges, rate_limits TO medrec_app;
GRANT SELECT, INSERT ON activity TO medrec_app;
GRANT USAGE ON SEQUENCE activity_id_seq TO medrec_app;
GRANT EXECUTE ON FUNCTION app_user_id(), app_is_system() TO medrec_app;
