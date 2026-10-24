import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createMailer } from './lib/email';
import { neonDb } from './lib/db';
import { isLocalDatabase, localDb } from './lib/localDb';
import { HttpError, SYSTEM, type AppEnv, type Bindings, type Services } from './lib/types';
import { auth } from './routes/auth';
import { profile } from './routes/profile';
import { pub } from './routes/public';
import { records } from './routes/records';
import { shares } from './routes/shares';
import { vault } from './routes/vault';

export type ServiceFactory = (env: Bindings) => Services;

export const defaultServices: ServiceFactory = (env) => {
  const now = () => new Date();
  const db = env.ENVIRONMENT === 'development' && isLocalDatabase(env.DATABASE_URL) ? localDb(env.DATABASE_URL) : neonDb(env.DATABASE_URL);
  return { db, mailer: createMailer(env, now), fetch: (...a) => fetch(...a), now };
};

export function createApp(makeServices: ServiceFactory = defaultServices) {
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    for (const name of ['DATABASE_URL', 'JWT_SECRET', 'FILE_SIGNING_SECRET'] as const) {
      if (!c.env[name] || (name !== 'DATABASE_URL' && c.env[name].length < 32)) {
        console.error(`[config] ${name} is missing or too short`);
        throw new HttpError(503, 'MISCONFIGURED', 'MedRec is not configured correctly. Please try again later.');
      }
    }
    if (c.env.ENVIRONMENT === 'production' && !/^https:\/\//.test(c.env.PUBLIC_URL ?? '')) {
      console.error('[config] PUBLIC_URL must be an https URL in production (deploy with npm run deploy:prod)');
      throw new HttpError(503, 'MISCONFIGURED', 'MedRec is not configured correctly. Please try again later.');
    }
    c.set('services', makeServices(c.env));
    await next();
  });

  app.use(
    '/api/*',
    cors({
      origin: (origin, c) => (c.env.ALLOWED_ORIGINS.split(',').map((o: string) => o.trim()).includes(origin) ? origin : null),
      allowHeaders: ['authorization', 'content-type'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      maxAge: 600,
    }),
  );
  app.use('/api/*', async (c, next) => {
    await next();
    c.header('cache-control', 'no-store');
    c.header('x-content-type-options', 'nosniff');
  });

  app.get('/health', (c) => c.json({ ok: true }));
  app.get('/api/ready', async (c) => {
    await c.get('services').db.query(SYSTEM, 'SELECT 1');
    return c.json({ ok: true, database: 'ready' });
  });

  app.route('/api/auth', auth);
  app.route('/api/profile', profile);
  app.route('/api/records', records);
  app.route('/api/shares', shares);
  app.route('/api', vault);
  app.route('/', pub);

  app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }, 404));
  app.onError((err, c) => {
    if (err instanceof HttpError) {
      if (err.status === 429 && typeof err.extra?.retryAfter === 'number') c.header('retry-after', String(err.extra.retryAfter));
      return c.json({ error: { code: err.code, message: err.message, ...err.extra } }, err.status as 400);
    }
    const pgCode = (err as { code?: string }).code;
    if (pgCode && /^(08|53|57)/.test(pgCode)) {
      return c.json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'MedRec is briefly unavailable. Try again in a moment.' } }, 503);
    }
    console.error(`[error] ${c.req.method} ${new URL(c.req.url).pathname}: ${(err as Error).stack ?? err}`);
    return c.json({ error: { code: 'INTERNAL', message: 'Something went wrong on our side. Try again in a moment.' } }, 500);
  });

  return app;
}

/** Hourly housekeeping: abandoned draft pages, expired codes, sessions and rate-limit windows. */
export async function cleanup(env: Bindings, services: Services) {
  const { db } = services;
  const drafts = await db.query<{ object_key: string }>(
    SYSTEM,
    `DELETE FROM record_files WHERE record_id IS NULL AND created_at < now() - interval '24 hours' RETURNING object_key`,
  );
  if (drafts.length) await env.VAULT.delete(drafts.map((d) => d.object_key));
  await db.query(SYSTEM, `DELETE FROM otp_challenges WHERE expires_at < now() - interval '1 day'`);
  await db.query(SYSTEM, `DELETE FROM sessions WHERE expires_at < now() OR revoked_at < now() - interval '7 days'`);
  await db.query(SYSTEM, `DELETE FROM trusted_devices WHERE expires_at < now()`);
  await db.query(SYSTEM, `DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`);
  return { draftsRemoved: drafts.length };
}
