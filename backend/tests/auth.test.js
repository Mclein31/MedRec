const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const fs = require('fs');
const path = require('path');

describe('Auth API Endpoints', () => {
  let testEmail;
  const testPassword = 'Password123';
  let token;
  let userId;

  beforeAll(async () => {
    const schemaSql = fs.readFileSync(path.join(__dirname, '../src/migrations/schema.sql'), 'utf8');
    await pool.query(schemaSql);
    testEmail = `auth_test_${Date.now()}@example.com`;
  });

  afterAll(async () => {
    try {
      await pool.query('DELETE FROM public.users WHERE email = $1', [testEmail]);
    } catch {}
    await pool.end();
  });

  it('POST /auth/register should register a new user and return token + profile', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Auth Test User',
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.name).toBe('Auth Test User');
    token = res.body.token;
    userId = res.body.user.id;
  });

  it('POST /auth/register should reject duplicate email registration', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Duplicate User',
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('POST /auth/register should reject invalid email format', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Invalid Email',
        email: 'not-an-email',
        password: testPassword,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid email format/i);
  });

  it('POST /auth/register should reject password shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Short Password',
        email: `short_${Date.now()}@example.com`,
        password: 'Pass1',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 8 characters/i);
  });

  it('POST /auth/login should authenticate user with correct credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(testEmail);
  });

  it('POST /auth/login should reject incorrect password with 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: testEmail,
        password: 'WrongPassword999',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid email or password/i);
  });

  it('GET /auth/me should return authenticated user profile', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(userId);
    expect(res.body.user.email).toBe(testEmail);
  });

  it('POST /auth/forgot-password should return standard confirmation message', async () => {
    const res = await request(app)
      .post('/auth/forgot-password')
      .send({
        email: testEmail,
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/If an account with that email exists/i);
  });

  it('POST /auth/logout should return 204 No Content', async () => {
    const res = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  describe('Google OAuth (/auth/google)', () => {
    const { OAuth2Client } = require('google-auth-library');
    let verifySpy;
    let googleNewEmail;
    let sharedGoogleEmail = `google_shared_${Date.now()}@example.com`;
    let sharedGoogleSub = `sub_shared_${Date.now()}`;

    afterEach(() => {
      if (verifySpy) {
        verifySpy.mockRestore();
      }
    });

    afterAll(async () => {
      try {
        await pool.query("DELETE FROM public.users WHERE email LIKE 'google_%' OR email LIKE 'link_%'");
      } catch {}
    });

    it('should reject requests missing idToken with 400', async () => {
      const res = await request(app)
        .post('/auth/google')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/idToken is required/i);
    });

    it('should reject invalid or expired Google tokens with 401', async () => {
      verifySpy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockRejectedValue(new Error('Invalid token'));

      const res = await request(app)
        .post('/auth/google')
        .send({ idToken: 'invalid.token.here' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Invalid Google identity token/i);
    });

    it('should reject Google tokens where email is not verified with 400', async () => {
      verifySpy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          sub: `unverified_${Date.now()}`,
          email: `unverified_${Date.now()}@example.com`,
          email_verified: false,
          name: 'Unverified Google User',
        }),
      });

      const res = await request(app)
        .post('/auth/google')
        .send({ idToken: 'unverified.token' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/email address is not verified/i);
    });

    it('should register a new user via Google, populate profile, and return valid JWT', async () => {
      verifySpy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          sub: sharedGoogleSub,
          email: sharedGoogleEmail,
          email_verified: true,
          name: 'New Google Patient',
          picture: 'https://lh3.googleusercontent.com/avatar.jpg',
        }),
      });

      const res = await request(app)
        .post('/auth/google')
        .send({ idToken: 'valid.new.user.token' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(sharedGoogleEmail);
      expect(res.body.user.name).toBe('New Google Patient');
      expect(res.body.user.avatarUrl).toBe('https://lh3.googleusercontent.com/avatar.jpg');

      // Verify user in database
      const { rows } = await pool.query('SELECT * FROM public.users WHERE email = $1', [sharedGoogleEmail]);
      expect(rows).toHaveLength(1);
      expect(rows[0].google_id).toBe(sharedGoogleSub);
      expect(rows[0].auth_provider).toBe('google');
      expect(rows[0].password_hash).toBeNull();

      // Verify profile was automatically provisioned
      const profileRes = await pool.query('SELECT * FROM public.user_profiles WHERE user_id = $1', [rows[0].id]);
      expect(profileRes.rows).toHaveLength(1);
      expect(profileRes.rows[0].avatar_url).toBe('https://lh3.googleusercontent.com/avatar.jpg');
    });

    it('should authenticate existing Google user and return valid session token', async () => {
      verifySpy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          sub: sharedGoogleSub,
          email: sharedGoogleEmail,
          email_verified: true,
          name: 'New Google Patient',
        }),
      });

      const res = await request(app)
        .post('/auth/google')
        .send({ idToken: 'existing.google.token' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(sharedGoogleEmail);
    });

    it('POST /auth/login for Google-only account (NULL password_hash) should return 401 instead of 500', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: sharedGoogleEmail,
          password: 'AttemptPassword123',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/registered using Google Sign-In/i);
    });

    it('should link Google ID to existing email/password account, invalidate prior sessions, and keep password working', async () => {
      const linkEmail = `link_test_${Date.now()}@example.com`;
      const linkPassword = 'Password123';
      const linkGoogleSub = `sub_link_${Date.now()}`;

      // Register standard account
      const regRes = await request(app)
        .post('/auth/register')
        .send({
          name: 'Link User',
          email: linkEmail,
          password: linkPassword,
        });
      expect(regRes.status).toBe(201);
      const priorToken = regRes.body.token;

      // Link via Google login
      verifySpy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          sub: linkGoogleSub,
          email: linkEmail,
          email_verified: true,
          name: 'Link User via Google',
        }),
      });

      const googleRes = await request(app)
        .post('/auth/google')
        .send({ idToken: 'link.token' });

      expect(googleRes.status).toBe(200);
      expect(googleRes.body).toHaveProperty('token');

      // Check user record
      const { rows } = await pool.query('SELECT * FROM public.users WHERE email = $1', [linkEmail]);
      expect(rows[0].google_id).toBe(linkGoogleSub);
      expect(rows[0].password_hash).not.toBeNull();

      // Check security alert notification was generated
      const notifRes = await pool.query(
        "SELECT * FROM public.notifications WHERE user_id = $1 AND type = 'security_alert'",
        [rows[0].id]
      );
      expect(notifRes.rows.length).toBeGreaterThan(0);

      // Verify prior session token is now invalid (token_version was incremented)
      const priorAccessRes = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${priorToken}`);
      expect(priorAccessRes.status).toBe(401);

      // Verify standard email/password login still works with original password
      const pwLoginRes = await request(app)
        .post('/auth/login')
        .send({
          email: linkEmail,
          password: linkPassword,
        });
      expect(pwLoginRes.status).toBe(200);

      await pool.query('DELETE FROM public.users WHERE id = $1', [rows[0].id]);
    });
  });
});
