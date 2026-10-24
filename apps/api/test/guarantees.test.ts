import { afterAll, describe, expect, it, vi } from 'vitest';
import { createMailer } from '../src/lib/email';
import { asUser } from '../src/lib/types';
import { call, db, env, pool, signUp } from './helpers';

afterAll(() => pool.end());

describe('row-level security', () => {
  it('hides other accounts even if a query forgets its WHERE clause', async () => {
    const a = await signUp();
    const b = await signUp();
    await call('POST', '/api/records', { token: a.token, json: { title: 'A only', category: 'other', eventDate: null, provider: null, facility: null, notes: null, ai: null } });
    const asB = await db.query<{ title: string }>(asUser(b.userId), 'SELECT title FROM records');
    expect(asB).toHaveLength(0);
    const users = await db.query(asUser(b.userId), 'SELECT id FROM users');
    expect(users).toEqual([{ id: b.userId }]);
  });

  it('sees nothing without a context, and cannot rewrite the activity ledger', async () => {
    const a = await signUp();
    const client = await pool.connect();
    try {
      expect((await client.query('SELECT * FROM records')).rows).toHaveLength(0);
      expect((await client.query('SELECT * FROM users')).rows).toHaveLength(0);
    } finally {
      client.release();
    }
    await expect(db.query(asUser(a.userId), 'DELETE FROM activity WHERE user_id = $1', [a.userId])).rejects.toThrow(/permission denied/);
  });
});

describe('mailer', () => {
  const message = { to: 'p@example.com', subject: '123456 is your MedRec sign-in code', text: 'code 123 456', html: '<p>x</p>' };

  it('logs codes only in development', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await createMailer({ ...env, ENVIRONMENT: 'development' }, () => new Date()).send(message);
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
  });

  it('refuses to run without Gmail settings in production', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(createMailer({ ...env, ENVIRONMENT: 'production' }, () => new Date()).send(message)).rejects.toMatchObject({ status: 503, code: 'EMAIL_UNAVAILABLE' });
    err.mockRestore();
  });

  it('blocks header injection', async () => {
    const { buildMessage } = await import('../src/lib/smtp');
    expect(() => buildMessage({ ...message, from: 'a@b.co', fromName: 'MedRec', subject: 'x\r\nBcc: evil@x.co' }, new Date())).toThrow(/injection/);
  });
});

describe('production config', () => {
  it('refuses to serve without an https PUBLIC_URL', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { app } = await import('./helpers');
    const res = await app.request('/api/ready', {}, { ...env, ENVIRONMENT: 'production', PUBLIC_URL: '' });
    expect(res.status).toBe(503);
    err.mockRestore();
  });
});
