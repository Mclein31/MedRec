import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PASSWORD, call, clock, lastCode, mail, pool, signUp, uniqueEmail } from './helpers';

afterAll(() => pool.end());
beforeEach(() => {
  clock.offsetMs = 0;
});

async function login(email: string, extra: Record<string, unknown> = {}) {
  return call('POST', '/api/auth/login', { json: { email, password: PASSWORD, ...extra } });
}

describe('registration', () => {
  it('emails a confirmation code and signs in once it is entered', async () => {
    const { token, email } = await signUp('Grace Hopper');
    const me = await call('GET', '/api/auth/me', { token });
    expect(me.status).toBe(200);
    expect(me.data.user).toMatchObject({ name: 'Grace Hopper', email, emailVerified: true });
    expect(mail.find((m) => m.to === email)?.subject).toMatch(/^\d{6} is your MedRec confirmation code$/);
  });

  it('rejects a second account for the same email, ignoring case', async () => {
    const { email } = await signUp();
    const again = await call('POST', '/api/auth/register', { json: { name: 'X', email: email.toUpperCase(), password: PASSWORD } });
    expect(again.status).toBe(409);
    expect(again.data.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('asks for a confirmation code again when an unverified account signs in', async () => {
    const email = uniqueEmail();
    await call('POST', '/api/auth/register', { json: { name: 'Unverified', email, password: PASSWORD } });
    const res = await login(email);
    expect(res.status).toBe(202);
    expect(res.data.status).toBe('verify_email');
  });
});

describe('sign-in with emailed code', () => {
  it('requires the code after a correct password, and counts wrong codes', async () => {
    const { email } = await signUp();
    const res = await login(email);
    expect(res.status).toBe(202);
    expect(res.data).toMatchObject({ status: 'otp_required', challenge: { purpose: 'login', expiresIn: 600 } });
    expect(res.data.challenge.maskedEmail).not.toContain(email.split('@')[0]);

    const wrong = await call('POST', '/api/auth/verify', { json: { challengeId: res.data.challenge.challengeId, code: '000000', purpose: 'login' } });
    // A 1-in-a-million chance the random code is 000000 is acceptable here.
    expect(wrong.status).toBe(400);
    expect(wrong.data.error).toMatchObject({ code: 'OTP_INVALID', attemptsLeft: 4 });

    const ok = await call('POST', '/api/auth/verify', { json: { challengeId: res.data.challenge.challengeId, code: lastCode(email), purpose: 'login' } });
    expect(ok.status).toBe(200);
    expect(ok.data.status).toBe('signed_in');

    const reuse = await call('POST', '/api/auth/verify', { json: { challengeId: res.data.challenge.challengeId, code: lastCode(email), purpose: 'login' } });
    expect(reuse.data.error.code).toBe('OTP_USED');
  });

  it('locks the code after five wrong tries', async () => {
    const { email } = await signUp();
    const { data } = await login(email);
    for (let i = 0; i < 5; i++) {
      await call('POST', '/api/auth/verify', { json: { challengeId: data.challenge.challengeId, code: '999999', purpose: 'login' } });
    }
    const locked = await call('POST', '/api/auth/verify', { json: { challengeId: data.challenge.challengeId, code: lastCode(email), purpose: 'login' } });
    expect(locked.status).toBe(429);
    expect(locked.data.error.code).toBe('OTP_LOCKED');
  });

  it('only accepts the newest code after a resend, and enforces the cooldown', async () => {
    const { email } = await signUp();
    const { data } = await login(email);
    const first = lastCode(email);
    const early = await call('POST', '/api/auth/resend', { json: { challengeId: data.challenge.challengeId } });
    expect(early.status).toBe(429);
    expect(early.data.error.code).toBe('OTP_COOLDOWN');

    clock.offsetMs = 61_000;
    const resent = await call('POST', '/api/auth/resend', { json: { challengeId: data.challenge.challengeId } });
    expect(resent.status).toBe(200);
    const second = lastCode(email);
    if (first !== second) {
      const old = await call('POST', '/api/auth/verify', { json: { challengeId: data.challenge.challengeId, code: first, purpose: 'login' } });
      expect(old.status).toBe(400);
    }
    const ok = await call('POST', '/api/auth/verify', { json: { challengeId: data.challenge.challengeId, code: second, purpose: 'login' } });
    expect(ok.status).toBe(200);
  });

  it('expires codes after ten minutes', async () => {
    const { email } = await signUp();
    const { data } = await login(email);
    clock.offsetMs = 10 * 60_000 + 1000;
    const late = await call('POST', '/api/auth/verify', { json: { challengeId: data.challenge.challengeId, code: lastCode(email), purpose: 'login' } });
    expect(late.data.error.code).toBe('OTP_EXPIRED');
  });

  it('skips the code on a trusted device, and only on that device', async () => {
    const { email } = await signUp();
    const { data } = await login(email);
    const ok = await call('POST', '/api/auth/verify', {
      json: { challengeId: data.challenge.challengeId, code: lastCode(email), purpose: 'login', trustDevice: true, deviceLabel: 'iPhone' },
    });
    expect(ok.data.deviceToken).toEqual(expect.any(String));
    const trusted = await login(email, { deviceToken: ok.data.deviceToken });
    expect(trusted.status).toBe(200);
    expect(trusted.data.status).toBe('signed_in');
    const other = await login(email, { deviceToken: 'x'.repeat(43) });
    expect(other.data.status).toBe('otp_required');
  });
});
