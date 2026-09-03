const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

describe('Security & Threat Hardening Test Suite', () => {
  let userAToken;
  let userAEmail;
  let userAId;

  let userBToken;
  let userBEmail;
  let userBId;

  let userARecordId;
  let userBRecordId;

  beforeAll(async () => {
    const schemaSql = fs.readFileSync(path.join(__dirname, '../src/migrations/schema.sql'), 'utf8');
    await pool.query(schemaSql);

    userAEmail = `sec_user_a_${Date.now()}@example.com`;
    userBEmail = `sec_user_b_${Date.now()}@example.com`;

    // Create User A
    const resA = await request(app)
      .post('/auth/register')
      .send({
        name: 'Security User A',
        email: userAEmail,
        password: 'Password123',
      });
    expect(resA.status).toBe(201);
    userAToken = resA.body.token;
    userAId = resA.body.user.id;

    // Create User B
    const resB = await request(app)
      .post('/auth/register')
      .send({
        name: 'Security User B',
        email: userBEmail,
        password: 'Password456',
      });
    expect(resB.status).toBe(201);
    userBToken = resB.body.token;
    userBId = resB.body.user.id;

    // Create record for User A
    const recordResA = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        type: 'diagnosis',
        title: 'User A Confidential Diagnosis',
        description: 'Private medical evaluation',
        date: '2026-09-01',
      });
    expect(recordResA.status).toBe(201);
    userARecordId = recordResA.body.record.id;

    // Create record for User B
    const recordResB = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        type: 'lab',
        title: 'User B Confidential Lab',
        description: 'Private lab results',
        date: '2026-09-02',
      });
    expect(recordResB.status).toBe(201);
    userBRecordId = recordResB.body.record.id;
  });

  afterAll(async () => {
    try {
      await pool.query('DELETE FROM public.users WHERE email IN ($1, $2)', [userAEmail, userBEmail]);
    } catch {}
    await pool.end();
  });

  describe('SEC-01: Cross-User Record Isolation (IDOR Defense)', () => {
    it('User B must NOT be able to view User A record via GET /records/:id', async () => {
      const res = await request(app)
        .get(`/records/${userARecordId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });

    it('User B must NOT be able to delete User A record via DELETE /records/:id', async () => {
      const res = await request(app)
        .delete(`/records/${userARecordId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);

      // Verify User A record still exists
      const verifyRes = await request(app)
        .get(`/records/${userARecordId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(verifyRes.status).toBe(200);
    });

    it('User A records list must NOT contain User B records', async () => {
      const res = await request(app)
        .get('/records')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.records.map((r) => r.id);
      expect(ids).toContain(userARecordId);
      expect(ids).not.toContain(userBRecordId);
    });
  });

  describe('SEC-02: Doctor Share Token IDOR Defense', () => {
    it('User B cannot create a share token including User A record ID', async () => {
      const res = await request(app)
        .post('/share')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          ttlMinutes: 60,
          recordIds: [userARecordId],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/do not belong to you/i);
    });

    it('User B cannot revoke User A share session', async () => {
      // User A creates share session
      const shareRes = await request(app)
        .post('/share')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ ttlMinutes: 60 });

      const listRes = await request(app)
        .get('/share')
        .set('Authorization', `Bearer ${userAToken}`);
      const shareA = listRes.body.shares.find((s) => s.token === shareRes.body.token);

      // User B attempts to revoke User A's share
      const revokeRes = await request(app)
        .delete(`/share/${shareA.id}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(revokeRes.status).toBe(404);
    });
  });

  describe('SEC-03: Storage Isolation Defense', () => {
    it('User B cannot request signed download URL for User A storage files', async () => {
      const userAPath = `${userAId}/private_scan.jpg`;
      const res = await request(app)
        .get(`/storage/download-url?bucket=medical-records&filePath=${userAPath}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Access denied/i);
    });
  });

  describe('SEC-04: JWT Tampering & Malformed Token Defense', () => {
    it('Rejects requests with malformed Authorization header', async () => {
      const res = await request(app)
        .get('/records')
        .set('Authorization', 'InvalidFormatHeader');

      expect(res.status).toBe(401);
    });

    it('Rejects requests with forged/tampered JWT signature', async () => {
      const forgedToken = jwt.sign(
        { sub: userAId, email: userAEmail },
        'wrong_attacker_secret_key'
      );

      const res = await request(app)
        .get('/records')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
    });
  });
});
