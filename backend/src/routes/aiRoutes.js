const express = require('express');
const rateLimit = require('express-rate-limit');
const { summarize, organize, explain } = require('../controllers/aiController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// Authenticate user identity first
router.use(requireAuth);

// User-Keyed AI Rate Limiter (10 operations / 15 minutes per authenticated user)
const aiUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id || req.ip,
  validate: { keyGeneratorIpFallback: false },
  message: { error: 'Too many AI requests. You have reached the limit of 10 requests per 15 minutes. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

if (process.env.NODE_ENV !== 'test') {
  router.use(aiUserLimiter);
}

router.post('/summarize', summarize);
router.post('/organize', organize);
router.post('/explain', explain);

module.exports = router;
