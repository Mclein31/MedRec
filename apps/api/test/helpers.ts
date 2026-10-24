import pg from 'pg';
import { createApp } from '../src/app';
import { SET_CONTEXT, contextParams } from '../src/lib/db';
import type { Bindings, Bucket, Db } from '../src/lib/types';
import { TEST_DB, TEST_PASSWORD, TEST_ROLE } from './globalSetup';

const admin = new URL(process.env.TEST_ADMIN_URL ?? 'postgresql://localhost/postgres');
export const pool = new pg.Pool({
  host: admin.hostname || 'localhost',
  port: Number(admin.port || 5432),
  database: TEST_DB,
  user: TEST_ROLE,
  password: TEST_PASSWORD,
  max: 4,
});

/** Same contract as neonDb: one transaction per statement with the RLS context set first. */
export const db: Db = {
  async query<T>(ctx: Parameters<Db['query']>[0], text: string, params: unknown[] = []) {
    const client = await pool.connect();
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
      client.release();
    }
  },
};

export class MemoryBucket implements Bucket {
  objects = new Map<string, { data: Uint8Array<ArrayBuffer>; contentType?: string }>();
  async put(key: string, value: ArrayBuffer | ReadableStream | Uint8Array, options?: { httpMetadata?: { contentType?: string } }) {
    const data = new Uint8Array(value instanceof Uint8Array ? value : (value as ArrayBuffer));
    this.objects.set(key, { data, contentType: options?.httpMetadata?.contentType });
  }
  async get(key: string) {
    const o = this.objects.get(key);
    if (!o) return null;
    return {
      body: new Blob([o.data]).stream(),
      httpMetadata: { contentType: o.contentType },
      size: o.data.byteLength,
      arrayBuffer: async () => o.data.slice().buffer as ArrayBuffer,
    };
  }
  async delete(keys: string | string[]) {
    for (const k of Array.isArray(keys) ? keys : [keys]) this.objects.delete(k);
  }
}

export const mail: { to: string; subject: string; text: string }[] = [];
export const clock = { offsetMs: 0 };
export let fetchMock: typeof fetch = async () => new Response('not mocked', { status: 500 });
export const setFetch = (f: typeof fetch) => (fetchMock = f);

export const bucket = new MemoryBucket();
export const env: Bindings = {
  APP_NAME: 'MedRec',
  PUBLIC_URL: 'http://api.test',
  ALLOWED_ORIGINS: 'http://localhost:8081',
  DATABASE_URL: 'postgres://unused',
  JWT_SECRET: 'test-jwt-secret-0123456789abcdef0123456789',
  FILE_SIGNING_SECRET: 'test-file-secret-0123456789abcdef0123456789',
  GEMINI_API_KEY: 'test-gemini-key',
  GEMINI_MODEL: 'gemini-3.5-flash-lite',
  GEMINI_FALLBACK_MODEL: 'gemini-3.1-flash-lite',
  ENVIRONMENT: 'test',
  VAULT: bucket,
};

export const app = createApp(() => ({
  db,
  mailer: { send: async (m) => void mail.push(m) },
  fetch: (...a) => fetchMock(...a),
  now: () => new Date(Date.now() + clock.offsetMs),
}));

export async function call(method: string, path: string, opts: { json?: unknown; token?: string; body?: BodyInit; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { ...opts.headers, 'cf-connecting-ip': opts.headers?.['cf-connecting-ip'] ?? `10.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.json !== undefined) headers['content-type'] = 'application/json';
  const res = await app.request(path, { method, headers, body: opts.json !== undefined ? JSON.stringify(opts.json) : opts.body }, env);
  const text = await res.text();
  let data: any = text;
  try {
    data = JSON.parse(text);
  } catch {
    // HTML or binary
  }
  return { status: res.status, data, headers: res.headers };
}

export function lastCode(to: string) {
  const m = [...mail].reverse().find((x) => x.to === to);
  const code = m?.text.match(/(\d{3}) (\d{3})/);
  if (!code) throw new Error(`no code mailed to ${to}`);
  return code[1]! + code[2]!;
}

let n = 0;
export const uniqueEmail = (tag = 'user') => `${tag}.${Date.now()}.${n++}@example.com`;
export const PASSWORD = 'correct horse battery';

/** Registers and verifies an account, returning its first session. */
export async function signUp(name = 'Ada Patient', email = uniqueEmail()) {
  const reg = await call('POST', '/api/auth/register', { json: { name, email, password: PASSWORD } });
  if (reg.status !== 201) throw new Error(`register failed: ${JSON.stringify(reg.data)}`);
  const v = await call('POST', '/api/auth/verify', {
    json: { challengeId: reg.data.challenge.challengeId, code: lastCode(email), purpose: 'verify_email', deviceLabel: 'Test phone' },
  });
  if (v.status !== 200) throw new Error(`verify failed: ${JSON.stringify(v.data)}`);
  return { email, token: v.data.session.accessToken as string, refresh: v.data.session.refreshToken as string, userId: v.data.user.id as string };
}

export const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);
