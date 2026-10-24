import { createMiddleware } from 'hono/factory';
import { verifyJwt } from './crypto';
import { HttpError, asUser, type AppEnv } from './types';

interface AccessClaims extends Record<string, unknown> {
  sub: string;
  tv: number;
  sid: string;
}

const expired = () => new HttpError(401, 'SESSION_EXPIRED', 'Your session ended. Please sign in again.');

/**
 * Accepts a Bearer access token only while its session is open and the
 * account's token version matches, so sign-out and password changes take
 * effect immediately rather than when the token expires.
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw expired();
  const { db, now } = c.get('services');
  const claims = await verifyJwt<AccessClaims>(token, c.env.JWT_SECRET, now());
  if (!claims || typeof claims.sub !== 'string' || !Number.isInteger(claims.tv) || typeof claims.sid !== 'string') throw expired();

  const [row] = await db.query<{ token_version: number; open: boolean }>(
    asUser(claims.sub),
    `SELECT u.token_version, (s.revoked_at IS NULL AND s.expires_at > now()) AS open
       FROM users u JOIN sessions s ON s.user_id = u.id
      WHERE u.id = $1 AND s.id = $2`,
    [claims.sub, claims.sid],
  );
  if (!row || !row.open || row.token_version !== claims.tv) throw expired();

  c.set('userId', claims.sub);
  c.set('sessionId', claims.sid);
  await next();
});
