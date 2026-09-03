const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const fs = require('fs');
const path = require('path');

describe('Storage API Endpoints (Cloudflare R2)', () => {
  let token;
  let otherToken;
  let testEmail;
  let otherEmail;
  let userId;
  let otherUserId;

  beforeAll(async () => {
    const schemaSql = fs.readFileSync(path.join(__dirname, '../src/migrations/schema.sql'), 'utf8');
    await pool.query(schemaSql);

    testEmail = `storage_user1_${Date.now()}@example.com`;
    const res1 = await request(app)
      .post('/auth/register')
      .send({
        name: 'Storage User 1',
        email: testEmail,
        password: 'Password123',
      });
    expect(res1.status).toBe(201);
    token = res1.body.token;
    userId = res1.body.user.id;

    otherEmail = `storage_user2_${Date.now()}@example.com`;
    const res2 = await request(app)
      .post('/auth/register')
      .send({
        name: 'Storage User 2',
        email: otherEmail,
        password: 'Password456',
      });
    expect(res2.status).toBe(201);
    otherToken = res2.body.token;
    otherUserId = res2.body.user.id;
  });

  afterAll(async () => {
    try {
      await pool.query('DELETE FROM public.users WHERE email IN ($1, $2)', [testEmail, otherEmail]);
    } catch {}
    await pool.end();
  });

  it('POST /storage/upload-url should reject unauthenticated request', async () => {
    const res = await request(app)
      .post('/storage/upload-url')
      .send({
        bucket: 'medical-records',
        fileName: 'lab_scan.jpg',
        fileType: 'image/jpeg',
      });
    expect(res.status).toBe(401);
  });

  it('POST /storage/upload-url should reject disallowed bucket', async () => {
    const res = await request(app)
      .post('/storage/upload-url')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bucket: 'forbidden-bucket',
        fileName: 'file.jpg',
        fileType: 'image/jpeg',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid bucket/i);
  });

  it('POST /storage/upload-url should reject disallowed file MIME type', async () => {
    const res = await request(app)
      .post('/storage/upload-url')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bucket: 'medical-records',
        fileName: 'malicious.exe',
        fileType: 'application/x-msdownload',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid file type/i);
  });

  it('POST /storage/upload-url should generate signed upload URL with userId prefix isolation', async () => {
    const res = await request(app)
      .post('/storage/upload-url')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bucket: 'medical-records',
        fileName: 'lab_results.png',
        fileType: 'image/png',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('uploadUrl');
    expect(res.body).toHaveProperty('path');
    expect(res.body.path).toMatch(new RegExp(`^${userId}/`));
    expect(res.body.path).toMatch(/\.png$/);
  });

  it('GET /storage/download-url should reject download request for another user file path', async () => {
    const otherUserFilePath = `${otherUserId}/sensitive_record.jpg`;
    const res = await request(app)
      .get(`/storage/download-url?bucket=medical-records&filePath=${otherUserFilePath}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Access denied/i);
  });

  it('GET /storage/download-url should grant download URL for own file path', async () => {
    const ownFilePath = `${userId}/my_record.jpg`;
    const res = await request(app)
      .get(`/storage/download-url?bucket=medical-records&filePath=${ownFilePath}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('downloadUrl');
  });
});
