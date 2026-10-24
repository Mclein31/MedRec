// Reads and checks the universal production file (apps/.env), which scripts load
// with `node --env-file=../.env`. Each value goes only where it belongs:
//   WORKER_SECRETS → Cloudflare secrets   WORKER_VARS → deploy-time variables
//   MIGRATION_*    → local migration only (never uploaded)

export const WORKER_SECRETS = ['DATABASE_URL', 'JWT_SECRET', 'FILE_SIGNING_SECRET', 'GEMINI_API_KEY', 'SMTP_USER', 'SMTP_PASSWORD'];
export const WORKER_VARS = ['PUBLIC_URL'];
/** Only needed when a web build of the app calls the API; native apps don't send an Origin. */
export const OPTIONAL_VARS = ['ALLOWED_ORIGINS'];

export function loadProdEnv(keys) {
  const env = Object.fromEntries(keys.map((k) => [k, (process.env[k] ?? '').trim()]));
  const problems = keys.filter((k) => !env[k]).map((k) => `${k} is empty`);

  for (const k of ['JWT_SECRET', 'FILE_SIGNING_SECRET']) {
    if (env[k] && env[k].length < 32) problems.push(`${k} must be at least 32 characters (openssl rand -hex 32)`);
  }
  if (env.JWT_SECRET && env.JWT_SECRET === env.FILE_SIGNING_SECRET) problems.push('JWT_SECRET and FILE_SIGNING_SECRET must differ');
  if (env.PUBLIC_URL && !/^https:\/\/[^/]+$/.test(env.PUBLIC_URL)) problems.push('PUBLIC_URL must be https://host with no path or trailing slash');
  if (env.DATABASE_URL) {
    try {
      const u = new URL(env.DATABASE_URL);
      if (u.username !== 'medrec_app') problems.push('DATABASE_URL must connect as medrec_app (not the Neon owner)');
      const pw = process.env.APP_DB_PASSWORD?.trim();
      if (pw && decodeURIComponent(u.password) !== pw) problems.push('DATABASE_URL password does not match APP_DB_PASSWORD');
    } catch {
      problems.push('DATABASE_URL is not a valid connection string');
    }
  }
  if (env.SMTP_PASSWORD && env.SMTP_PASSWORD.replace(/\s/g, '').length !== 16) {
    problems.push('SMTP_PASSWORD should be the 16-letter Gmail App Password, not your Google password');
  }

  if (problems.length) {
    console.error(`apps/.env is not ready:\n  - ${problems.join('\n  - ')}`);
    process.exit(1);
  }
  return env;
}
