import { afterAll, describe, expect, it } from 'vitest';
import { SYSTEM } from '../src/lib/types';
import { JPEG, PASSWORD, bucket, call, db, pool, signUp } from './helpers';

afterAll(() => pool.end());

describe('account deletion', () => {
  it('needs the right password and changes nothing otherwise', async () => {
    const { token } = await signUp();
    const res = await call('DELETE', '/api/auth/account', { token, json: { password: 'not my password' } });
    expect(res.status).toBe(400);
    expect(res.data.error).toMatchObject({ code: 'WRONG_PASSWORD', field: 'password' });
    expect((await call('GET', '/api/auth/me', { token })).status).toBe(200);
  });

  it('removes files, records, activity and the sign-in', async () => {
    const { token, userId, email } = await signUp();
    const page = await call('POST', '/api/records/files', { token, body: JPEG });
    expect(page.status).toBe(201);
    const made = await call('POST', '/api/records', {
      token,
      json: { title: 'Blood test', category: 'lab', eventDate: null, provider: null, facility: null, notes: null, ai: null, fileIds: [page.data.file.id] },
    });
    expect(made.status).toBe(201);
    expect((await call('PUT', '/api/profile/avatar', { token, body: JPEG })).status).toBe(200);
    expect([...bucket.objects.keys()].some((k) => k.startsWith(`${userId}/`))).toBe(true);

    const res = await call('DELETE', '/api/auth/account', { token, json: { password: PASSWORD } });
    expect(res.status).toBe(200);
    expect([...bucket.objects.keys()].some((k) => k.startsWith(`${userId}/`))).toBe(false);
    for (const table of ['users', 'profiles', 'records', 'record_files', 'activity', 'sessions']) {
      const column = table === 'users' ? 'id' : 'user_id';
      const rows = await db.query(SYSTEM, `SELECT 1 FROM ${table} WHERE ${column} = $1`, [userId]);
      expect(rows, table).toHaveLength(0);
    }
    expect((await call('GET', '/api/auth/me', { token })).status).toBe(401);
    const again = await call('POST', '/api/auth/login', { json: { email, password: PASSWORD } });
    expect(again.status).toBe(401);
  });
});
