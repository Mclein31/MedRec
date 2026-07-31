const jwt = require('jsonwebtoken');
const tokenModel = require('../models/tokenModel');

/**
 * Protects routes by requiring a valid Bearer JWT.
 * On success, attaches { id, email } to req.user.
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

    req.user = { id: payload.sub, email: payload.email };
    req.tokenJti = payload.jti;
    req.tokenExp = payload.exp;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth };
