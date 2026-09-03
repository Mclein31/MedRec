const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const fs = require('fs');
const path = require('path');

describe('Profile API Endpoints', () => {
  let token;
  let testEmail;
  const originalPassword = 'Password123';
  const updatedPassword = 'NewPassword456';

  beforeAll(async () => {
    const schemaSql = fs.readFileSync(path.join(__dirname, '../src/migrations/schema.sql'), 'utf8');
    await pool.query(schemaSql);

    testEmail = `profile_test_${Date.now()}@example.com`;
    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Test Profile User',
        email: testEmail,
        password: originalPassword,
      });
    expect(res.status).toBe(201);
    token = res.body.token;
  });

  afterAll(async () => {
    try {
      await pool.query('DELETE FROM public.users WHERE email = $1', [testEmail]);
    } catch {}
    await pool.end();
  });

  describe('GET /profile', () => {
    it('should return 401 without authorization token', async () => {
      const res = await request(app).get('/profile');
      expect(res.status).toBe(401);
    });

    it('should return default profile structure for newly registered user', async () => {
      const res = await request(app)
        .get('/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.name).toBe('Test Profile User');
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body).toHaveProperty('profile');
      expect(res.body.recordsCount).toBe(0);
      expect(res.body.activeSharesCount).toBe(0);
    });
  });

  describe('PUT /profile', () => {
    it('should update personal demographics with height and weight', async () => {
      const res = await request(app)
        .put('/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Name',
          dateOfBirth: '1995-05-15',
          biologicalSex: 'female',
          height: '175',
          weight: '68',
          phone: '+15551234567',
          address: '456 Health St, Med City',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Updated Name');
      expect(res.body.profile.dateOfBirth).toBe('1995-05-15');
      expect(res.body.profile.biologicalSex).toBe('female');
      expect(res.body.profile.height).toBe('175');
      expect(res.body.profile.weight).toBe('68');
      expect(res.body.profile.phone).toBe('+15551234567');
      expect(res.body.profile.address).toBe('456 Health St, Med City');
    });

    it('should update medical ID and preserve previously saved demographic data (Partial Upsert Isolation)', async () => {
      const res = await request(app)
        .put('/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bloodType: 'O+',
          allergies: 'Penicillin, Peanuts',
          medicalConditions: 'Mild Asthma',
          medicationsSummary: 'Albuterol Inhaler',
          emergencyContactName: 'Jane Doe',
          emergencyContactRelationship: 'Spouse',
          emergencyContactPhone: '+15559876543',
          organDonor: true,
        });

      expect(res.status).toBe(200);
      // New medical fields updated
      expect(res.body.profile.bloodType).toBe('O+');
      expect(res.body.profile.allergies).toBe('Penicillin, Peanuts');
      expect(res.body.profile.medicalConditions).toBe('Mild Asthma');
      expect(res.body.profile.medicationsSummary).toBe('Albuterol Inhaler');
      expect(res.body.profile.emergencyContactName).toBe('Jane Doe');
      expect(res.body.profile.emergencyContactRelationship).toBe('Spouse');
      expect(res.body.profile.emergencyContactPhone).toBe('+15559876543');
      expect(res.body.profile.organDonor).toBe(true);

      // Previous demographic fields are completely preserved
      expect(res.body.user.name).toBe('Updated Name');
      expect(res.body.profile.dateOfBirth).toBe('1995-05-15');
      expect(res.body.profile.biologicalSex).toBe('female');
      expect(res.body.profile.height).toBe('175');
      expect(res.body.profile.weight).toBe('68');
      expect(res.body.profile.phone).toBe('+15551234567');
      expect(res.body.profile.address).toBe('456 Health St, Med City');
    });

    it('should update demographics again and preserve medical ID data', async () => {
      const res = await request(app)
        .put('/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          address: '789 Wellness Blvd, Suite 200',
        });

      expect(res.status).toBe(200);
      expect(res.body.profile.address).toBe('789 Wellness Blvd, Suite 200');

      // Medical data untouched
      expect(res.body.profile.bloodType).toBe('O+');
      expect(res.body.profile.allergies).toBe('Penicillin, Peanuts');
      expect(res.body.profile.organDonor).toBe(true);
      expect(res.body.profile.height).toBe('175');
    });

    it('should update and persist avatarUrl without wiping other fields', async () => {
      const sampleAvatar = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...';
      const res = await request(app)
        .put('/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ avatarUrl: sampleAvatar });

      expect(res.status).toBe(200);
      expect(res.body.profile.avatarUrl).toBe(sampleAvatar);
      expect(res.body.profile.bloodType).toBe('O+');
      expect(res.body.profile.allergies).toBe('Penicillin, Peanuts');

      const getRes = await request(app)
        .get('/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.profile.avatarUrl).toBe(sampleAvatar);
      expect(getRes.body.profile.bloodType).toBe('O+');
    });

    it('should reject invalid biological sex', async () => {
      const res = await request(app)
        .put('/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ biologicalSex: 'invalid_sex' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid biological sex/);
    });

    it('should reject invalid blood type', async () => {
      const res = await request(app)
        .put('/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ bloodType: 'X-' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid blood type/);
    });

    it('should update avatarUrl with storage key and resolve to signed URL or preserve valid data URI', async () => {
      const res = await request(app)
        .put('/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          avatarUrl: 'avatars/user-profile-pic.jpg',
        });

      expect(res.status).toBe(200);
      expect(res.body.profile.avatarUrl).toBeDefined();
      expect(typeof res.body.profile.avatarUrl).toBe('string');
      // Should either be signed URL (http/https) or valid key/mock
      expect(res.body.profile.avatarUrl.length).toBeGreaterThan(0);

      const getRes = await request(app)
        .get('/profile')
        .set('Authorization', `Bearer ${token}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.profile.avatarUrl).toBeDefined();
    });
  });

  describe('PUT /profile/password', () => {
    it('should reject weak new password (no uppercase or numbers)', async () => {
      const res = await request(app)
        .put('/profile/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          newPassword: 'short',
        });

      expect(res.status).toBe(400);
    });

    it('should successfully change password with valid format', async () => {
      const res = await request(app)
        .put('/profile/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: originalPassword,
          newPassword: updatedPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Password updated successfully/i);
    });
  });

  describe('DELETE /profile', () => {
    it('should delete user account and return 204', async () => {
      // Login with new password to get fresh token after password change
      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: testEmail,
          password: updatedPassword,
        });
      expect(loginRes.status).toBe(200);
      const activeToken = loginRes.body.token;

      const res = await request(app)
        .delete('/profile')
        .set('Authorization', `Bearer ${activeToken}`);

      expect(res.status).toBe(204);

      // Subsequent profile query should return 401/404
      const checkRes = await request(app)
        .get('/profile')
        .set('Authorization', `Bearer ${activeToken}`);
      expect([401, 404]).toContain(checkRes.status);
    });
  });
});
