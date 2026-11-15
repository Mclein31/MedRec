import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { OTP_DAILY_FAILURES } from '../src/lib/otp';
import { STORAGE_QUOTA_BYTES } from '../src/routes/records';
import { SYSTEM } from '../src/lib/types';
import { JPEG, PASSWORD, call, clock, db, env, lastCode, pool, setFetch, signUp, uniqueEmail } from './helpers';

/** Regression tests for the 2026-11-16 pentest findings (see .brain/DECISIONS.md DD-57). */
afterAll(() => pool.end());
beforeEach(() => {
  clock.offsetMs = 0;
});

const forgot = (email: string) => call('POST', '/api/auth/password/forgot', { json: { email } });
const resend = (challengeId: string) => call('POST', '/api/auth/resend', { json: { challengeId } });
const reset = (challengeId: string, code: string) => call('POST', '/api/auth/password/reset', { json: { challengeId, code, password: 'a brand new passphrase' } });

describe('password reset does not reveal which emails have accounts', () => {
  it('answers resend, cooldown and wrong codes the same for unknown and real emails', async () => {
    const { email } = await signUp();
    const real = await forgot(email);
    const decoy = await forgot(uniqueEmail('nobody'));
    for (const r of [real, decoy]) expect(r.status).toBe(202);

    const early = [await resend(real.data.challenge.challengeId), await resend(decoy.data.challenge.challengeId)];
    expect(early.map((r) => [r.status, r.data.error.code])).toEqual([[429, 'OTP_COOLDOWN'], [429, 'OTP_COOLDOWN']]);

    clock.offsetMs = 61_000;
    const later = [await resend(real.data.challenge.challengeId), await resend(decoy.data.challenge.challengeId)];
    expect(later.map((r) => r.status)).toEqual([200, 200]);
    for (const r of later) expect(r.data.challenge.maskedEmail).toMatch(/^.{1,2}•{3,6}@example\.com$/);

    const wrong = [await reset(real.data.challenge.challengeId, '000000'), await reset(decoy.data.challenge.challengeId, '000000')];
    expect(wrong.map((r) => [r.status, r.data.error.code, r.data.error.attemptsLeft])).toEqual([
      [400, 'OTP_INVALID', 4],
      [400, 'OTP_INVALID', 4],
    ]);
  });
});

describe('one-time codes', () => {
  it('caps wrong codes per email per day, across new challenges and resends', async () => {
    const { email } = await signUp();
    let failures = 0;
    while (failures < OTP_DAILY_FAILURES) {
      const { data } = await forgot(email);
      for (let i = 0; i < 5 && failures < OTP_DAILY_FAILURES; i++, failures++) {
        expect((await reset(data.challenge.challengeId, '000000')).status).toBe(400);
      }
    }
    // Even the right code is refused once the day's limit is spent.
    const { data } = await forgot(email);
    const blocked = await reset(data.challenge.challengeId, lastCode(email));
    expect(blocked.status).toBe(429);
    expect(blocked.data.error.code).toBe('OTP_DAILY_LIMIT');

    // Reset guesses never block the owner's sign-in codes.
    const login = await call('POST', '/api/auth/login', { json: { email, password: PASSWORD } });
    const ok = await call('POST', '/api/auth/verify', { json: { challengeId: login.data.challenge.challengeId, code: lastCode(email), purpose: 'login' } });
    expect(ok.status).toBe(200);

    // The next day the limit is fresh.
    clock.offsetMs = 86_400_000;
    const next = await forgot(email);
    expect((await reset(next.data.challenge.challengeId, lastCode(email))).status).toBe(200);
  });
});

describe('shared page links', () => {
  async function sharedPage() {
    const p = await signUp('Maria Clara');
    const file = await call('POST', '/api/records/files', { token: p.token, body: JPEG, headers: { 'content-type': 'application/octet-stream' } });
    await call('POST', '/api/records', {
      token: p.token,
      json: { title: 'Chest X-ray', category: 'imaging', eventDate: '2026-01-10', provider: null, facility: null, notes: null, ai: null, fileIds: [file.data.file.id] },
    });
    const share = await call('POST', '/api/shares', { token: p.token, json: { scope: 'all', minutes: 15 } });
    const page = await call('GET', new URL(share.data.share.url).pathname);
    const src = String(page.data).match(/src="([^"]+\/files\/[^"]+)"/)?.[1]?.replace(/&amp;/g, '&');
    if (!src) throw new Error('no page image on the share page');
    const url = new URL(src);
    return { p, shareId: share.data.share.id as string, filePath: url.pathname + url.search };
  }

  it('stop working the moment the share is turned off', async () => {
    const { p, shareId, filePath } = await sharedPage();
    const before = await call('GET', filePath);
    expect(before.status).toBe(200);
    expect(before.headers.get('cache-control')).toBe('no-store');

    await call('DELETE', `/api/shares/${shareId}`, { token: p.token });
    const after = await call('GET', filePath);
    expect(after.status).toBe(403);
    expect(after.data.error.code).toBe('LINK_EXPIRED');
  });

  it("can't be reused without the share binding", async () => {
    const { filePath } = await sharedPage();
    const unbound = filePath.replace(/&share=[^&]+/, '');
    expect((await call('GET', unbound)).status).toBe(403);
  });

  it('never outlive the share itself', async () => {
    const { filePath } = await sharedPage();
    clock.offsetMs = 15 * 60_000 + 1000;
    expect((await call('GET', filePath)).status).toBe(403);
  });
});

