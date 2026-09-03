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
});
