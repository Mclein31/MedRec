/**
 * Idempotent migration runner.
 * Usage:
 *   - CLI: npm run migrate
 *   - Programmatic: const { runMigrations } = require('./runMigration'); await runMigrations();
 * Reads schema.sql and executes it against the connected PostgreSQL database.
 */
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runMigrations(customPool = pool) {
  const sqlPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('[Migration] Applying database schema migrations...');
  await customPool.query(sql);
  console.log('[Migration] Database schema migrations applied successfully.');
}

if (require.main === module) {
  (async () => {
    try {
      await runMigrations();
      process.exit(0);
    } catch (err) {
      console.error('[Migration] Migration failed:', err);
      process.exit(1);
    }
  })();
}

module.exports = { runMigrations };
