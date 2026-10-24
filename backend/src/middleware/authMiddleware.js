const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const { JWT_SECRET } = require('../config/env');

/**
 * Backend-owned JWT Authentication Middleware.
 * Strictly verifies cryptographic signatures, token expiration, and database token versions.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header', code: 'SESSION_EXPIRED' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

    if (!payload || !payload.sub || !Number.isInteger(payload.token_version) || payload.token_version < 1) {
      return res.status(401).json({ error: 'Invalid or expired session token', code: 'SESSION_EXPIRED' });
    }

    // Verify user existence and token version to invalidate revoked/expired sessions
    const user = await userModel.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'User session has been revoked or user not found', code: 'SESSION_EXPIRED' });
    }

    if (payload.token_version !== user.token_version) {
      return res.status(401).json({ error: 'Session token has been invalidated. Please log in again.', code: 'SESSION_EXPIRED' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'patient',
    };
    req.token = token;

    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError || err instanceof jwt.NotBeforeError) {
      return res.status(401).json({ error: 'Invalid or expired session token', code: 'SESSION_EXPIRED' });
    }
    // Database/service failures do not mean the patient's credentials expired.
    next(err);
  }
}

module.exports = { requireAuth };
