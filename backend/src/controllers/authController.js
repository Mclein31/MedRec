const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const crypto = require('crypto');
const tokenModel = require('../models/tokenModel');
const SALT_ROUNDS = 12;

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      tokenVersion: user.token_version || 1,
      jti: crypto.randomUUID(),
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must include at least one number' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'Password must include at least one uppercase letter' });
    }

    const existing = await userModel.findByEmail(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await userModel.createUser({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
    });

    const token = signToken(user);
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await userModel.findByEmail(email.toLowerCase().trim());
    if (!user) {
      // Same error as a wrong password, to avoid leaking which emails are registered.
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) {
      // Record failed attempt for progressive throttle / auditing
      await userModel.recordFailedLogin(user.id, user.failed_login_attempts || 0);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Valid credentials: authenticated immediately regardless of failed attempts from other sources
    if (user.failed_login_attempts > 0 || user.locked_until) {
      await userModel.resetFailedLogin(user.id);
    }

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatar_url || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email || !isValidEmail(email)) {
      // Consistent return to prevent account enumeration
      return res.json({
        message: 'If an account with that email exists, password reset instructions have been sent.',
      });
    }

    const user = await userModel.findByEmail(email.toLowerCase().trim());
    if (user) {
      // Generate 32-byte cryptographically secure random reset token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await userModel.createPasswordResetToken({
        userId: user.id,
        tokenHash,
        expiresAt,
      });
    }

    // Unconditionally return generic message without exposing reset token preview in any environment
    res.json({
      message: 'If an account with that email exists, password reset instructions have been sent.',
    });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'token and newPassword are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must include at least one number' });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must include at least one uppercase letter' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetRecord = await userModel.findValidResetToken(tokenHash);

    if (!resetRecord) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired' });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await userModel.resetPasswordWithToken(resetRecord.user_id, passwordHash, resetRecord.id);

    res.json({ message: 'Password has been reset successfully. Please log in with your new password.' });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    await tokenModel.revokeToken({
      jti: req.tokenJti,
      expiresAt: new Date(req.tokenExp * 1000), // JWT exp is in seconds, Date wants ms
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatar_url || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  me,
  logout,
};
