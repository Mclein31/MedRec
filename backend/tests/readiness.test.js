const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const { errorHandler } = require('../src/middleware/errorHandler');

afterEach(() => jest.restoreAllMocks());
afterAll(() => pool.end());

describe('Database availability', () => {
  it.each(['/ready', '/api/ready'])('checks the actual database at %s', async path => {
    const query = jest.spyOn(pool, 'query').mockResolvedValue({ rows: [{ '?column?': 1 }] });
    const response = await request(app).get(path);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ready', database: 'available' });
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('reports 503 readiness without disclosing database connection details', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(pool, 'query').mockRejectedValue(Object.assign(new Error('private-host:5432 credentials'), { code: 'ECONNREFUSED' }));
    const response = await request(app).get('/api/ready');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'unavailable', database: 'unavailable', code: 'DATABASE_UNAVAILABLE' });
  });

  it.each([
    Object.assign(new Error('private database'), { code: 'ECONNREFUSED' }),
    Object.assign(new Error('private database'), { code: 'ETIMEDOUT' }),
    new Error('Query read timeout'),
    new Error('timeout exceeded when trying to connect'),
    new AggregateError([Object.assign(new Error('private host'), { code: 'ECONNREFUSED' })]),
  ])('returns a retryable service error for database failures', error => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(error, {}, response, () => {});
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({ error: expect.stringMatching(/temporarily unavailable/), code: 'DATABASE_UNAVAILABLE' });
  });

  it('keeps unexpected programming errors distinct from database outages', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(new TypeError('private stack trace'), {}, response, () => {});
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});
