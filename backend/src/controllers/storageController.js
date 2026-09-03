const crypto = require('crypto');
const path = require('path');
const {
  R2_BUCKET_NAME,
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
} = require('../config/r2');

const ALLOWED_BUCKETS = ['medical-records', 'avatars', 'medrec-vault', R2_BUCKET_NAME].filter(Boolean);
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
];

const MIME_EXT_MAP = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
};

async function getUploadUrl(req, res, next) {
  try {
    const { bucket, fileName = 'upload.jpg', fileType = 'image/jpeg' } = req.body;

    if (bucket && !ALLOWED_BUCKETS.includes(bucket)) {
      return res.status(400).json({ error: `Invalid bucket. Allowed buckets: ${ALLOWED_BUCKETS.join(', ')}` });
    }

    if (!ALLOWED_MIME_TYPES.includes(fileType.toLowerCase())) {
      return res.status(400).json({ error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` });
    }

    const extFromMime = MIME_EXT_MAP[fileType.toLowerCase()] || 'jpg';
    const extFromFilename = path.extname(fileName).replace('.', '').toLowerCase();
    const finalExt = extFromFilename || extFromMime;

    const fileUuid = crypto.randomUUID();
    const storageKey = `${req.user.id}/${fileUuid}.${finalExt}`;

    // Target the configured Cloudflare R2 bucket
    const targetBucket = R2_BUCKET_NAME || 'medrec-vault';
    const { uploadUrl, key } = await generatePresignedUploadUrl(targetBucket, storageKey, fileType.toLowerCase(), 900);

    res.json({
      uploadUrl,
      path: key,
      key,
    });
  } catch (err) {
    next(err);
  }
}

async function getDownloadUrl(req, res, next) {
  try {
    const { bucket, filePath, key } = req.query;
    const targetKey = filePath || key;

    if (!targetKey) {
      return res.status(400).json({ error: 'filePath or key query parameter is required' });
    }

    if (bucket && !ALLOWED_BUCKETS.includes(bucket)) {
      return res.status(400).json({ error: `Invalid bucket. Allowed buckets: ${ALLOWED_BUCKETS.join(', ')}` });
    }

    // Enforce path prefix isolation: user can only request download for their own files
    if (!targetKey.startsWith(`${req.user.id}/`)) {
      return res.status(403).json({ error: 'Access denied to this storage object' });
    }

    const targetBucket = R2_BUCKET_NAME || 'medrec-vault';
    const downloadUrl = await generatePresignedDownloadUrl(targetBucket, targetKey, 900); // 15-minute TTL

    res.json({ downloadUrl });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUploadUrl,
  getDownloadUrl,
};
