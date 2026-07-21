const express = require('express');

const {
  createShare,
  getByToken,
  listShares,
  revokeShare,
} = require('../controllers/shareController');

const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', requireAuth, createShare);
router.get('/', requireAuth, listShares);
router.delete('/:id', requireAuth, revokeShare);
router.get('/:token', getByToken);

module.exports = router;

