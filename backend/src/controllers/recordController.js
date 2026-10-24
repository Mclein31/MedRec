const recordModel = require('../models/recordModel');
const notificationModel = require('../models/notificationModel');
const { isValidCivilDate, isLocalAttachmentUri } = require('../utils/validation');
const {
  R2_BUCKET_NAME,
  generatePresignedDownloadUrl,
  deleteR2Object,
} = require('../config/r2');

async function attachSignedUrlIfNeeded(record) {
  if (!record || !record.attachment_url) return record;

  const url = record.attachment_url;
  // If it is already a full remote URL or data URI, return as-is
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('file://')) {
    return record;
  }

  // Generate a 15-minute signed download URL from Cloudflare R2
  try {
    const signedUrl = await generatePresignedDownloadUrl(R2_BUCKET_NAME, url, 900);
    return {
      ...record,
      attachment_url: signedUrl,
      attachmentPath: url,
    };
  } catch (err) {
    console.error('[R2] Error generating signed download URL for record:', err);
    return record;
  }
}

async function addRecord(req, res, next) {
  try {
    const { type, title, description, date, attachmentUrl, attachment_url } = req.body;

    if (!type || !title || !date) {
      return res.status(400).json({ error: 'type, title, and date are required' });
    }
    if (!recordModel.RECORD_TYPES.includes(type)) {
      return res.status(400).json({
        error: `type must be one of: ${recordModel.RECORD_TYPES.join(', ')}`,
      });
    }
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title cannot be empty' });
    }
    if (!isValidCivilDate(date)) {
      return res.status(400).json({ error: 'date must be a valid calendar date in YYYY-MM-DD format' });
    }
    if (isLocalAttachmentUri(attachment_url !== undefined ? attachment_url : attachmentUrl)) {
      return res.status(400).json({ error: 'Upload the attachment to secure storage before saving the record' });
    }

    const record = await recordModel.createRecord({
      userId: req.user.id,
      type,
      title: title.trim(),
      description: description ? description.trim() : null,
      date,
      attachmentUrl: attachment_url !== undefined ? attachment_url : (attachmentUrl || null),
    });

    // Auto-create notification for new record activity
    try {
      await notificationModel.createNotification({
        userId: req.user.id,
        type: 'record_added',
        title: 'New Medical Record Added',
        body: `"${record.title}" was logged to your health timeline.`,
        data: { recordId: record.id, type: record.type },
      });
    } catch (notifErr) {
      console.error('Failed to create record_added notification:', notifErr);
    }

    const processedRecord = await attachSignedUrlIfNeeded(record);
    res.status(201).json({ record: processedRecord });
  } catch (err) {
    next(err);
  }
}

async function getRecords(req, res, next) {
  try {
    const { type, limit, offset } = req.query;
    const records = await recordModel.getAllForUser(req.user.id, { type, limit, offset });

    const processedRecords = await Promise.all(
      records.map((r) => attachSignedUrlIfNeeded(r))
    );

    res.json({ records: processedRecords });
  } catch (err) {
    next(err);
  }
}

async function getRecord(req, res, next) {
  try {
    const record = await recordModel.getOneForUser(req.user.id, req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });

    const processedRecord = await attachSignedUrlIfNeeded(record);
    res.json({ record: processedRecord });
  } catch (err) {
    next(err);
  }
}

async function deleteRecord(req, res, next) {
  try {
    const existing = await recordModel.getOneForUser(req.user.id, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Record not found' });

    // Clean up attachment from Cloudflare R2 if present
    if (
      existing.attachment_url &&
      !existing.attachment_url.startsWith('http') &&
      !existing.attachment_url.startsWith('data:')
    ) {
      await deleteR2Object(R2_BUCKET_NAME, existing.attachment_url);
    }

    await recordModel.deleteForUser(req.user.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function updateRecord(req, res, next) {
  try {
    const { type, title, description, date, attachmentUrl, attachment_url } = req.body;

    if (type !== undefined && !recordModel.RECORD_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${recordModel.RECORD_TYPES.join(', ')}` });
    }
    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      return res.status(400).json({ error: 'title cannot be empty' });
    }
    if (date !== undefined && !isValidCivilDate(date)) {
      return res.status(400).json({ error: 'date must be a valid calendar date in YYYY-MM-DD format' });
    }
    if (isLocalAttachmentUri(attachment_url !== undefined ? attachment_url : attachmentUrl)) {
      return res.status(400).json({ error: 'Upload the attachment to secure storage before saving the record' });
    }

    // Sanitize attachmentUrl: never overwrite the stored R2 key with a short-lived presigned URL.
    // If the client sends back an http(s) URL (i.e. the signed download URL the API previously
    // returned), we drop it so the existing DB key is preserved.
    let safeAttachmentUrl = attachment_url !== undefined ? attachment_url : attachmentUrl;
    if (typeof safeAttachmentUrl === 'string' &&
        (safeAttachmentUrl.startsWith('http://') || safeAttachmentUrl.startsWith('https://'))) {
      // The client echoed back a signed URL — do not overwrite the stored key with it.
      safeAttachmentUrl = undefined;
    }

    // Handle orphaned R2 object cleanup when attachment is explicitly being replaced or removed
    // (i.e. a NEW non-http R2 key is provided and differs from the existing one)
    if (safeAttachmentUrl !== undefined) {
      const existing = await recordModel.getOneForUser(req.user.id, req.params.id);
      if (
        existing &&
        existing.attachment_url &&
        !existing.attachment_url.startsWith('http') &&
        !existing.attachment_url.startsWith('data:') &&
        safeAttachmentUrl !== existing.attachment_url
      ) {
        await deleteR2Object(R2_BUCKET_NAME, existing.attachment_url);
      }
    }

    const updated = await recordModel.updateRecordForUser(req.user.id, req.params.id, {
      type,
      title,
      description,
      date,
      attachment_url: safeAttachmentUrl,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const processedRecord = await attachSignedUrlIfNeeded(updated);
    res.json({ record: processedRecord });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  addRecord,
  getRecords,
  getRecord,
  updateRecord,
  deleteRecord,
  attachSignedUrlIfNeeded,
};
