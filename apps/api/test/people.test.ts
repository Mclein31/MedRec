import { afterAll, describe, expect, it } from 'vitest';
import { JPEG, bucket, call, pool, setFetch, signUp } from './helpers';

afterAll(() => pool.end());

const path = (url: string) => new URL(url).pathname;
const record = (title: string, personId?: string) => ({ title, category: 'lab', eventDate: '2026-03-14', provider: null, facility: null, notes: null, ai: null, ...(personId ? { personId } : {}) });

describe('caregiver profiles', () => {
  it('keeps a family member’s records separate from the account holder’s', async () => {
    const { token } = await signUp();
    const mia = await call('POST', '/api/people', { token, json: { name: 'Mia', relation: 'Child', bloodType: 'A+', allergies: ['Peanuts'] } });
    expect(mia.status).toBe(201);
    const id = mia.data.person.id as string;

    await call('POST', '/api/records', { token, json: record('My lipid panel') });
    const own = await call('POST', '/api/records', { token, json: record('Mia’s blood count', id) });
    expect(own.data.record.personId).toBe(id);

    const mine = await call('GET', '/api/records', { token });
    expect(mine.data.records.map((r: { title: string }) => r.title)).toEqual(['My lipid panel']);
    const hers = await call('GET', `/api/records?personId=${id}`, { token });
    expect(hers.data.records.map((r: { title: string }) => r.title)).toEqual(['Mia’s blood count']);
    expect((await call('GET', `/api/records/summary?personId=${id}`, { token })).data.total).toBe(1);

    const list = await call('GET', '/api/people', { token });
    expect(list.data.people).toMatchObject([{ name: 'Mia', relation: 'Child', recordCount: 1, allergies: ['Peanuts'] }]);
  });

  it('never lets one account use another account’s family member', async () => {
    const a = await signUp();
    const mia = await call('POST', '/api/people', { token: a.token, json: { name: 'Mia' } });
    const id = mia.data.person.id as string;
    await call('POST', '/api/records', { token: a.token, json: record('Private', id) });

    const b = await signUp();
    expect((await call('GET', `/api/records?personId=${id}`, { token: b.token })).status).toBe(404);
    expect((await call('POST', '/api/records', { token: b.token, json: record('Sneaky', id) })).status).toBe(404);
    expect((await call('GET', `/api/people/${id}`, { token: b.token })).status).toBe(404);
    expect((await call('PATCH', `/api/people/${id}`, { token: b.token, json: { name: 'Taken' } })).status).toBe(404);
    expect((await call('DELETE', `/api/people/${id}`, { token: b.token })).status).toBe(404);
    expect((await call('GET', '/api/people', { token: b.token })).data.people).toEqual([]);
    expect((await call('GET', `/api/people/${id}`, { token: a.token })).data.person.name).toBe('Mia');
  });

  it('shares only the family member’s records and details', async () => {
    const { token } = await signUp('Ada Parent');
    const mia = await call('POST', '/api/people', { token, json: { name: 'Mia Parent', allergies: ['Peanuts'] } });
    const id = mia.data.person.id as string;
    const mine = await call('POST', '/api/records', { token, json: record('Adult cholesterol') });
    await call('POST', '/api/records', { token, json: record('Mia vaccination', id) });

    const share = await call('POST', '/api/shares', { token, json: { scope: 'all', minutes: 15, personId: id } });
    expect(share.status).toBe(201);
    expect(share.data.share.personId).toBe(id);
    const page = await call('GET', path(share.data.share.url));
    expect(page.data).toContain('Mia vaccination');
    expect(page.data).toContain('Peanuts');
    expect(page.data).not.toContain('Adult cholesterol');
    expect(page.data).not.toContain('Ada Parent');

    // A specific-records share can't smuggle in someone else's record.
    const mixed = await call('POST', '/api/shares', { token, json: { scope: 'records', recordIds: [mine.data.record.id], minutes: 15, personId: id } });
    expect(mixed.status).toBe(422);
  });

  it('gives a family member their own emergency page', async () => {
    const { token } = await signUp('Ada Parent');
    const mia = await call('POST', '/api/people', { token, json: { name: 'Mia Parent', bloodType: 'O-', emergencyContactName: 'Ada', emergencyContactPhone: '+63 917 000 1111' } });
    const on = await call('PUT', `/api/people/${mia.data.person.id}/emergency`, { token, json: { enabled: true } });
    const page = await call('GET', path(on.data.person.emergency.url));
    expect(page.status).toBe(200);
    expect(page.data).toContain('Mia Parent');
    expect(page.data).toContain('O-');
    expect(page.data).toContain('tel:+639170001111');
    await call('PUT', `/api/people/${mia.data.person.id}/emergency`, { token, json: { enabled: false } });
    expect((await call('GET', path(on.data.person.emergency.url))).status).toBe(404);
  });

  it('removing a family member deletes their records and stored pages, and nothing else', async () => {
    const { token } = await signUp();
    const mia = await call('POST', '/api/people', { token, json: { name: 'Mia' } });
    const id = mia.data.person.id as string;
    const file = await call('POST', '/api/records/files', { token, body: JPEG, headers: { 'content-type': 'application/octet-stream' } });
    const rec = await call('POST', '/api/records', { token, json: { ...record('Mia x-ray', id), fileIds: [file.data.file.id] } });
    await call('POST', '/api/records', { token, json: record('Mine stays') });
    const before = bucket.objects.size;

    expect((await call('DELETE', `/api/people/${id}`, { token })).status).toBe(200);
    expect((await call('GET', `/api/records/${rec.data.record.id}`, { token })).status).toBe(404);
    expect(bucket.objects.size).toBe(before - 1);
    expect((await call('GET', '/api/records', { token })).data.records.map((r: { title: string }) => r.title)).toEqual(['Mine stays']);
  });

  it('Ask Remy answers about the person being viewed only', async () => {
    const { token } = await signUp('Ada Parent');
    const mia = await call('POST', '/api/people', { token, json: { name: 'Mia', relation: 'Child' } });
    await call('POST', '/api/records', { token, json: record('Adult cholesterol') });
    await call('POST', '/api/records', { token, json: record('Mia vaccination', mia.data.person.id) });
    let sent = '';
    setFetch(async (_input, init) => {
      sent = String(init?.body ?? '');
      return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ kind: 'answer', answer: 'Mia has one record.', recordIds: ['R1'], followUps: [] }) }] } }] });
    });
    const res = await call('POST', '/api/ai/ask', { token, json: { question: 'What records are there?', personId: mia.data.person.id } });
    expect(res.status).toBe(200);
    expect(sent).toContain('Mia vaccination');
    expect(sent).toContain('These are the records of Mia');
    expect(sent).not.toContain('Adult cholesterol');
    expect(res.data.records.map((r: { title: string }) => r.title)).toEqual(['Mia vaccination']);
  });
});
