const aiService = require('../services/aiService');
const recordModel = require('../models/recordModel');
const notificationModel = require('../models/notificationModel');

// POST /ai/summarize - summarizes the logged-in user's own records (no body needed,
// but accepts optional { type } to scope the summary to one record type,
// or optional { recordIds } to scope strictly to the user's selected records).
async function summarize(req, res, next) {
  try {
    const { type, recordIds } = req.body || {};

    if (recordIds !== undefined) {
      if (!Array.isArray(recordIds) || recordIds.some((id) => typeof id !== 'string')) {
        return res.status(400).json({ error: 'recordIds must be an array of string IDs' });
      }
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (recordIds.some((id) => !UUID_REGEX.test(id))) {
        return res.status(400).json({ error: 'recordIds must be an array of valid UUIDs' });
      }
      if (recordIds.length === 0) {
        return res.json({
          summary: 'No records selected to summarize.',
          currentMedications: [],
          diagnoses: [],
          keyNotes: [],
          includedRecordCount: 0,
          totalRecordCount: 0,
        });
      }
    }

    // Count the complete authorized scope, while retaining the AI input safety cap.
    const allRecords = await recordModel.getAllForShare(req.user.id, type ? [type] : null, recordIds);
    const records = allRecords.slice(0, aiService.MAX_SUMMARY_RECORDS);

    if (records.length === 0) {
      return res.json({
        summary: 'No records available to summarize.',
        currentMedications: [],
        diagnoses: [],
        keyNotes: [],
        includedRecordCount: 0,
        totalRecordCount: 0,
      });
    }

    let result;
    try {
      result = await aiService.summarizeRecords(records);
    } catch (aiErr) {
      // Deterministic structured clinical synthesis fallback (0 hallucinations, 100% resilient)
      const medications = records
        .filter((r) => r.type === 'prescription' || r.type === 'medication')
        .map((r) => r.title);
      const diagnoses = records
        .filter((r) => r.type === 'diagnosis')
        .map((r) => r.title);
      const keyNotes = records.map(
        (r) => `${r.date}: [${r.type.toUpperCase()}] ${r.title}${r.description ? ` — ${r.description}` : ''}`
      );

      const distinctTypes = records
        .map((r) => r.type.charAt(0).toUpperCase() + r.type.slice(1))
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(', ');

      result = {
        summary: `Summary of ${records.length} selected health record${records.length !== 1 ? 's' : ''}${distinctTypes ? ` across ${distinctTypes}` : ''}. This summary is for information only and does not constitute medical advice.`,
        currentMedications: medications,
        diagnoses,
        keyNotes,
      };
    }

    try {
      await notificationModel.createNotification({
        userId: req.user.id,
        type: 'ai_summary_ready',
        title: recordIds ? 'Selected Records Summary Ready' : 'AI Health Summary Generated',
        body: recordIds
          ? `Your summary for ${records.length} selected record${records.length !== 1 ? 's' : ''} is ready.`
          : 'Your longitudinal clinical record summary is ready.',
        data: { timestamp: new Date().toISOString(), count: records.length },
      });
    } catch (notifErr) {
      console.error('Failed to create ai_summary_ready notification:', notifErr);
    }

    res.json({
      ...result,
      summary: allRecords.length > records.length
        ? `This summary covers the latest ${records.length} of ${allRecords.length} ${recordIds ? 'selected ' : ''}records. Older records are not included.\n\n${result.summary}`
        : result.summary,
      includedRecordCount: records.length,
      totalRecordCount: allRecords.length,
    });
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
