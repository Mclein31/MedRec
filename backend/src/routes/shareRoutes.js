const express = require('express');

const {
  createShare,
  getByToken,
  summarizeShared,
  terminateShared,
  downloadSharedRecord,
  downloadSharedBundleZip,
  exportSharedBundle,
  listShares,
  revokeShare,
} = require('../controllers/shareController');

const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', requireAuth, createShare);
router.get('/', requireAuth, listShares);
router.delete('/:id', requireAuth, revokeShare);

// Recipient Shared Record routes (accessible via active share token)
router.get('/:token', getByToken);
router.post('/:token/summarize', summarizeShared);
router.post('/:token/terminate', terminateShared);
router.get('/:token/download/:recordId', downloadSharedRecord);
router.get('/:token/zip', downloadSharedBundleZip);
router.get('/:token/download-all', downloadSharedBundleZip);
router.get('/:token/export', exportSharedBundle);

module.exports = router;
