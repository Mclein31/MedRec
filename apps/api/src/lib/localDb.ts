import pg from 'pg';
import { SET_CONTEXT, contextParams } from './db';
import type { Db } from './types';

/**
 * Development only: plain Postgres over TCP so `wrangler dev` can run against a
 * local database. Workers can't share sockets between requests, so each
 * statement opens and closes its own connection.
 */
export function localDb(url: string): Db {
  return {
    async query<T>(ctx: Parameters<Db['query']>[0], text: string, params: unknown[] = []) {
      const client = new pg.Client({ connectionString: url });
      await client.connect();
      try {
        await client.query('BEGIN');
        await client.query(SET_CONTEXT, contextParams(ctx));
        const res = await client.query(text, params);
        await client.query('COMMIT');
        return res.rows as T[];
      } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
      } finally {
        await client.end().catch(() => undefined);
      }
    },
  };
}

export const isLocalDatabase = (url: string) => /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);
