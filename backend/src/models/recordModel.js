const pool = require('../config/db');

const RECORD_TYPES = [
  'consultation',
  'diagnosis',
  'lab',
  'prescription',
  'medication',
  'appointment',
  'other',
];

async function createRecord({ userId, type, title, description, date, attachmentUrl, attachment_url }) {
  const finalAttachment = attachment_url !== undefined ? attachment_url : (attachmentUrl || null);
  const { rows } = await pool.query(
    `INSERT INTO medical_records (user_id, type, title, description, date, attachment_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, type, title, description, date, attachment_url, created_at, updated_at`,
    [userId, type, title, description || null, date, finalAttachment]
  );
  return rows[0];
}

async function getAllForUser(userId, { type, limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  if (type) {
    const { rows } = await pool.query(
      `SELECT * FROM medical_records
       WHERE user_id = $1 AND type = $2
       ORDER BY date DESC
       LIMIT $3 OFFSET $4`,
      [userId, type, safeLimit, safeOffset]
    );
    return rows;
  }
  const { rows } = await pool.query(
    `SELECT * FROM medical_records
     WHERE user_id = $1
     ORDER BY date DESC
     LIMIT $2 OFFSET $3`,
    [userId, safeLimit, safeOffset]
  );
  return rows;
}

async function getOneForUser(userId, recordId) {
  const { rows } = await pool.query(
    `SELECT * FROM medical_records WHERE id = $1 AND user_id = $2`,
    [recordId, userId]
  );
  return rows[0] || null;
}

async function deleteForUser(userId, recordId) {
  const { rowCount } = await pool.query(
    `DELETE FROM medical_records WHERE id = $1 AND user_id = $2`,
    [recordId, userId]
  );
  return rowCount > 0;
}

// Used by the share-access flow.
// Priority: specific record IDs > allowed types > all records
async function getAllForShare(userId, allowedTypes, recordIds, { limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  // Specific records selected — highest priority
  if (recordIds && recordIds.length > 0) {
    const { rows } = await pool.query(
      `SELECT id, type, title, description, date, attachment_url FROM medical_records
       WHERE user_id = $1 AND id = ANY($2) ORDER BY date DESC
       LIMIT $3 OFFSET $4`,
      [userId, recordIds, safeLimit, safeOffset]
    );
    return rows;
  }

  // Filter by type
  if (allowedTypes && allowedTypes.length > 0) {
    const { rows } = await pool.query(
      `SELECT id, type, title, description, date, attachment_url FROM medical_records
       WHERE user_id = $1 AND type = ANY($2) ORDER BY date DESC
       LIMIT $3 OFFSET $4`,
      [userId, allowedTypes, safeLimit, safeOffset]
    );
    return rows;
  }

  // All records
  const { rows } = await pool.query(
    `SELECT id, type, title, description, date, attachment_url FROM medical_records
     WHERE user_id = $1 ORDER BY date DESC
     LIMIT $2 OFFSET $3`,
    [userId, safeLimit, safeOffset]
  );
  return rows;
}

/**
 * Validates whether all requested record IDs belong to the specified user via atomic SQL.
 * Returns true if all IDs belong to the user, false otherwise.
 */
async function verifyOwnership(userId, recordIds) {
  if (!Array.isArray(recordIds) || recordIds.length === 0) return true;
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM medical_records
     WHERE user_id = $1 AND id = ANY($2::uuid[])`,
    [userId, recordIds]
  );
  return rows[0].count === recordIds.length;
}

module.exports = {
  RECORD_TYPES,
  createRecord,
  getAllForUser,
  getOneForUser,
  deleteForUser,
  getAllForShare,
  verifyOwnership,
};