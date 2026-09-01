const jwt = require('jsonwebtoken');
const tokenModel = require('../models/tokenModel');
const userModel = require('../models/userModel');

/**
 * Protects routes by requiring a valid Bearer JWT.
 * On success, attaches { id, email } to req.user.
 * Enforces JTI revocation and token_version session invalidation (e.g. on password change/reset).
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const revoked = await tokenModel.isRevoked(payload.jti);
    if (revoked) {
      return res.status(401).json({ error: 'This token has been revoked. Please log in again.' });
    }

    // Check user existence and token_version validity
    const user = await userModel.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'User account not found or deleted' });
    }

    // If the token version is older than the current user token_version (e.g. after password change/reset)
    if (payload.tokenVersion !== undefined && payload.tokenVersion < user.token_version) {
      return res.status(401).json({ error: 'Session invalidated due to password change or security update. Please log in again.' });
    }

    req.user = { id: user.id, email: user.email, name: user.name };
    req.tokenJti = payload.jti;
    req.tokenExp = payload.exp;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth };
