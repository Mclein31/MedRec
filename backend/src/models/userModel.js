const pool = require('../config/db');

async function createUser({ name, email, passwordHash }) {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, token_version, created_at`,
    [name, email, passwordHash]
  );
  return rows[0];
}

async function findByEmail(email) {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.password, u.token_version, u.failed_login_attempts, u.locked_until, u.created_at, p.avatar_url
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.email = $1`,
    [email]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.token_version, u.created_at, p.avatar_url
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function recordFailedLogin(userId, currentAttempts) {
  const newAttempts = currentAttempts + 1;
  const isLocked = newAttempts >= 5;
  const { rows } = await pool.query(
    `UPDATE users
     SET failed_login_attempts = $1,
         locked_until = CASE WHEN $2 = TRUE THEN now() + interval '15 minutes' ELSE locked_until END,
         updated_at = now()
     WHERE id = $3
     RETURNING failed_login_attempts, locked_until`,
    [newAttempts, isLocked, userId]
  );
  return rows[0];
}

async function resetFailedLogin(userId) {
  await pool.query(
    `UPDATE users
     SET failed_login_attempts = 0,
         locked_until = NULL,
         updated_at = now()
     WHERE id = $1`,
    [userId]
  );
}

async function incrementTokenVersion(userId) {
  const { rows } = await pool.query(
    `UPDATE users
     SET token_version = token_version + 1,
         updated_at = now()
     WHERE id = $1
     RETURNING token_version`,
    [userId]
  );
  return rows[0] ? rows[0].token_version : 1;
}

async function createPasswordResetToken({ userId, tokenHash, expiresAt }) {
  // Invalidate any existing unused reset tokens for this user first
  await pool.query(
    `UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE`,
    [userId]
  );

  const { rows } = await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, expires_at`,
    [userId, tokenHash, expiresAt]
  );
  return rows[0];
}

async function findValidResetToken(tokenHash) {
  const { rows } = await pool.query(
    `SELECT id, user_id, expires_at, used
     FROM password_reset_tokens
     WHERE token_hash = $1 AND used = FALSE AND expires_at > now()`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function resetPasswordWithToken(userId, passwordHash, tokenId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update password, increment token_version to invalidate all existing sessions, and reset failed logins
    await client.query(
      `UPDATE users
       SET password = $1,
           token_version = token_version + 1,
           failed_login_attempts = 0,
           locked_until = NULL,
           updated_at = now()
       WHERE id = $2`,
      [passwordHash, userId]
    );

    // Mark reset token as used
    await client.query(
      `UPDATE password_reset_tokens
       SET used = TRUE
       WHERE id = $1`,
      [tokenId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  recordFailedLogin,
  resetFailedLogin,
  incrementTokenVersion,
  createPasswordResetToken,
  findValidResetToken,
  resetPasswordWithToken,
};
