const express = require('express');
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  me,
  logout,
  googleAuth,
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', requireAuth, me);
router.post('/logout', requireAuth, logout);

module.exports = router;
