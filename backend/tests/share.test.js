const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const aiService = require('../src/services/aiService');

describe('Doctor Sharing API Endpoints', () => {
  let userToken;
  let userEmail;
  let userId;
  let userRecordId1;
  let userRecordId2;

  let otherToken;
  let otherEmail;
  let otherRecordId;

  beforeAll(async () => {
    const schemaSql = fs.readFileSync(path.join(__dirname, '../src/migrations/schema.sql'), 'utf8');
    await pool.query(schemaSql);

    userEmail = `share_user1_${Date.now()}@example.com`;
    const res1 = await request(app)
      .post('/auth/register')
      .send({
        name: 'Jane Doe Patient',
        email: userEmail,
        password: 'Password123',
      });
    expect(res1.status).toBe(201);
    userToken = res1.body.token;
    userId = res1.body.user.id;

    otherEmail = `share_user2_${Date.now()}@example.com`;
    const res2 = await request(app)
      .post('/auth/register')
      .send({
        name: 'Doctor Share Patient 2',
        email: otherEmail,
        password: 'Password456',
      });
    expect(res2.status).toBe(201);
    otherToken = res2.body.token;

    // Create 2 records for User 1
    const rec1 = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        type: 'consultation',
        title: 'Cardiology Consult',
        description: 'Normal sinus rhythm, BP 120/80',
        date: '2026-08-15',
      });
    userRecordId1 = rec1.body.record.id;

    const rec2 = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        type: 'lab',
        title: 'Lipid Panel',
        description: 'Total cholesterol: 175 mg/dL',
        date: '2026-08-20',
      });
    userRecordId2 = rec2.body.record.id;

    // Create 1 record for User 2
    const otherRec = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        type: 'diagnosis',
        title: 'Confidential Diagnosis',
        description: 'Other patient private record',
        date: '2026-08-25',
      });
    otherRecordId = otherRec.body.record.id;
  });

  afterAll(async () => {
    try {
      await pool.query('DELETE FROM public.users WHERE email IN ($1, $2)', [userEmail, otherEmail]);
    } catch {}
    await pool.end();
  });

  it('POST /share should reject share attempt referencing another user record IDs (IDOR Defense)', async () => {
    const res = await request(app)
      .post('/share')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        ttlMinutes: 60,
        recordIds: [userRecordId1, otherRecordId], // includes User 2's record
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/do not belong to you/i);
  });

  it('POST /share should create valid share token for owned records and return patient name on scan', async () => {
    const res = await request(app)
      .post('/share')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        ttlMinutes: 60,
        recordIds: [userRecordId1, userRecordId2],
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('expiresAt');
    expect(res.body.recordIds).toEqual([userRecordId1, userRecordId2]);

    const shareToken = res.body.token;

    // Doctor scans QR code via GET /share/:token (unauthenticated)
    const doctorRes = await request(app).get(`/share/${shareToken}`);
    expect(doctorRes.status).toBe(200);
    expect(doctorRes.body.patient.name).toBe('Jane Doe Patient');
    expect(doctorRes.body.records.length).toBe(2);
    const returnedIds = doctorRes.body.records.map((r) => r.id);
    expect(returnedIds).toContain(userRecordId1);
    expect(returnedIds).toContain(userRecordId2);
  });

  it.each([0, -1, 1.5, 1441, 'Infinity', 'invalid', null])('POST /share should reject invalid duration %s', async (ttlMinutes) => {
    const res = await request(app).post('/share')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ttlMinutes });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/whole number between 1 and 1440/);
  });

  it('POST /share should reject an explicitly empty scope instead of exposing the full vault', async () => {
    const res = await request(app).post('/share')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ttlMinutes: 15, recordIds: [] });
    expect(res.status).toBe(400);
  });

  it('POST /share/:token/summarize should summarize all shared records without fabricating data', async () => {
    const shareRes = await request(app)
      .post('/share')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        ttlMinutes: 60,
        recordIds: [userRecordId1, userRecordId2],
      });

    const shareToken = shareRes.body.token;

    const sumRes = await request(app).post(`/share/${shareToken}/summarize`);
    expect(sumRes.status).toBe(200);
    expect(sumRes.body).toHaveProperty('summary');
    expect(sumRes.body).toHaveProperty('diagnoses');
    expect(sumRes.body).toHaveProperty('currentMedications');
    expect(sumRes.body).toHaveProperty('keyNotes');
    expect(typeof sumRes.body.summary).toBe('string');
  });

  it('GET /share/:token/export should export bundle of shared records for clinical download', async () => {
    const shareRes = await request(app)
      .post('/share')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        ttlMinutes: 60,
        recordIds: [userRecordId1],
      });

    const shareToken = shareRes.body.token;

    const exportRes = await request(app).get(`/share/${shareToken}/export`);
    expect(exportRes.status).toBe(200);
    expect(exportRes.body.patientName).toBe('Jane Doe Patient');
    expect(exportRes.body.totalRecords).toBe(1);
    expect(exportRes.body.records[0].title).toBe('Cardiology Consult');
  });

  it('POST /share/:token/terminate should allow recipient to terminate session and preserve original patient records', async () => {
    const shareRes = await request(app)
      .post('/share')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        ttlMinutes: 45,
        recordIds: [userRecordId1],
      });

    const shareToken = shareRes.body.token;

    // Terminate as recipient
    const termRes = await request(app).post(`/share/${shareToken}/terminate`);
    expect(termRes.status).toBe(200);
    expect(termRes.body.message).toMatch(/terminated/i);

    // Subsequent access attempts MUST return 404
    const getAfterTerm = await request(app).get(`/share/${shareToken}`);
    expect(getAfterTerm.status).toBe(404);

    const sumAfterTerm = await request(app).post(`/share/${shareToken}/summarize`);
    expect(sumAfterTerm.status).toBe(404);

    // Patient original records MUST remain intact in database
    const patientRecords = await request(app)
      .get('/records')
      .set('Authorization', `Bearer ${userToken}`);
    expect(patientRecords.status).toBe(200);
    expect(patientRecords.body.records.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /share should list active share sessions', async () => {
    const res = await request(app)
      .get('/share')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.shares)).toBe(true);
    expect(res.body.shares.length).toBeGreaterThanOrEqual(1);
  });

  it('DELETE /share/:id should revoke a share token and make GET /share/:token return 404', async () => {
    const shareRes = await request(app)
      .post('/share')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ttlMinutes: 30 });

    const shareToken = shareRes.body.token;

    const listRes = await request(app)
      .get('/share')
      .set('Authorization', `Bearer ${userToken}`);

    const shareEntry = listRes.body.shares.find((s) => s.token === shareToken);
    expect(shareEntry).toBeDefined();

    // Revoke share
    const revokeRes = await request(app)
      .delete(`/share/${shareEntry.id}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(revokeRes.status).toBe(204);

    // Doctor scan after revocation MUST fail with 404
    const scanAfterRevoke = await request(app).get(`/share/${shareToken}`);
    expect(scanAfterRevoke.status).toBe(404);
  });

  it('POST /share should enforce maximum 5 active sessions per patient by auto-revoking oldest', async () => {
    // Generate 7 consecutive share sessions
    const createdTokens = [];
    for (let i = 0; i < 7; i++) {
      const res = await request(app)
        .post('/share')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ttlMinutes: 60 });
      expect(res.status).toBe(201);
      createdTokens.push(res.body.token);
    }

    // Check active shares count in database
    const activeCountRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM public.shared_access
       WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now()`,
      [userId]
    );
    expect(activeCountRes.rows[0].count).toBe(5);

    // The two oldest sessions must have been automatically revoked
    const oldestScan1 = await request(app).get(`/share/${createdTokens[0]}`);
    expect(oldestScan1.status).toBe(404);

    const oldestScan2 = await request(app).get(`/share/${createdTokens[1]}`);
    expect(oldestScan2.status).toBe(404);

    // The newest session must be active
    const newestScan = await request(app).get(`/share/${createdTokens[6]}`);
    expect(newestScan.status).toBe(200);
  });

  it('GET /share/:token/zip should download all shared records as a streaming ZIP bundle', async () => {
    const shareRes = await request(app)
      .post('/share')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ttlMinutes: 30 });

    const shareToken = shareRes.body.token;

    const zipRes = await request(app)
      .get(`/share/${shareToken}/zip`)
      .responseType('blob');

    expect(zipRes.status).toBe(200);
    expect(zipRes.headers['content-type']).toMatch(/application\/zip/);
    expect(zipRes.headers['content-disposition']).toMatch(/attachment; filename="MedRec_Shared_Records_/);
    expect(zipRes.body).toBeDefined();
    // Verify non-empty zip payload
    expect(zipRes.body.length).toBeGreaterThan(100);
  });

  it('should preserve more than 100 scoped records in viewing and exports, and disclose AI scope', async () => {
    const { rows } = await pool.query(
      `INSERT INTO public.medical_records (user_id, type, title, date)
       SELECT $1, 'lab', 'Large history ' || n, '2026-09-01'::date
       FROM generate_series(1, 105) AS n RETURNING id`,
      [userId]
    );
    const recordIds = rows.map((row) => row.id);
    const summarySpy = jest.spyOn(aiService, 'summarizeRecords').mockResolvedValue({
      summary: 'Records overview.', currentMedications: [], diagnoses: [], keyNotes: [],
    });
    try {
      const shareRes = await request(app).post('/share')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ttlMinutes: 60, recordIds });
      expect(shareRes.status).toBe(201);
      const shareToken = shareRes.body.token;
      const viewRes = await request(app).get(`/share/${shareToken}`);
      expect(viewRes.body.records).toHaveLength(105);
      expect(viewRes.body.records.every((record) => recordIds.includes(record.id))).toBe(true);
      const exportRes = await request(app).get(`/share/${shareToken}/export`);
      expect(exportRes.body.totalRecords).toBe(105);
      const zipRes = await request(app).get(`/share/${shareToken}/zip`).responseType('blob');
      expect(zipRes.status).toBe(200);
      const zip = await JSZip.loadAsync(zipRes.body);
      const metadata = JSON.parse(await zip.file('records_metadata.json').async('string'));
      expect(metadata.records).toHaveLength(105);

      const sharedSummary = await request(app).post(`/share/${shareToken}/summarize`);
      expect(sharedSummary.body.includedRecordCount).toBe(25);
      expect(sharedSummary.body.totalRecordCount).toBe(105);
      expect(sharedSummary.body.summary).toMatch(/latest 25 of 105 shared records/);
      const patientSummary = await request(app).post('/ai/summarize')
        .set('Authorization', `Bearer ${userToken}`).send({ recordIds });
      expect(patientSummary.body.totalRecordCount).toBe(105);
      expect(patientSummary.body.summary).toMatch(/latest 25 of 105 selected records/);
      expect(summarySpy.mock.calls.every(([records]) => records.length === 25)).toBe(true);
    } finally {
      summarySpy.mockRestore();
      await pool.query('DELETE FROM public.medical_records WHERE id = ANY($1::uuid[])', [recordIds]);
    }
  });
});
