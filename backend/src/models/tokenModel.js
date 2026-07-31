const pool = require('../config/db');

async function revokeToken({ jti, expiresAt }) {
  await pool.query(
    `INSERT INTO revoked_tokens (jti, expires_at) VALUES ($1, $2)
     ON CONFLICT (jti) DO NOTHING`,
    [jti, expiresAt]
  );
}

async function isRevoked(jti) {
  await pool.query(`DELETE FROM revoked_tokens WHERE expires_at < now()`);

  const { rows } = await pool.query(
    `SELECT 1 FROM revoked_tokens WHERE jti = $1`,
    [jti]
  );
  return rows.length > 0;
}

module.exports = { revokeToken, isRevoked };