const express = require('express');
const { getUploadUrl, getDownloadUrl } = require('../controllers/storageController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);

router.post('/upload-url', getUploadUrl);
router.get('/download-url', getDownloadUrl);

module.exports = router;
