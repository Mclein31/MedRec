const shareModel = require('../models/shareModel');
const recordModel = require('../models/recordModel');
const { generateSecureToken } = require('../utils/token');

const DEFAULT_TTL_MINUTES = Number(process.env.SHARE_TOKEN_DEFAULT_TTL_MINUTES || 60);

async function createShare(req, res, next) {
  try {
    const { ttlMinutes, allowedTypes, recordIds } = req.body;
    const minutes = Number(ttlMinutes) > 0 ? Number(ttlMinutes) : DEFAULT_TTL_MINUTES;

    if (allowedTypes && !Array.isArray(allowedTypes)) {
      return res.status(400).json({ error: 'allowedTypes must be an array of record types' });
    }
    if (recordIds && !Array.isArray(recordIds)) {
      return res.status(400).json({ error: 'recordIds must be an array of UUIDs' });
    }

    // Validate that the requested record IDs actually belong to this user
    if (recordIds && recordIds.length > 0) {
      const userRecords = await recordModel.getAllForUser(req.user.id);
      const userRecordIds = userRecords.map(r => r.id);
      const invalidIds = recordIds.filter(id => !userRecordIds.includes(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({ error: 'One or more record IDs do not belong to you' });
      }
    }

    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

    const share = await shareModel.createShare({
      userId: req.user.id,
      token,
      expiresAt,
      allowedTypes,
      recordIds,
    });

    res.status(201).json({
      token: share.token,
      expiresAt: share.expires_at,
      allowedTypes: share.allowed_types,
      recordIds: share.record_ids,
    });
  } catch (err) {
    next(err);
  }
}

async function getByToken(req, res, next) {
  try {
    const { token } = req.params;
    const share = await shareModel.findActiveByToken(token);

    if (!share) {
      return res.status(404).json({ error: 'This share link is invalid, expired, or revoked' });
    }

    // Pass both recordIds and allowedTypes — recordIds takes priority in the model
    const records = await recordModel.getAllForShare(
      share.user_id,
      share.allowed_types,
      share.record_ids
    );

    res.json({
      expiresAt: share.expires_at,
      records,
    });
  } catch (err) {
    next(err);
  }
}

async function listShares(req, res, next) {
  try {
    const shares = await shareModel.listForUser(req.user.id);
    res.json({ shares });
  } catch (err) {
    next(err);
  }
}

async function revokeShare(req, res, next) {
  try {
    const revoked = await shareModel.revoke(req.user.id, req.params.id);
    if (!revoked) return res.status(404).json({ error: 'Share not found or already revoked' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createShare,
  getByToken,
  listShares,
  revokeShare,
};