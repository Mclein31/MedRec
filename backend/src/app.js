const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const helmet = require('helmet');
const authRoutes = require('./routes/authRoutes');
const recordRoutes = require('./routes/recordRoutes');
const shareRoutes = require('./routes/shareRoutes');
const storageRoutes = require('./routes/storageRoutes');
const aiRoutes = require('./routes/aiRoutes');
const profileRoutes = require('./routes/profileRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// Enable reverse proxy trust for Cloudflare / ALB / Render / Nginx IP resolution
app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:8081',
  'http://localhost:19006',
  'http://10.0.2.2:8081',
  'exp://localhost:8081',
  'exp://10.0.2.2:8081',
];

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,                  // 15 attempts per window per IP
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many password reset requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const shareCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many share sessions created. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const shareAccessLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many access attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

if (process.env.NODE_ENV !== 'test') {
  app.use('/auth/login', authLimiter);
  app.use('/auth/register', authLimiter);
  app.use('/auth/google', authLimiter);
  app.use('/auth/forgot-password', passwordResetLimiter);
  app.use('/auth/reset-password', passwordResetLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/google', authLimiter);
  app.use('/share', shareCreateLimiter);
  app.use('/share/:token', shareAccessLimiter);
  app.use('/api/share', shareCreateLimiter);
  app.use('/api/share/:token', shareAccessLimiter);
}

// Mount routes with both standard and /api prefix for robust client connectivity
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);

app.use('/records', recordRoutes);
app.use('/api/records', recordRoutes);

app.use('/share', shareRoutes);
app.use('/api/share', shareRoutes);

app.use('/storage', storageRoutes);
app.use('/api/storage', storageRoutes);

app.use('/ai', aiRoutes);
app.use('/api/ai', aiRoutes);

app.use('/profile', profileRoutes);
app.use('/api/profile', profileRoutes);

app.use('/notifications', notificationRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