describe('AI spend', () => {
  it('stops at the service-wide hourly budget, whichever account asks', async () => {
    const { token } = await signUp();
    setFetch(async () =>
      Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ kind: 'notFound', answer: 'Nothing saved yet.', recordIds: [], followUps: [] }) }] } }] }),
    );
    const window = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000).toISOString();
    const [row] = await db.query<{ hits: number }>(SYSTEM, `SELECT hits FROM rate_limits WHERE key = 'ai:global' AND window_start = $1`, [window]);
    const saved = env.AI_HOURLY_LIMIT;
    env.AI_HOURLY_LIMIT = String((row?.hits ?? 0) + 1);
    try {
      expect((await call('POST', '/api/ai/ask', { token, json: { question: 'What is saved?' } })).status).toBe(200);
      const other = await signUp();
      const busy = await call('POST', '/api/ai/ask', { token: other.token, json: { question: 'What is saved?' } });
      expect(busy.status).toBe(429);
      expect(busy.data.error.code).toBe('AI_BUSY');
    } finally {
      env.AI_HOURLY_LIMIT = saved;
    }
  });
});

describe('trusted devices (DD-58)', () => {
  const login = (email: string, deviceToken?: string) => call('POST', '/api/auth/login', { json: { email, password: PASSWORD, ...(deviceToken ? { deviceToken } : {}) } });
  async function trust(email: string, label: string) {
    const l = await login(email);
    const v = await call('POST', '/api/auth/verify', { json: { challengeId: l.data.challenge.challengeId, code: lastCode(email), purpose: 'login', trustDevice: true, deviceLabel: label } });
    return { deviceToken: v.data.deviceToken as string, token: v.data.session.accessToken as string, refresh: v.data.session.refreshToken as string };
  }
  const sessionId = async (token: string, label: string) =>
    (await call('GET', '/api/auth/sessions', { token })).data.sessions.find((x: { device: string }) => x.device === label).id as string;

  it('signing a device out remotely also stops it skipping the code, and leaves other devices trusted', async () => {
    const { email, token } = await signUp();
    const lost = await trust(email, 'Lost phone');
    const tablet = await trust(email, 'Tablet');
    await call('DELETE', `/api/auth/sessions/${await sessionId(token, 'Lost phone')}`, { token });
    expect((await login(email, lost.deviceToken)).data.status).toBe('otp_required');
    expect((await login(email, tablet.deviceToken)).data.status).toBe('signed_in');
  });

  it('follows the session through refresh and through sign-ins that used the device', async () => {
    const { email, token } = await signUp();
    const phone = await trust(email, 'Phone');
    // A refreshed session is still the same device.
    await call('POST', '/api/auth/refresh', { json: { refreshToken: phone.refresh } });
    await call('DELETE', `/api/auth/sessions/${await sessionId(token, 'Phone')}`, { token });
    expect((await login(email, phone.deviceToken)).data.status).toBe('otp_required');

    // A session opened by skipping the code is linked too: logging it out forgets the device.
    const again = await trust(email, 'Phone 2');
    const skipped = await login(email, again.deviceToken);
    expect(skipped.data.status).toBe('signed_in');
    await call('POST', '/api/auth/logout', { token: skipped.data.session.accessToken });
    expect((await login(email, again.deviceToken)).data.status).toBe('otp_required');
  });
});

describe('storage and input robustness', () => {
  it('caps total page storage per account', async () => {
    const { token, userId } = await signUp();
    // size_bytes is a 32-bit column, so fill the quota with two half-quota rows.
    for (const n of [1, 2]) {
      await db.query(SYSTEM, `INSERT INTO record_files (user_id, object_key, content_type, size_bytes) VALUES ($1, $2, 'image/jpeg', $3)`, [
        userId,
        `${userId}/records/quota-filler-${n}`,
        STORAGE_QUOTA_BYTES / 2,
      ]);
    }
    const res = await call('POST', '/api/records/files', { token, body: JPEG, headers: { 'content-type': 'application/octet-stream' } });
    expect(res.status).toBe(413);
    expect(res.data.error.code).toBe('STORAGE_FULL');
  });

  it('answers tampered cursors and unusable characters with 400, never 500', async () => {
    const { token } = await signUp();
    const forged = btoa(JSON.stringify(['2026-01-01', "2026-01-01'); DELETE FROM records;--", '00000000-0000-0000-0000-000000000000']));
    const cursor = await call('GET', `/api/records?cursor=${encodeURIComponent(forged)}`, { token });
    expect(cursor.status).toBe(400);
    expect(cursor.data.error.code).toBe('BAD_CURSOR');
    expect((await call('GET', `/api/records?q=${encodeURIComponent('lab\u0000')}`, { token })).status).toBe(200);
    const nul = await call('POST', '/api/records', { token, json: { title: 'a\u0000b', category: 'lab', eventDate: null, provider: null, facility: null, notes: null, ai: null } });
    expect(nul.status).toBe(400);
    expect(nul.data.error.code).toBe('INVALID_INPUT');
  });
});
