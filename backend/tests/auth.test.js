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
    expect(res.body.code).toBe('EMAIL_ALREADY_EXISTS');
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

  it('returns the same email conflict code when simultaneous signup loses the unique insert race', async () => {
    const userModel = require('../src/models/userModel');
    const create = jest.spyOn(userModel, 'createUser').mockRejectedValueOnce({ code: '23505', constraint: 'users_email_key' });
    try {
      const res = await request(app).post('/auth/register').send({
        name: 'Concurrent Signup', email: `race_${Date.now()}@example.invalid`, password: testPassword,
      });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('EMAIL_ALREADY_EXISTS');
    } finally { create.mockRestore(); }
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

  it('normalizes surrounding whitespace and email case before authentication', async () => {
    const res = await request(app).post('/auth/login')
      .send({ email: `  ${testEmail.toUpperCase()}  `, password: testPassword });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testEmail);
  });

  it.each([
    { name: ' ', email: 'invalid-input@example.com', password: 'Password123' },
    { name: {}, email: 'invalid-input@example.com', password: 'Password123' },
    { name: 'Patient', email: {}, password: 'Password123' },
    { name: 'Patient', email: 'invalid-input@example.com', password: {} },
    { name: 'a'.repeat(121), email: 'invalid-input@example.com', password: 'Password123' },
    { name: 'Patient', email: `${'a'.repeat(256)}@example.com`, password: 'Password123' },
    { name: 'Patient', email: 'invalid-input@example.com', password: `Password1${'a'.repeat(64)}` },
    { name: 'Patient', email: 'invalid-input@example.com', password: `Password1${'é'.repeat(32)}` },
  ])('rejects malformed or bcrypt-truncated registration input %# with 400', async (body) => {
    const res = await request(app).post('/auth/register').send(body);
    expect(res.status).toBe(400);
  });

  it.each([{ email: {}, password: 'Password123' }, { email: 'patient@example.com', password: {} }, { email: 'patient@example.com', password: 'a'.repeat(4097) }])('rejects malformed or excessive login input %# with 400', async (body) => {
    const res = await request(app).post('/auth/login').send(body);
    expect(res.status).toBe(400);
  });

  it('accepts a 72-byte registration password without silently truncating it', async () => {
    const email = `boundary_${Date.now()}@example.com`;
    try {
      const password = `Password1${'a'.repeat(63)}`;
      const res = await request(app).post('/auth/register').send({ name: 'Boundary Patient', email, password });
      expect(res.status).toBe(201);
      const loginRes = await request(app).post('/auth/login').send({ email, password });
      expect(loginRes.status).toBe(200);
    } finally {
      await pool.query('DELETE FROM public.users WHERE email = $1', [email]);
    }
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

  it('POST /auth/forgot-password should honestly report unavailable recovery', async () => {
    const res = await request(app)
      .post('/auth/forgot-password')
      .send({
        email: testEmail,
      });

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/not available yet/i);
  });

  it('POST /auth/reset-password should not claim to change a password without a valid recovery flow', async () => {
    const res = await request(app).post('/auth/reset-password')
      .send({ token: 'fake-token', newPassword: 'ChangedPassword123' });
    expect(res.status).toBe(503);
    const loginRes = await request(app).post('/auth/login')
      .send({ email: testEmail, password: testPassword });
    expect(loginRes.status).toBe(200);
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
    const previousAudience = process.env.GOOGLE_WEB_CLIENT_ID;
    beforeAll(() => { process.env.GOOGLE_WEB_CLIENT_ID = 'medrec-test-client.apps.googleusercontent.com'; });

    afterEach(() => {
      if (verifySpy) {
        verifySpy.mockRestore();
      }
    });

    afterAll(async () => {
      if (previousAudience === undefined) delete process.env.GOOGLE_WEB_CLIENT_ID;
      else process.env.GOOGLE_WEB_CLIENT_ID = previousAudience;
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

    it('should return 503 before verifying a Google token when no client audiences are configured', async () => {
      const audienceKeys = ['GOOGLE_WEB_CLIENT_ID', 'GOOGLE_CLIENT_ID_WEB', 'GOOGLE_CLIENT_ID_IOS', 'GOOGLE_CLIENT_ID_ANDROID'];
      const previous = audienceKeys.map(key => [key, process.env[key]]);
      audienceKeys.forEach(key => delete process.env[key]);
      verifySpy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken');
      try {
        const res = await request(app).post('/auth/google').send({ idToken: 'test.token' });
        expect(res.status).toBe(503);
        expect(res.body.error).toMatch(/not configured/);
        expect(verifySpy).not.toHaveBeenCalled();
      } finally {
        previous.forEach(([key, value]) => { if (value === undefined) delete process.env[key]; else process.env[key] = value; });
      }
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

      expect(verifySpy).toHaveBeenCalledWith(expect.objectContaining({
        idToken: 'valid.new.user.token',
        audience: expect.arrayContaining(['medrec-test-client.apps.googleusercontent.com']),
      }));
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
