import { neon } from '@neondatabase/serverless';
import type { Db, DbContext } from './types';

export function contextParams(ctx: DbContext): [string, string] {
  return 'system' in ctx ? ['', 'system'] : [ctx.userId, 'user'];
}

export const SET_CONTEXT = `SELECT set_config('app.user_id', $1, true), set_config('app.role', $2, true)`;

/**
 * Neon's HTTP driver. Each call is a single non-interactive transaction: the
 * first statement sets the RLS context (transaction-local), the second does the work.
 */
export function neonDb(url: string): Db {
  const sql = neon(url);
  return {
    async query<T>(ctx: DbContext, text: string, params: unknown[] = []) {
      const results = await sql.transaction([sql.query(SET_CONTEXT, contextParams(ctx)), sql.query(text, params)]);
      return results[1] as T[];
    },
  };
}

export async function one<T>(db: Db, ctx: DbContext, text: string, params?: unknown[]): Promise<T | undefined> {
  const rows = await db.query<T>(ctx, text, params);
  return rows[0];
}
