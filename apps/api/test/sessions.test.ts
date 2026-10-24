import { afterAll, describe, expect, it } from 'vitest';
import { SYSTEM } from '../src/lib/types';
import { PASSWORD, call, db, lastCode, pool, signUp, uniqueEmail } from './helpers';

afterAll(() => pool.end());

describe('sessions', () => {
  it('rotates refresh tokens and rejects a reused one', async () => {
    const { refresh } = await signUp();
    const next = await call('POST', '/api/auth/refresh', { json: { refreshToken: refresh } });
    expect(next.status).toBe(200);
    expect(next.data.session.refreshToken).not.toBe(refresh);
    const reused = await call('POST', '/api/auth/refresh', { json: { refreshToken: refresh } });
    expect(reused.status).toBe(401);
    expect(reused.data.error.code).toBe('SESSION_EXPIRED');
  });

  it('ends access immediately on sign-out', async () => {
    const { token } = await signUp();
    expect((await call('POST', '/api/auth/logout', { token })).status).toBe(200);
    const after = await call('GET', '/api/auth/me', { token });
    expect(after.status).toBe(401);
    expect(after.data.error.code).toBe('SESSION_EXPIRED');
  });

  it('rejects tampered and missing tokens', async () => {
    const { token } = await signUp();
    const [h, b] = token.split('.');
    expect((await call('GET', '/api/auth/me', { token: `${h}.${b}.forged` })).status).toBe(401);
    expect((await call('GET', '/api/auth/me')).status).toBe(401);
  });

  it('lists devices and signs one out remotely', async () => {
    const a = await signUp();
    const list = await call('GET', '/api/auth/sessions', { token: a.token });
    expect(list.data.sessions).toHaveLength(1);
    expect(list.data.sessions[0]).toMatchObject({ device: 'Test phone', current: true });
    await call('DELETE', `/api/auth/sessions/${list.data.sessions[0].id}`, { token: a.token });
    expect((await call('GET', '/api/auth/me', { token: a.token })).status).toBe(401);
  });
});

describe('passwords', () => {
  it('locks the account after ten wrong passwords', async () => {
    const { email } = await signUp();
    for (let i = 0; i < 10; i++) {
      const r = await call('POST', '/api/auth/login', { json: { email, password: 'wrong password!' }, headers: { 'cf-connecting-ip': `10.9.9.${i}` } });
      expect(r.status).toBe(401);
    }
    const [row] = await db.query<{ locked: boolean }>(SYSTEM, 'SELECT locked_until > now() AS locked FROM users WHERE email = $1', [email]);
    expect(row?.locked).toBe(true);
    const locked = await call('POST', '/api/auth/login', { json: { email, password: PASSWORD } });
    expect(locked.status).toBe(429); // the per-email window (10 / 15 min) is also exhausted
  });

  it('gives the same answer for unknown emails on reset', async () => {
    const unknown = await call('POST', '/api/auth/password/forgot', { json: { email: uniqueEmail('nobody') } });
    const { email } = await signUp();
    const known = await call('POST', '/api/auth/password/forgot', { json: { email } });
    expect(unknown.status).toBe(202);
    expect(Object.keys(unknown.data.challenge).sort()).toEqual(Object.keys(known.data.challenge).sort());
  });

  it('resets the password and signs out every device', async () => {
    const { email, token, refresh } = await signUp();
    const { data } = await call('POST', '/api/auth/password/forgot', { json: { email } });
    const reset = await call('POST', '/api/auth/password/reset', {
      json: { challengeId: data.challenge.challengeId, code: lastCode(email), password: 'a brand new passphrase' },
    });
    expect(reset.status).toBe(200);
    expect((await call('GET', '/api/auth/me', { token })).status).toBe(401);
    expect((await call('POST', '/api/auth/refresh', { json: { refreshToken: refresh } })).status).toBe(401);
    const old = await call('POST', '/api/auth/login', { json: { email, password: PASSWORD } });
    expect(old.status).toBe(401);
    const fresh = await call('POST', '/api/auth/login', { json: { email, password: 'a brand new passphrase' } });
    expect(fresh.data.status).toBe('otp_required');
  });

  it('keeps the session when the current password is wrong', async () => {
    const { token } = await signUp();
    const res = await call('POST', '/api/auth/password/change', { token, json: { currentPassword: 'nope', newPassword: 'another long password' } });
    expect(res.status).toBe(400);
    expect(res.data.error.code).toBe('WRONG_PASSWORD');
    expect((await call('GET', '/api/auth/me', { token })).status).toBe(200);
  });
});
