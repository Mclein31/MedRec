const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const {
  R2_BUCKET_NAME,
  generatePresignedDownloadUrl,
} = require('../config/r2');

const JWT_SECRET = process.env.JWT_SECRET || 'medrec-production-jwt-secret-at-least-32-chars-long';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

async function attachSignedAvatarUrl(avatarUrl) {
  if (!avatarUrl) return null;
  const trimmed = String(avatarUrl).trim();
  if (!trimmed) return null;

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file://')
  ) {
    return trimmed;
  }

  try {
    const targetBucket = R2_BUCKET_NAME || 'medrec-vault';
    const signedUrl = await generatePresignedDownloadUrl(targetBucket, trimmed, 86400);
    return signedUrl;
  } catch (err) {
    console.error('[R2] Error generating signed download URL for user avatar:', err);
    return trimmed;
  }
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      token_version: user.token_version || 1,
      jti: crypto.randomUUID(),
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
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

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await userModel.findByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const user = await userModel.createUser({
      name: name.trim(),
      email: normalizedEmail,
      password,
    });

    const token = signToken(user);
    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: null,
      },
    });
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

    const normalizedEmail = email.toLowerCase().trim();
    const user = await userModel.findByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user);
    const avatarUrl = await attachSignedAvatarUrl(user.avatar_url);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: avatarUrl || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    // Always return standard confirmation message to prevent user enumeration
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

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    res.json({ message: 'Password has been reset successfully. Please log in with your new password.' });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    // Increment token_version so any existing JWT for this user is immediately rejected
    // by the token-version check in the auth middleware.
    if (req.user?.id) {
      await userModel.incrementTokenVersion(req.user.id);
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const avatarUrl = await attachSignedAvatarUrl(user.avatar_url);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: avatarUrl || null,
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
