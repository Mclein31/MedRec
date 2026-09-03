const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET || 'medrec-production-jwt-secret-at-least-32-chars-long';

/**
 * Backend-owned JWT Authentication Middleware.
 * Strictly verifies cryptographic signatures, token expiration, and database token versions.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    if (!payload || !payload.sub) {
      return res.status(401).json({ error: 'Invalid or expired session token' });
    }

    // Verify user existence and token version to invalidate revoked/expired sessions
    const user = await userModel.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'User session has been revoked or user not found' });
    }

    if (payload.token_version !== undefined && user.token_version !== undefined && payload.token_version !== user.token_version) {
      return res.status(401).json({ error: 'Session token has been invalidated. Please log in again.' });
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
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
}

module.exports = { requireAuth };
