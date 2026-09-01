const aiService = require('../services/aiService');
const recordModel = require('../models/recordModel');
const notificationModel = require('../models/notificationModel');

// POST /ai/summarize - summarizes the logged-in user's own records (no body needed,
// but accepts optional { type } to scope the summary to one record type).
async function summarize(req, res, next) {
  try {
    const { type } = req.body || {};
    // Fetch user's records with safety cap
    const records = await recordModel.getAllForUser(req.user.id, { type, limit: aiService.MAX_SUMMARY_RECORDS });
    const result = await aiService.summarizeRecords(records);

    try {
      await notificationModel.createNotification({
        userId: req.user.id,
        type: 'ai_summary_ready',
        title: 'AI Health Summary Generated',
        body: 'Your longitudinal clinical record summary is ready.',
        data: { timestamp: new Date().toISOString() },
      });
    } catch (notifErr) {
      console.error('Failed to create ai_summary_ready notification:', notifErr);
    }

    res.json(result);
  } catch (err) {
    console.error('AI summarize error:', err.message || err);
    res.status(503).json({ error: 'AI summary is temporarily unavailable. Please try again later.' });
  }
}

// POST /ai/organize - body: { text }
async function organize(req, res, next) {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Valid text content is required' });
    }
    if (text.length > aiService.MAX_INPUT_CHARS) {
      return res.status(400).json({
        error: `Input text exceeds the maximum allowable limit of ${aiService.MAX_INPUT_CHARS} characters.`,
      });
    }

    const result = await aiService.organizeRecord(text);
    res.json(result);
  } catch (err) {
    console.error('AI organize error:', err.message || err);
    res.status(503).json({ error: 'AI organization is temporarily unavailable. Please try again later.' });
  }
}

// POST /ai/explain - body: { text }
async function explain(req, res, next) {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Valid text content is required' });
    }
    if (text.length > aiService.MAX_INPUT_CHARS) {
      return res.status(400).json({
        error: `Input text exceeds the maximum allowable limit of ${aiService.MAX_INPUT_CHARS} characters.`,
      });
    }

    const result = await aiService.explainMedicalText(text);
    res.json(result);
  } catch (err) {
    console.error('AI explain error:', err.message || err);
    res.status(503).json({ error: 'AI explanation is temporarily unavailable. Please try again later.' });
  }
}

module.exports = { summarize, organize, explain };
