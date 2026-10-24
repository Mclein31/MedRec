import pg from 'pg';
import { migrate } from '../scripts/migrate.mjs';

export const TEST_DB = 'medrec_v2_test';
export const TEST_ROLE = 'medrec_test';
export const TEST_PASSWORD = 'medrec-test-role-password';
const admin = process.env.TEST_ADMIN_URL ?? 'postgresql://localhost/postgres';

/**
 * Fresh database per run. Tests log in as medrec_test, a member of the
 * unprivileged medrec_app role, so RLS is enforced without touching the
 * (cluster-wide) medrec_app password that local development uses.
 */
export default async function setup() {
  const client = new pg.Client({ connectionString: admin });
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
  await client.query(`CREATE DATABASE ${TEST_DB}`);
  await client.end();
  const url = new URL(admin);
  url.pathname = `/${TEST_DB}`;
  await migrate(url.toString(), { log: () => undefined });
  const db = new pg.Client({ connectionString: url.toString() });
  await db.connect();
  await db.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${TEST_ROLE}') THEN
      CREATE ROLE ${TEST_ROLE} LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD '${TEST_PASSWORD}';
    END IF; END $$`);
  await db.query(`GRANT medrec_app TO ${TEST_ROLE}`);
  await db.end();
}
