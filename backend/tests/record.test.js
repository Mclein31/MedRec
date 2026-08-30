const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');

describe('Medical Records API Endpoints', () => {
  let token;
  let testEmail;
  let createdRecordId;
  const samplePhotoUri = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...';

  beforeAll(async () => {
    const fs = require('fs');
    const path = require('path');
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
  });

  afterAll(async () => {
    try {
      await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
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
        attachmentUrl: samplePhotoUri,
      });

    expect(res.status).toBe(201);
    expect(res.body.record).toHaveProperty('id');
    expect(res.body.record.title).toBe('Amoxicillin 500mg Rx');
    expect(res.body.record.attachment_url).toBe(samplePhotoUri);

    createdRecordId = res.body.record.id;
  });

  it('GET /records/:id should return single record with attachment_url', async () => {
    const res = await request(app)
      .get(`/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.record.id).toBe(createdRecordId);
    expect(res.body.record.attachment_url).toBe(samplePhotoUri);
  });

  it('GET /records should list all records including attachment_url', async () => {
    const res = await request(app)
      .get('/records')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.records)).toBe(true);
    const found = res.body.records.find((r) => r.id === createdRecordId);
    expect(found).toBeDefined();
    expect(found.attachment_url).toBe(samplePhotoUri);
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
