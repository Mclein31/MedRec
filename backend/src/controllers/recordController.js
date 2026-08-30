const recordModel = require('../models/recordModel');
const notificationModel = require('../models/notificationModel');

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

    res.status(201).json({ record });
  } catch (err) {
    next(err);
  }
}

async function getRecords(req, res, next) {
  try {
    const { type } = req.query;
    const records = await recordModel.getAllForUser(req.user.id, { type });
    res.json({ records });
  } catch (err) {
    next(err);
  }
}

async function getRecord(req, res, next) {
  try {
    const record = await recordModel.getOneForUser(req.user.id, req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json({ record });
  } catch (err) {
    next(err);
  }
}

async function deleteRecord(req, res, next) {
  try {
    const deleted = await recordModel.deleteForUser(req.user.id, req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Record not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { addRecord, getRecords, getRecord, deleteRecord };
