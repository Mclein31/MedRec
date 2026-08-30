const pool = require('../config/db');

async function createNotification({ userId, type, title, body, data = {} }) {
  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, data)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id AS "userId", type, title, body, read, data, created_at AS "createdAt"`,
    [userId, type, title, body, JSON.stringify(data)]
  );
  return rows[0];
}

async function getAllForUser(userId) {
  const { rows } = await pool.query(
    `SELECT id, user_id AS "userId", type, title, body, read, data, created_at AS "createdAt"
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

async function getUnreadCount(userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM notifications
     WHERE user_id = $1 AND read = FALSE`,
    [userId]
  );
  return rows[0] ? rows[0].count : 0;
}

async function markAsRead(userId, notificationId) {
  const { rows } = await pool.query(
    `UPDATE notifications
     SET read = TRUE
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id AS "userId", type, title, body, read, data, created_at AS "createdAt"`,
    [notificationId, userId]
  );
  return rows[0] || null;
}

async function markAllAsRead(userId) {
  const { rowCount } = await pool.query(
    `UPDATE notifications
     SET read = TRUE
     WHERE user_id = $1 AND read = FALSE`,
    [userId]
  );
  return rowCount;
}

async function deleteForUser(userId, notificationId) {
  const { rowCount } = await pool.query(
    `DELETE FROM notifications
     WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
  return rowCount > 0;
}

module.exports = {
  createNotification,
  getAllForUser,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteForUser,
};
