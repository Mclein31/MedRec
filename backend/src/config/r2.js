const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('./env');

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'medrec-vault';
const R2_ENDPOINT = process.env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);

const isR2Configured = Boolean(
  R2_ACCESS_KEY_ID &&
  R2_SECRET_ACCESS_KEY &&
  (R2_ENDPOINT || R2_ACCOUNT_ID)
);

// Initialize S3Client targeted at Cloudflare R2
const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT || 'https://mock.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || 'mock-r2-key',
    secretAccessKey: R2_SECRET_ACCESS_KEY || 'mock-r2-secret',
  },
});

/**
 * Generates a signed PUT upload URL for direct client upload to Cloudflare R2
 * @param {string} bucket Target R2 bucket name
 * @param {string} key Object key in R2 (<userId>/<uuid>.<ext>)
 * @param {string} contentType MIME type
 * @param {number} expiresIn URL TTL in seconds (default 15 minutes)
 */
async function generatePresignedUploadUrl(bucket = R2_BUCKET_NAME, key, contentType, expiresIn = 900) {
  if (!isR2Configured) {
    if (process.env.NODE_ENV !== 'test') {
      const error = new Error('Secure document storage is not configured. Uploads are temporarily unavailable.');
      error.status = 503;
      throw error;
    }
    return {
      uploadUrl: `https://mock.r2.cloudflarestorage.com/${bucket}/${key}?X-Amz-Expires=${expiresIn}&mock=true`,
      key,
    };
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn });
  return { uploadUrl, key };
}

/**
 * Generates a signed GET download URL for private R2 object access
 * @param {string} bucket Target R2 bucket name
 * @param {string} key Object key in R2 (<userId>/<uuid>.<ext>)
 * @param {number} expiresIn URL TTL in seconds (default 15 minutes)
 */
async function generatePresignedDownloadUrl(bucket = R2_BUCKET_NAME, key, expiresIn = 900) {
  if (!isR2Configured) {
    return `https://mock.r2.cloudflarestorage.com/${bucket}/${key}?X-Amz-Expires=${expiresIn}&mock=true`;
  }

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Deletes a single object from Cloudflare R2
 * @param {string} bucket Target R2 bucket name
 * @param {string} key Object key in R2
 */
async function deleteR2Object(bucket = R2_BUCKET_NAME, key) {
  if (!isR2Configured) return;
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await r2Client.send(command);
  } catch (err) {
    console.error(`[R2] Error deleting object ${key} from bucket ${bucket}:`, err);
  }
}

/**
 * Deletes multiple objects in bulk from Cloudflare R2
 * @param {string} bucket Target R2 bucket name
 * @param {string[]} keys Array of object keys in R2
 */
async function deleteR2Objects(bucket = R2_BUCKET_NAME, keys = []) {
  if (!isR2Configured || !keys.length) return;
  try {
    const command = new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: keys.map((k) => ({ Key: k })),
        Quiet: true,
      },
    });
    await r2Client.send(command);
  } catch (err) {
    console.error(`[R2] Error bulk deleting objects from bucket ${bucket}:`, err);
  }
}

/**
 * Streams an object directly from Cloudflare R2
 * @param {string} bucket Target R2 bucket name
 * @param {string} key Object key in R2
 */
async function getR2ObjectStream(bucket = R2_BUCKET_NAME, key) {
  if (!isR2Configured) return null;
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const response = await r2Client.send(command);
    return response.Body;
  } catch (err) {
    console.error(`[R2] Error streaming object ${key}:`, err);
    return null;
  }
}

module.exports = {
  r2Client,
  isR2Configured,
  R2_BUCKET_NAME,
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  getR2ObjectStream,
  deleteR2Object,
  deleteR2Objects,
};
