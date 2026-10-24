const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const userModel = require('../models/userModel');
const profileModel = require('../models/profileModel');
const notificationModel = require('../models/notificationModel');
const {
  R2_BUCKET_NAME,
  generatePresignedDownloadUrl,
} = require('../config/r2');

const googleClient = new OAuth2Client();

const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

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
    { expiresIn: JWT_EXPIRES_IN, algorithm: 'HS256' }
  );
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body || {};

    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string'
      || !name.trim() || !email.trim() || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (name.trim().length > 120 || normalizedEmail.length > 255) {
      return res.status(400).json({ error: 'Name must be 120 characters or fewer and email must be 255 characters or fewer' });
    }
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ error: 'Password must be 72 UTF-8 bytes or fewer' });
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

    const existing = await userModel.findByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists', code: 'EMAIL_ALREADY_EXISTS' });
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
    // Concurrent signup requests can both pass the lookup before one insert wins.
    if (err.code === '23505' && err.constraint === 'users_email_key') {
      return res.status(409).json({ error: 'An account with that email already exists', code: 'EMAIL_ALREADY_EXISTS' });
    }
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail.length > 255 || !isValidEmail(normalizedEmail) || Buffer.byteLength(password, 'utf8') > 4096) {
      return res.status(400).json({ error: 'Enter a valid email and a password of 4096 UTF-8 bytes or fewer' });
    }
    const user = await userModel.findByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.password_hash) {
      return res.status(401).json({
        error: 'This account is registered using Google Sign-In. Please sign in with Google.',
      });
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
  // Recovery requires token storage and email delivery; never claim an email was sent.
  res.status(503).json({ error: 'Password recovery is not available yet. If you are signed in, change your password in Profile.' });
}

async function resetPassword(req, res, next) {
  res.status(503).json({ error: 'Password recovery is not available yet. No password has been changed.' });
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

async function verifyGoogleIdToken(idToken) {
  const audiences = [
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_CLIENT_ID_WEB,
    process.env.GOOGLE_CLIENT_ID_IOS,
    process.env.GOOGLE_CLIENT_ID_ANDROID,
  ].filter(value => typeof value === 'string' && value.trim()).map(value => value.trim());
  if (audiences.length === 0) {
    const error = new Error('Google sign-in is not configured. Use your email and password to sign in.');
    error.status = 503;
    throw error;
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: audiences,
  });
  return ticket.getPayload();
}

async function googleAuth(req, res, next) {
  try {
    const { idToken } = req.body || {};
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ error: 'idToken is required' });
    }

    let payload;
    try {
      payload = await verifyGoogleIdToken(idToken);
    } catch (verifyErr) {
      if (verifyErr.status === 503) return res.status(503).json({ error: verifyErr.message });
      return res.status(401).json({ error: 'Invalid Google identity token' });
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Google token payload missing email' });
    }

    if (payload.email_verified !== true) {
      return res.status(400).json({ error: 'Google email address is not verified' });
    }

    const normalizedEmail = payload.email.toLowerCase().trim();
    const googleSub = payload.sub;
    const displayName = payload.name?.trim() || normalizedEmail.split('@')[0];
    const pictureUrl = payload.picture || null;

    let user = await userModel.findByGoogleId(googleSub);

    if (!user) {
      const existingByEmail = await userModel.findByEmail(normalizedEmail);
      if (existingByEmail) {
        // Link existing email/password account
        user = await userModel.linkGoogleAccount(existingByEmail.id, googleSub);
        // Invalidate prior sessions on link (Pre-ATO defense)
        await userModel.incrementTokenVersion(existingByEmail.id);
        user.token_version = (user.token_version || 1) + 1;

        // If existing user has no avatar and Google provided one, save it
        if (!existingByEmail.avatar_url && pictureUrl) {
          try {
            await profileModel.upsertProfile(user.id, { avatar_url: pictureUrl });
            user.avatar_url = pictureUrl;
          } catch (profileErr) {
            console.error('Failed to update avatar from Google:', profileErr);
          }
        }

        try {
          await notificationModel.createNotification({
            userId: user.id,
            type: 'security_alert',
            title: 'Google Account Linked',
            body: 'Your Google account was successfully connected to your MedRec health vault.',
            data: { timestamp: new Date().toISOString() },
          });
        } catch (notifErr) {
          console.error('Failed to create Google account link notification:', notifErr);
        }
      } else {
        // Create brand new user
        user = await userModel.createGoogleUser({
          name: displayName,
          email: normalizedEmail,
          googleId: googleSub,
          avatarUrl: pictureUrl,
        });
      }
    }

    const token = signToken(user);
    const avatarUrl = await attachSignedAvatarUrl(user.avatar_url);

    res.status(200).json({
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

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  me,
  logout,
  googleAuth,
  verifyGoogleIdToken,
  googleClient,
};
