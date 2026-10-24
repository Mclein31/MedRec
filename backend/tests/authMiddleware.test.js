jest.mock('../src/models/userModel', () => ({ findById: jest.fn() }));

const jwt = require('jsonwebtoken');
const userModel = require('../src/models/userModel');
const { requireAuth } = require('../src/middleware/authMiddleware');
const { JWT_SECRET } = require('../src/config/env');

describe('Session expiry classification', () => {
  afterEach(() => { jest.restoreAllMocks(); userModel.findById.mockReset(); });

  function response() {
    const res = { status: jest.fn(), json: jest.fn() };
    res.status.mockReturnValue(res);
    return res;
  }

  it('returns explicit session-expiry code for an invalid JWT', async () => {
    const res = response();
    const next = jest.fn();
    await requireAuth({ headers: { authorization: 'Bearer invalid' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'SESSION_EXPIRED' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('preserves a valid session when the database is temporarily unavailable', async () => {
    jest.spyOn(jwt, 'verify').mockReturnValue({ sub: 'patient', token_version: 1 });
    const databaseError = new Error('Database unavailable');
    userModel.findById.mockRejectedValueOnce(databaseError);
    const res = response();
    const next = jest.fn();
    await requireAuth({ headers: { authorization: 'Bearer valid' } }, res, next);
    expect(next).toHaveBeenCalledWith(databaseError);
    expect(res.status).not.toHaveBeenCalled();
  });

  it.each([undefined, 0, -1, 1.5, '1', null])('rejects a missing or invalid token-version claim %# before any database lookup', async tokenVersion => {
    jest.spyOn(jwt, 'verify').mockReturnValue({ sub: 'patient', token_version: tokenVersion });
    const res = response();
    const next = jest.fn();
    await requireAuth({ headers: { authorization: 'Bearer token' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'SESSION_EXPIRED' }));
    expect(userModel.findById).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an unexpected signing algorithm even with the correct private secret', async () => {
    const token = jwt.sign({ sub: 'patient', token_version: 1 }, JWT_SECRET, { algorithm: 'HS384' });
    const res = response();
    await requireAuth({ headers: { authorization: `Bearer ${token}` } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(userModel.findById).not.toHaveBeenCalled();
  });
});
