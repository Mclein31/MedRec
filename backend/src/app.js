const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const helmet = require('helmet');
const authRoutes = require('./routes/authRoutes');
const recordRoutes = require('./routes/recordRoutes');
const shareRoutes = require('./routes/shareRoutes');
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
];

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 8,                   // 8 attempts per window per IP
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

const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many password update attempts. Please try again in 15 minutes.' },
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
  app.use('/auth/forgot-password', passwordResetLimiter);
  app.use('/auth/reset-password', passwordResetLimiter);
  app.use('/profile/password', passwordLimiter);
  app.post('/share', shareCreateLimiter);
  app.get('/share/:token', shareAccessLimiter);
}

app.use('/auth', authRoutes);
app.use('/records', recordRoutes);
app.use('/share', shareRoutes);
app.use('/ai', aiRoutes);
app.use('/profile', profileRoutes);
app.use('/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
