const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const crypto = require('crypto');

describe('Security & Abuse Hardening Test Suite', () => {
  let userAToken;
  let userAEmail;
  let userAId;

  let userBToken;
  let userBEmail;
  let userBId;

  let userARecordId;

  beforeAll(async () => {
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

    // Create a record for User A
    const recordRes = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        type: 'diagnosis',
        title: 'User A Confidential Diagnosis',
        description: 'Private medical evaluation',
        date: '2026-09-01',
      });
    expect(recordRes.status).toBe(201);
    userARecordId = recordRes.body.record.id;
  });

  afterAll(async () => {
    try {
      await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [userAEmail, userBEmail]);
    } catch {}
    await pool.end();
  });

  describe('SEC-R01: Account Lockout Denial-of-Service Defense (No Global DoS)', () => {
    it('Attacker submitting repeated bad passwords should NOT block legitimate user with correct password', async () => {
      const victimEmail = `victim_lockout_${Date.now()}@example.com`;
      const validPassword = 'SecurePassword1!';

      const reg = await request(app)
        .post('/auth/register')
        .send({
          name: 'Victim Account',
          email: victimEmail,
          password: validPassword,
        });
      expect(reg.status).toBe(201);

      // Attacker attempts 5 wrong passwords from an adversarial script/IP
      for (let i = 0; i < 5; i++) {
        const failRes = await request(app)
          .post('/auth/login')
          .send({ email: victimEmail, password: 'AttackerWrongPassword!' });
        expect(failRes.status).toBe(401);
      }

      // Legitimate user logs in with valid password -> MUST succeed immediately with HTTP 200 (Immune to DoS)
      const legitimateLoginRes = await request(app)
        .post('/auth/login')
        .send({ email: victimEmail, password: validPassword });

      expect(legitimateLoginRes.status).toBe(200);
      expect(legitimateLoginRes.body).toHaveProperty('token');
      expect(legitimateLoginRes.body.user.email).toBe(victimEmail);

      // Cleanup
      await pool.query('DELETE FROM users WHERE email = $1', [victimEmail]);
    });
  });

  describe('SEC-R02: Password Reset Token Response Sanitization (No Token Leaks)', () => {
    it('POST /auth/forgot-password must NEVER return resetTokenPreview in any environment', async () => {
      const resetEmail = `leak_test_${Date.now()}@example.com`;
      const reg = await request(app)
        .post('/auth/register')
        .send({
          name: 'Reset Leak Target',
          email: resetEmail,
          password: 'OriginalPassword1',
        });
      expect(reg.status).toBe(201);

      // Trigger forgot-password
      const forgotRes = await request(app)
        .post('/auth/forgot-password')
        .send({ email: resetEmail });

      expect(forgotRes.status).toBe(200);
      expect(forgotRes.body.message).toMatch(/If an account with that email exists/i);
      // Security Invariant: resetTokenPreview must be strictly undefined
      expect(forgotRes.body.resetTokenPreview).toBeUndefined();

      // Verify that token hash was securely persisted in database
      const dbResult = await pool.query(
        'SELECT token_hash FROM password_reset_tokens WHERE user_id = $1 AND used = FALSE',
        [reg.body.user.id]
      );
      expect(dbResult.rows.length).toBe(1);
      expect(dbResult.rows[0].token_hash).toHaveLength(64); // SHA-256 hash length

      // Cleanup
      await pool.query('DELETE FROM users WHERE email = $1', [resetEmail]);
    });

    it('Password reset functions correctly when supplied with a valid single-use token', async () => {
      const resetEmail = `reset_exec_${Date.now()}@example.com`;
      const reg = await request(app)
        .post('/auth/register')
        .send({
          name: 'Reset Execution Target',
          email: resetEmail,
          password: 'OriginalPassword1',
        });
      expect(reg.status).toBe(201);
      const initialToken = reg.body.token;

      // Seed a known test token in DB
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await pool.query(
        'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
        [reg.body.user.id, tokenHash, expiresAt]
      );

      // Execute reset with raw token
      const resetRes = await request(app)
        .post('/auth/reset-password')
        .send({
          token: rawToken,
          newPassword: 'BrandNewPassword2',
        });
      expect(resetRes.status).toBe(200);
      expect(resetRes.body.message).toMatch(/Password has been reset successfully/i);

      // Old JWT session must be invalidated (SEC-04)
      const staleRes = await request(app)
        .get('/profile')
        .set('Authorization', `Bearer ${initialToken}`);
      expect(staleRes.status).toBe(401);

      // Replay of the same reset token must be rejected (single-use)
      const replayRes = await request(app)
        .post('/auth/reset-password')
        .send({
          token: rawToken,
          newPassword: 'AnotherPassword3',
        });
      expect(replayRes.status).toBe(400);

      // Cleanup
      await pool.query('DELETE FROM users WHERE email = $1', [resetEmail]);
    });
  });

  describe('SEC-R04: Atomic Record Ownership in Sharing (Beyond 50 Pagination Limit)', () => {
    it('User with >50 records can share record #60 without false IDOR rejection', async () => {
      const bulkEmail = `bulk_share_${Date.now()}@example.com`;
      const reg = await request(app)
        .post('/auth/register')
        .send({
          name: 'Bulk Records User',
          email: bulkEmail,
          password: 'Password123',
        });
      expect(reg.status).toBe(201);
      const bulkToken = reg.body.token;
      const bulkUserId = reg.body.user.id;

      // Insert 65 records in database
      const recordIds = [];
      for (let i = 1; i <= 65; i++) {
        const { rows } = await pool.query(
          `INSERT INTO medical_records (user_id, type, title, description, date)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [bulkUserId, 'prescription', `Prescription Item #${i}`, `Medication details #${i}`, '2026-09-01']
        );
        recordIds.push(rows[0].id);
      }
      expect(recordIds.length).toBe(65);

      // Target record #60 (which is beyond default limit of 50 in getAllForUser)
      const targetRecordId = recordIds[59]; // 0-indexed #60

      // Create share session referencing record #60
      const shareRes = await request(app)
        .post('/share')
        .set('Authorization', `Bearer ${bulkToken}`)
        .send({
          ttlMinutes: 60,
          recordIds: [targetRecordId],
        });

      expect(shareRes.status).toBe(201);
      expect(shareRes.body).toHaveProperty('token');
      expect(shareRes.body.recordIds).toContain(targetRecordId);

      // Verify the shared records can be retrieved via the doctor access endpoint
      const accessRes = await request(app)
        .get(`/share/${shareRes.body.token}`);
      expect(accessRes.status).toBe(200);
      expect(accessRes.body.records.length).toBe(1);
      expect(accessRes.body.records[0].id).toBe(targetRecordId);

      // Cleanup
      await pool.query('DELETE FROM users WHERE email = $1', [bulkEmail]);
    });
  });

  describe('SEC-R05 & SEC-01: AI Subsystem Protection & Input Guardrails', () => {
    it('POST /ai/explain should reject inputs exceeding 2,000 characters with 400', async () => {
      const hugeText = 'Medical term '.repeat(300); // > 3,000 chars
      const res = await request(app)
        .post('/ai/explain')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ text: hugeText });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/exceeds the maximum allowable limit/i);
    });

    it('POST /ai/organize should reject inputs exceeding 2,000 characters with 400', async () => {
      const hugeText = 'Clinical document text '.repeat(200);
      const res = await request(app)
        .post('/ai/organize')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ text: hugeText });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/exceeds the maximum allowable limit/i);
    });

    it('POST /ai/explain should reject empty or non-string body with 400', async () => {
      const res = await request(app)
        .post('/ai/explain')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ text: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Valid text content is required/i);
    });
  });

  describe('SEC-03: Database Pagination Bounds', () => {
    it('GET /records should accept limit and offset parameters and cap at max 100', async () => {
      const res = await request(app)
        .get('/records?limit=10&offset=0')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.records)).toBe(true);
    });

    it('GET /notifications should accept limit and offset parameters', async () => {
      const res = await request(app)
        .get('/notifications?limit=5&offset=0')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.notifications)).toBe(true);
    });
  });

  describe('SEC-04: Session Invalidation on Password Update', () => {
    it('Updating password should invalidate previous JWT sessions across devices', async () => {
      const activeTokenBefore = userAToken;

      // Update password for User A
      const changeRes = await request(app)
        .put('/profile/password')
        .set('Authorization', `Bearer ${activeTokenBefore}`)
        .send({
          currentPassword: 'Password123',
          newPassword: 'NewPassword999',
        });
      expect(changeRes.status).toBe(200);

      // Old token should now be rejected with 401
      const staleTokenRes = await request(app)
        .get('/records')
        .set('Authorization', `Bearer ${activeTokenBefore}`);
      expect(staleTokenRes.status).toBe(401);
      expect(staleTokenRes.body.error).toMatch(/Session invalidated/i);

      // Login with new password should succeed
      const newLoginRes = await request(app)
        .post('/auth/login')
        .send({
          email: userAEmail,
          password: 'NewPassword999',
        });
      expect(newLoginRes.status).toBe(200);
      userAToken = newLoginRes.body.token;
    });
  });

  describe('IDOR & Multi-Tenancy Authorization Verification', () => {
    it('User B should NOT be able to read User A record via GET /records/:id', async () => {
      const res = await request(app)
        .get(`/records/${userARecordId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });

    it('User B should NOT be able to delete User A record via DELETE /records/:id', async () => {
      const res = await request(app)
        .delete(`/records/${userARecordId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });

    it('User B should NOT be able to create a share session referencing User A record ID', async () => {
      const res = await request(app)
        .post('/share')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          ttlMinutes: 30,
          recordIds: [userARecordId],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/do not belong to you/i);
    });
  });
});
