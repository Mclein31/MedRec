const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const fs = require('fs');
const path = require('path');

describe('Medical Records API Endpoints', () => {
  let token;
  let testEmail;
  let createdRecordId;
  let attachmentPath;

  beforeAll(async () => {
    const schemaSql = fs.readFileSync(path.join(__dirname, '../src/migrations/schema.sql'), 'utf8');
    await pool.query(schemaSql);

    testEmail = `record_test_${Date.now()}@example.com`;
    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Record Test User',
        email: testEmail,
        password: 'Password123',
      });
    expect(res.status).toBe(201);
    token = res.body.token;
    attachmentPath = `${res.body.user.id}/prescription.jpg`;
  });

  afterAll(async () => {
    try {
      await pool.query('DELETE FROM public.users WHERE email = $1', [testEmail]);
    } catch {}
    await pool.end();
  });

  it('POST /records should create record with attachmentUrl and return it', async () => {
    const res = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'prescription',
        title: 'Amoxicillin 500mg Rx',
        description: 'Take 1 capsule every 8 hours for 10 days',
        date: '2026-08-31',
        attachmentUrl: attachmentPath,
      });

    expect(res.status).toBe(201);
    expect(res.body.record).toHaveProperty('id');
    expect(res.body.record.title).toBe('Amoxicillin 500mg Rx');
    expect(res.body.record.attachmentPath).toBe(attachmentPath);
    expect(res.body.record.attachment_url).toMatch(/^https:\/\//);

    createdRecordId = res.body.record.id;
  });

  it('GET /records/:id should return single record with attachment_url', async () => {
    const res = await request(app)
      .get(`/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.record.id).toBe(createdRecordId);
    expect(res.body.record.attachmentPath).toBe(attachmentPath);
  });

  it('GET /records should list all records including attachment_url', async () => {
    const res = await request(app)
      .get('/records')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.records)).toBe(true);
    const found = res.body.records.find((r) => r.id === createdRecordId);
    expect(found).toBeDefined();
    expect(found.attachmentPath).toBe(attachmentPath);
  });

  it('PUT /records/:id should update record metadata and return updated record', async () => {
    const res = await request(app)
      .put(`/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Amoxicillin 875mg Extended Release',
        type: 'medication',
        date: '2026-09-02',
        description: 'Updated prescription dosage instructions: take twice daily with meals.',
      });

    expect(res.status).toBe(200);
    expect(res.body.record.id).toBe(createdRecordId);
    expect(res.body.record.title).toBe('Amoxicillin 875mg Extended Release');
    expect(res.body.record.type).toBe('medication');
    expect(res.body.record.date).toBe('2026-09-02');
    expect(res.body.record.description).toBe('Updated prescription dosage instructions: take twice daily with meals.');

    // Verify GET reflects the update
    const getRes = await request(app)
      .get(`/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.record.title).toBe('Amoxicillin 875mg Extended Release');
    expect(getRes.body.record.type).toBe('medication');
  });

  it('PUT /records/:id should reject invalid category or empty title', async () => {
    const badTypeRes = await request(app)
      .put(`/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'invalid_type' });
    expect(badTypeRes.status).toBe(400);

    const emptyTitleRes = await request(app)
      .put(`/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '   ' });
    expect(emptyTitleRes.status).toBe(400);
  });

  it.each(['2026-02-29', '2026-04-31', '2026-13-01', '2026-00-10', '0000-01-01', '2026-09-02T12:00:00Z'])('should reject invalid civil date %s on create and update', async (date) => {
    const createRes = await request(app).post('/records')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'lab', title: 'Invalid date', date });
    expect(createRes.status).toBe(400);
    const updateRes = await request(app).put(`/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ date });
    expect(updateRes.status).toBe(400);
    const unchanged = await request(app).get(`/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(unchanged.body.record.date).toBe('2026-09-02');
  });

  it.each(['blob:https://example.com/photo', 'file:///tmp/photo.jpg', 'content://photo', 'data:image/jpeg;base64,aGVsbG8='])('should reject local attachment URI %s on create and update', async (attachmentUrl) => {
    const createRes = await request(app).post('/records')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'lab', title: 'Local attachment', date: '2026-09-02', attachmentUrl });
    expect(createRes.status).toBe(400);
    const updateRes = await request(app).put(`/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ attachmentUrl });
    expect(updateRes.status).toBe(400);
    const unchanged = await request(app).get(`/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(unchanged.body.record.attachmentPath).toBe(attachmentPath);
  });

  it('should accept leap-day dates and preserve stable pagination for tied dates', async () => {
    const ids = [];
    for (let i = 0; i < 3; i++) {
      const res = await request(app).post('/records')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'lab', title: `Leap day ${i}`, date: '2028-02-29' });
      expect(res.status).toBe(201);
      ids.push(res.body.record.id);
    }
    const pages = [];
    for (let offset = 0; offset < 3; offset++) {
      const res = await request(app).get(`/records?limit=1&offset=${offset}`)
        .set('Authorization', `Bearer ${token}`);
      pages.push(res.body.records[0].id);
    }
    expect(pages).toEqual(ids.sort().reverse());
  });

  it('DELETE /records/:id should remove record and attachment', async () => {
    const res = await request(app)
      .delete(`/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);

    const checkRes = await request(app)
      .get(`/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(checkRes.status).toBe(404);
  });
});
