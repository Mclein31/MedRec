const pool = require('../config/db');

async function createUser({ name, email, passwordHash }) {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name, email, passwordHash]
  );
  return rows[0];
}

async function findByEmail(email) {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.password, u.created_at, p.avatar_url
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.email = $1`,
    [email]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.created_at, p.avatar_url
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [id]
  );
  return rows[0] || null;
}

module.exports = { createUser, findByEmail, findById };
