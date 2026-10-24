// Applies migrations to Neon using the owner login from apps/.env, and sets the
// medrec_app password. The owner login is used here only, never uploaded.
// Run: npm run migrate:prod
import { migrate } from './migrate.mjs';
import { loadProdEnv } from './prodEnv.mjs';

const env = loadProdEnv(['MIGRATION_DATABASE_URL', 'APP_DB_PASSWORD']);
await migrate(env.MIGRATION_DATABASE_URL, { appPassword: env.APP_DB_PASSWORD });
