const pool = require("../config/db");

async function createShare({
  userId,
  token,
  expiresAt,
  allowedTypes,
  recordIds,
}) {
  const { rows } = await pool.query(
    `INSERT INTO shared_access (user_id, token, expires_at, allowed_types, record_ids)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, token, expires_at, allowed_types, record_ids, created_at`,
    [userId, token, expiresAt, allowedTypes || null, recordIds || null],
  );
  return rows[0];
}

async function findActiveByToken(token) {
  const { rows } = await pool.query(
    `SELECT * FROM shared_access
     WHERE token = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [token],
  );
  return rows[0] || null;
}

async function revoke(userId, shareId) {
  const { rowCount } = await pool.query(
    `UPDATE shared_access SET revoked_at = now()
     WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
    [shareId, userId],
  );
  return rowCount > 0;
}

async function listForUser(userId) {
  const { rows } = await pool.query(
    `SELECT id, token, expires_at, allowed_types, record_ids, revoked_at, created_at
     FROM shared_access WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return rows;
}

module.exports = { createShare, findActiveByToken, revoke, listForUser };
