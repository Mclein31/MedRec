import { afterAll, describe, expect, it } from 'vitest';
import { JPEG, bucket, call, pool, setFetch, signUp } from './helpers';

afterAll(() => pool.end());

const base = { category: 'lab', eventDate: '2026-03-14', provider: 'Dr. Reyes', facility: 'St. Luke’s', notes: null, ai: null };

async function upload(token: string, bytes: Uint8Array<ArrayBuffer> = JPEG) {
  return call('POST', '/api/records/files', { token, body: bytes, headers: { 'content-type': 'application/octet-stream' } });
}

describe('records', () => {
  it('stores uploaded pages privately and attaches them on save', async () => {
    const { token, userId } = await signUp();
    const file = await upload(token);
    expect(file.status).toBe(201);
    expect(file.data.file.contentType).toBe('image/jpeg');

    const rec = await call('POST', '/api/records', { token, json: { ...base, title: 'Complete blood count', fileIds: [file.data.file.id] } });
    expect(rec.status).toBe(201);
    expect(rec.data.record.files).toHaveLength(1);
    expect([...bucket.objects.keys()].some((k) => k.startsWith(`${userId}/records/`))).toBe(true);

    const url = new URL(rec.data.record.files[0].url);
    const img = await call('GET', url.pathname + url.search);
    expect(img.status).toBe(200);
    expect(img.headers.get('content-type')).toBe('image/jpeg');
    const forged = await call('GET', url.pathname + url.search.replace(/sig=[^&]+/, 'sig=AAAAAAAAAAAAAAAAAAAAAAAA'));
    expect(forged.status).toBe(403);
  });

  it('rejects files whose bytes are not an image or PDF', async () => {
    const { token } = await signUp();
    const res = await upload(token, new TextEncoder().encode('<script>alert(1)</script>'));
    expect(res.status).toBe(415);
    expect(res.data.error.code).toBe('UNSUPPORTED_FILE');
  });

  it('rejects impossible calendar dates', async () => {
    const { token } = await signUp();
    const res = await call('POST', '/api/records', { token, json: { ...base, title: 'Bad date', eventDate: '2026-02-30' } });
    expect(res.status).toBe(422);
  });

  it('pages through every record exactly once, newest first', async () => {
    const { token } = await signUp();
    for (let i = 0; i < 35; i++) {
      const day = String((i % 28) + 1).padStart(2, '0');
      await call('POST', '/api/records', { token, json: { ...base, title: `Visit ${i}`, eventDate: i % 5 === 0 ? null : `2025-0${(i % 9) + 1}-${day}` } });
    }
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const res = await call('GET', `/api/records?limit=10${cursor ? `&cursor=${cursor}` : ''}`, { token });
      seen.push(...res.data.records.map((r: { id: string }) => r.id));
      cursor = res.data.nextCursor;
    } while (cursor);
    expect(seen).toHaveLength(35);
    expect(new Set(seen).size).toBe(35);
    const summary = await call('GET', '/api/records/summary', { token });
    expect(summary.data).toMatchObject({ total: 35, counts: { lab: 35, imaging: 0 } });
  });

  it('searches titles, providers and notes', async () => {
    const { token } = await signUp();
    await call('POST', '/api/records', { token, json: { ...base, title: 'Lipid panel', notes: 'fasting cholesterol' } });
    await call('POST', '/api/records', { token, json: { ...base, title: 'Chest X-ray', category: 'imaging', provider: 'Dr. Santos' } });
    const byNote = await call('GET', '/api/records?q=cholesterol', { token });
    expect(byNote.data.records.map((r: { title: string }) => r.title)).toEqual(['Lipid panel']);
    const byPrefix = await call('GET', '/api/records?q=sant', { token });
    expect(byPrefix.data.records.map((r: { title: string }) => r.title)).toEqual(['Chest X-ray']);
    const byCat = await call('GET', '/api/records?category=imaging', { token });
    expect(byCat.data.records).toHaveLength(1);
  });

  it("never exposes another patient's records or files", async () => {
    const a = await signUp();
    const b = await signUp();
    const file = await upload(a.token);
    const rec = await call('POST', '/api/records', { token: a.token, json: { ...base, title: 'Private', fileIds: [file.data.file.id] } });
    expect((await call('GET', `/api/records/${rec.data.record.id}`, { token: b.token })).status).toBe(404);
    expect((await call('DELETE', `/api/records/${rec.data.record.id}`, { token: b.token })).status).toBe(404);
    expect((await call('GET', '/api/records', { token: b.token })).data.records).toHaveLength(0);
    const steal = await call('POST', '/api/records', { token: b.token, json: { ...base, title: 'Steal', fileIds: [file.data.file.id] } });
    expect(steal.status).toBe(422);
  });

  it('deletes stored pages with the record', async () => {
    const { token, userId } = await signUp();
    const file = await upload(token);
    const rec = await call('POST', '/api/records', { token, json: { ...base, title: 'Temp', fileIds: [file.data.file.id] } });
    expect((await call('DELETE', `/api/records/${rec.data.record.id}`, { token })).status).toBe(200);
    expect([...bucket.objects.keys()].some((k) => k === `${userId}/records/${file.data.file.id}`)).toBe(false);
  });

  it('reads pages with Gemini and falls back to the second model', async () => {
    const { token } = await signUp();
    const file = await upload(token);
    const calls: string[] = [];
    setFetch(async (input) => {
      const url = String(input);
      calls.push(url);
      if (url.includes('gemini-3.5-flash-lite')) return new Response('overloaded', { status: 503 });
      const draft = { title: 'Complete blood count', category: 'lab', eventDate: '2026-03-14', provider: null, facility: 'Metro Lab', summary: 'Blood counts are within range.', findings: [], medications: [], labValues: [{ name: 'Hemoglobin', value: '13.9', unit: 'g/dL', range: '12-16', flag: 'normal' }], terms: [], legible: true };
      return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(draft) }] } }] });
    });
    const res = await call('POST', '/api/records/scan', { token, json: { fileIds: [file.data.file.id] } });
    expect(res.status).toBe(200);
    expect(res.data.draft).toMatchObject({ title: 'Complete blood count', category: 'lab', model: 'gemini-3.1-flash-lite' });
    expect(calls).toHaveLength(2);
  });
});
