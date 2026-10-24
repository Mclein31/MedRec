// Applies migrations/*.sql in order using the owner connection, then sets the
// runtime role's password. Usage:
//   MIGRATION_DATABASE_URL=postgres://owner@.../medrec APP_DB_PASSWORD=... npm run migrate
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

export async function migrate(url, { appPassword, log = console.log } = {}) {
  const dir = fileURLToPath(new URL('../migrations/', import.meta.url));
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    for (const file of (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()) {
      await client.query(await readFile(dir + file, 'utf8'));
      log(`applied ${file}`);
    }
    if (appPassword) {
      await client.query(`ALTER ROLE medrec_app PASSWORD ${client.escapeLiteral(appPassword)}`);
      log('set medrec_app password');
    }
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url) {
    console.error('Set MIGRATION_DATABASE_URL to the Neon owner connection string.');
    process.exit(1);
  }
  await migrate(url, { appPassword: process.env.APP_DB_PASSWORD });
}
