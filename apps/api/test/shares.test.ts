import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { call, clock, pool, signUp } from './helpers';

afterAll(() => pool.end());
beforeEach(() => {
  clock.offsetMs = 0;
});

const rec = (title: string, category: string) => ({ title, category, eventDate: '2026-01-10', provider: null, facility: null, notes: null, ai: null });

async function patientWithRecords() {
  const p = await signUp('Maria Clara');
  await call('PATCH', '/api/profile', { token: p.token, json: { allergies: ['Penicillin'], bloodType: 'O+', dateOfBirth: '1990-05-01' } });
  const lab = await call('POST', '/api/records', { token: p.token, json: rec('Lipid panel', 'lab') });
  const xray = await call('POST', '/api/records', { token: p.token, json: rec('Chest X-ray', 'imaging') });
  return { ...p, labId: lab.data.record.id as string, xrayId: xray.data.record.id as string };
}

const path = (url: string) => new URL(url).pathname;

describe('sharing', () => {
  it('shows a doctor exactly the chosen scope, without an account', async () => {
    const p = await patientWithRecords();
    const share = await call('POST', '/api/shares', { token: p.token, json: { scope: 'categories', categories: ['imaging'], minutes: 15 } });
    expect(share.status).toBe(201);
    expect(share.data.share).toMatchObject({ scopeLabel: 'Imaging', state: 'active' });

    const page = await call('GET', path(share.data.share.url));
    expect(page.status).toBe(200);
    expect(page.data).toContain('Maria Clara');
    expect(page.data).toContain('Penicillin');
    expect(page.data).toContain('Chest X-ray');
    expect(page.data).not.toContain('Lipid panel');
    expect(page.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");

    const activity = await call('GET', '/api/activity', { token: p.token });
    expect(activity.data.items.map((i: { kind: string }) => i.kind)).toContain('share_viewed');
    expect(activity.data.unread).toBeGreaterThan(0);
  });

  it('shares selected records only', async () => {
    const p = await patientWithRecords();
    const share = await call('POST', '/api/shares', { token: p.token, json: { scope: 'records', recordIds: [p.labId], minutes: 30 } });
    const page = await call('GET', path(share.data.share.url));
    expect(page.data).toContain('Lipid panel');
    expect(page.data).not.toContain('Chest X-ray');
  });

  it('refuses an empty scope and unsupported durations', async () => {
    const p = await patientWithRecords();
    expect((await call('POST', '/api/shares', { token: p.token, json: { scope: 'records', recordIds: [], minutes: 15 } })).status).toBe(422);
    expect((await call('POST', '/api/shares', { token: p.token, json: { scope: 'all', minutes: 99999 } })).status).toBe(422);
  });

  it("can't share another patient's records", async () => {
    const a = await patientWithRecords();
    const b = await signUp();
    const res = await call('POST', '/api/shares', { token: b.token, json: { scope: 'records', recordIds: [a.labId], minutes: 15 } });
    expect(res.status).toBe(422);
  });

  it('stops working when revoked or expired, and rejects forged tokens', async () => {
    const p = await patientWithRecords();
    const one = await call('POST', '/api/shares', { token: p.token, json: { scope: 'all', minutes: 15 } });
    const two = await call('POST', '/api/shares', { token: p.token, json: { scope: 'all', minutes: 60 } });
    await call('DELETE', `/api/shares/${one.data.share.id}`, { token: p.token });
    expect((await call('GET', path(one.data.share.url))).status).toBe(404);

    clock.offsetMs = 61 * 60_000;
    expect((await call('GET', path(two.data.share.url))).status).toBe(404);
    // The 15-minute access token expired too; refresh like the app does.
    const fresh = await call('POST', '/api/auth/refresh', { json: { refreshToken: p.refresh } });
    const list = await call('GET', '/api/shares', { token: fresh.data.session.accessToken });
    expect(list.data.active).toHaveLength(0);
    expect(list.data.history.every((s: { url: string | null }) => s.url === null)).toBe(true);

    const forged = path(two.data.share.url).slice(0, -4) + 'AAAA';
    expect((await call('GET', forged)).status).toBe(404);
  });
});

describe('medical ID', () => {
  it('publishes only emergency facts and can be turned off', async () => {
    const p = await patientWithRecords();
    await call('PATCH', '/api/profile', { token: p.token, json: { emergencyContactName: 'Jose', emergencyContactPhone: '+63 917 123 4567', conditions: ['Asthma'] } });
    const on = await call('PUT', '/api/profile/emergency', { token: p.token, json: { enabled: true } });
    const url = on.data.profile.emergency.url as string;
    const page = await call('GET', path(url));
    expect(page.status).toBe(200);
    expect(page.data).toContain('Penicillin');
    expect(page.data).toContain('tel:+639171234567');
    expect(page.data).not.toContain('Lipid panel');

    const rotated = await call('PUT', '/api/profile/emergency', { token: p.token, json: { enabled: true, rotate: true } });
    expect(rotated.data.profile.emergency.url).not.toBe(url);
    expect((await call('GET', path(url))).status).toBe(404);

    await call('PUT', '/api/profile/emergency', { token: p.token, json: { enabled: false } });
    expect((await call('GET', path(rotated.data.profile.emergency.url))).status).toBe(404);
  });
});

describe('profile and export', () => {
  it('validates and saves profile fields', async () => {
    const { token } = await signUp();
    expect((await call('PATCH', '/api/profile', { token, json: { dateOfBirth: '2999-01-01' } })).status).toBe(422);
    const ok = await call('PATCH', '/api/profile', { token, json: { name: 'New Name', heightCm: 170, medications: ['Metformin 500 mg'] } });
    expect(ok.data.profile).toMatchObject({ name: 'New Name', heightCm: 170, medications: ['Metformin 500 mg'] });
  });

  it('exports every record without temporary links', async () => {
    const p = await patientWithRecords();
    const res = await call('GET', '/api/export', { token: p.token });
    expect(res.data.records).toHaveLength(2);
    expect(JSON.stringify(res.data)).not.toContain('sig=');
    expect(res.headers.get('content-disposition')).toContain('medrec-export-');
  });
});
