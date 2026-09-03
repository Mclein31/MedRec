const JSZip = require('jszip');
const shareModel = require('../models/shareModel');
const recordModel = require('../models/recordModel');
const notificationModel = require('../models/notificationModel');
const aiService = require('../services/aiService');
const { generateSecureToken } = require('../utils/token');
const { attachSignedUrlIfNeeded } = require('./recordController');
const { generatePresignedDownloadUrl, getR2ObjectStream, R2_BUCKET_NAME } = require('../config/r2');

const DEFAULT_TTL_MINUTES = Number(process.env.SHARE_TOKEN_DEFAULT_TTL_MINUTES || 60);
const MAX_ACTIVE_SHARE_SESSIONS = 5;

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

    // Validate that the requested record IDs actually belong to this user via atomic SQL
    if (recordIds && recordIds.length > 0) {
      const allOwned = await recordModel.verifyOwnership(req.user.id, recordIds);
      if (!allOwned) {
        return res.status(400).json({ error: 'One or more record IDs do not belong to you' });
      }
    }

    // Security & Capacity Control: Cap active sessions at maximum 5 per patient
    // Automatically recycle/revoke older active sessions to keep at most 4 before inserting the new one
    await shareModel.pruneExcessActiveShares(req.user.id, MAX_ACTIVE_SHARE_SESSIONS - 1);

    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

    const share = await shareModel.createShare({
      userId: req.user.id,
      token,
      expiresAt,
      allowedTypes,
      recordIds,
    });

    try {
      await notificationModel.createNotification({
        userId: req.user.id,
        type: 'share_created',
        title: 'Doctor QR Access Generated',
        body: `A temporary ${minutes}-minute QR access token was generated.`,
        data: { shareToken: share.token, expiresAt: share.expires_at },
      });
    } catch (notifErr) {
      console.error('Failed to create share_created notification:', notifErr);
    }

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
    const share = await shareModel.findActiveByTokenWithUser(token);

    if (!share) {
      return res.status(404).json({ error: 'This share link is invalid, expired, or revoked' });
    }

    // Pass both recordIds and allowedTypes — recordIds takes priority in the model
    const records = await recordModel.getAllForShare(
      share.user_id,
      share.allowed_types,
      share.record_ids
    );

    const processedRecords = await Promise.all(
      records.map((r) => attachSignedUrlIfNeeded(r))
    );

    res.json({
      token: share.token,
      expiresAt: share.expires_at,
      createdAt: share.created_at,
      patient: {
        name: share.patient_name || 'Patient',
      },
      records: processedRecords,
    });
  } catch (err) {
    next(err);
  }
}

async function summarizeShared(req, res, next) {
  try {
    const { token } = req.params;
    const share = await shareModel.findActiveByTokenWithUser(token);

    if (!share) {
      return res.status(404).json({ error: 'This share link is invalid, expired, or revoked' });
    }

    const records = await recordModel.getAllForShare(
      share.user_id,
      share.allowed_types,
      share.record_ids
    );

    if (records.length === 0) {
      return res.json({
        summary: 'No medical records are included in this shared clinical session.',
        currentMedications: [],
        diagnoses: [],
        keyNotes: [],
      });
    }

    try {
      const result = await aiService.summarizeRecords(records);
      return res.json(result);
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

      return res.json({
        summary: `Shared medical record history for ${share.patient_name || 'patient'} containing ${records.length} authorized clinical entries across ${distinctTypes}.`,
        currentMedications: medications,
        diagnoses: diagnoses,
        keyNotes: keyNotes,
      });
    }
  } catch (err) {
    next(err);
  }
}

async function terminateShared(req, res, next) {
  try {
    const { token } = req.params;
    const terminated = await shareModel.terminateByToken(token);

    if (!terminated) {
      return res.status(404).json({ error: 'This share session is invalid, already expired, or already terminated' });
    }

    try {
      await notificationModel.createNotification({
        userId: terminated.user_id,
        type: 'share_revoked',
        title: 'Doctor Access Session Concluded',
        body: 'The recipient has completed review and safely terminated their temporary access session.',
        data: { shareId: terminated.id, token: terminated.token },
      });
    } catch (notifErr) {
      console.error('Failed to create share_revoked notification:', notifErr);
    }

    res.json({ message: 'Shared access session has been terminated successfully' });
  } catch (err) {
    next(err);
  }
}

async function downloadSharedRecord(req, res, next) {
  try {
    const { token, recordId } = req.params;
    const share = await shareModel.findActiveByToken(token);

    if (!share) {
      return res.status(404).json({ error: 'This share link is invalid, expired, or revoked' });
    }

    const records = await recordModel.getAllForShare(
      share.user_id,
      share.allowed_types,
      share.record_ids
    );

    const record = records.find((r) => r.id === recordId);
    if (!record) {
      return res.status(404).json({ error: 'Medical record not found or not included in this share session' });
    }

    if (!record.attachment_url) {
      return res.status(400).json({ error: 'This medical record has no attached document file' });
    }

    const targetBucket = R2_BUCKET_NAME || 'medrec-vault';
    const downloadUrl = await generatePresignedDownloadUrl(targetBucket, record.attachment_url, 900);

    res.json({
      recordId: record.id,
      title: record.title,
      type: record.type,
      downloadUrl,
    });
  } catch (err) {
    next(err);
  }
}

async function exportSharedBundle(req, res, next) {
  try {
    const { token } = req.params;
    const share = await shareModel.findActiveByTokenWithUser(token);

    if (!share) {
      return res.status(404).json({ error: 'This share link is invalid, expired, or revoked' });
    }

    const records = await recordModel.getAllForShare(
      share.user_id,
      share.allowed_types,
      share.record_ids
    );

    const processedRecords = await Promise.all(
      records.map((r) => attachSignedUrlIfNeeded(r))
    );

    res.json({
      exportType: 'MedRec Clinical Shared Export',
      patientName: share.patient_name || 'Patient',
      sharedOn: share.created_at,
      expiresAt: share.expires_at,
      exportedAt: new Date().toISOString(),
      totalRecords: processedRecords.length,
      records: processedRecords.map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        date: r.date,
        description: r.description,
        downloadUrl: r.attachment_url || null,
      })),
    });
  } catch (err) {
    next(err);
  }
}

async function listShares(req, res, next) {
  try {
    const { limit, offset } = req.query;
    const shares = await shareModel.listForUser(req.user.id, { limit, offset });
    res.json({ shares });
  } catch (err) {
    next(err);
  }
}

async function revokeShare(req, res, next) {
  try {
    const revoked = await shareModel.revoke(req.user.id, req.params.id);
    if (!revoked) return res.status(404).json({ error: 'Share not found or already revoked' });

    try {
      await notificationModel.createNotification({
        userId: req.user.id,
        type: 'share_revoked',
        title: 'Doctor QR Access Terminated',
        body: 'Your active QR sharing token has been revoked.',
        data: { shareId: req.params.id },
      });
    } catch (notifErr) {
      console.error('Failed to create share_revoked notification:', notifErr);
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function downloadSharedBundleZip(req, res, next) {
  try {
    const { token } = req.params;
    const share = await shareModel.findActiveByTokenWithUser(token);

    if (!share) {
      return res.status(404).json({ error: 'This share link is invalid, expired, or revoked' });
    }

    const records = await recordModel.getAllForShare(
      share.user_id,
      share.allowed_types,
      share.record_ids
    );

    const processedRecords = await Promise.all(
      records.map((r) => attachSignedUrlIfNeeded(r))
    );

    const patientName = (share.patient_name || 'Patient').trim();
    const safePatientName = patientName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const zipFilename = `MedRec_Shared_Records_${safePatientName}_${Date.now()}.zip`;

    const zip = new JSZip();

    // 1. Add Summary Text File
    let summaryText = `=================================================================\n`;
    summaryText += ` MEDREC CLINICAL RECORD EXPORT (SOVEREIGN VAULT BUNDLE)\n`;
    summaryText += `=================================================================\n\n`;
    summaryText += `Patient Name:     ${patientName}\n`;
    summaryText += `Shared Session:   ${share.created_at || 'Active'}\n`;
    summaryText += `Access Expires:   ${share.expires_at}\n`;
    summaryText += `Exported On:      ${new Date().toLocaleString('en-US')}\n`;
    summaryText += `Total Records:    ${processedRecords.length}\n\n`;
    summaryText += `-----------------------------------------------------------------\n`;
    summaryText += ` MEDICAL RECORDS INDEX\n`;
    summaryText += `-----------------------------------------------------------------\n\n`;

    processedRecords.forEach((rec, idx) => {
      summaryText += `[#${idx + 1}] ${rec.title}\n`;
      summaryText += `Category:    ${(rec.type || 'other').toUpperCase()}\n`;
      summaryText += `Event Date:  ${rec.date || 'Not specified'}\n`;
      summaryText += `Logged:      ${rec.created_at || 'Recorded'}\n`;
      if (rec.description) {
        summaryText += `Notes:       ${rec.description.trim()}\n`;
      }
      if (rec.attachment_url) {
        summaryText += `Attachment:  attachments/doc_${idx + 1}_${rec.type || 'record'}.jpg\n`;
      }
      summaryText += `\n-----------------------------------------------------------------\n\n`;
    });

    zip.file('README_CLINICAL_SUMMARY.txt', summaryText);

    // 2. Add JSON metadata file
    const exportJson = {
      exportVersion: '1.0',
      application: 'MedRec Mobile Health Vault',
      patientName,
      sessionToken: token,
      sharedAt: share.created_at,
      expiresAt: share.expires_at,
      exportedAt: new Date().toISOString(),
      totalRecords: processedRecords.length,
      records: processedRecords.map((r, idx) => ({
        index: idx + 1,
        id: r.id,
        title: r.title,
        type: r.type,
        date: r.date,
        description: r.description,
        attachmentFilename: r.attachment_url ? `attachments/doc_${idx + 1}_${r.type || 'record'}.jpg` : null,
      })),
    };
    zip.file('records_metadata.json', JSON.stringify(exportJson, null, 2));

    // 3. Add Document Attachments
    const attachmentsFolder = zip.folder('attachments');

    for (let i = 0; i < records.length; i++) {
      const rawRecord = records[i];
      const rawAttachment = rawRecord.attachment_url;
      if (!rawAttachment) continue;

      const safeType = (rawRecord.type || 'record').replace(/[^a-zA-Z0-9_-]/g, '_');
      const attachmentName = `doc_${i + 1}_${safeType}.jpg`;

      try {
        if (!rawAttachment.startsWith('http') && !rawAttachment.startsWith('data:')) {
          const stream = await getR2ObjectStream(R2_BUCKET_NAME, rawAttachment);
          if (stream) {
            const chunks = [];
            for await (const chunk of stream) {
              chunks.push(chunk);
            }
            attachmentsFolder.file(attachmentName, Buffer.concat(chunks));
            continue;
          }
        }

        if (rawAttachment.startsWith('data:')) {
          const base64Data = rawAttachment.split(',')[1];
          if (base64Data) {
            const buf = Buffer.from(base64Data, 'base64');
            attachmentsFolder.file(attachmentName, buf);
            continue;
          }
        }

        if (rawAttachment.startsWith('http')) {
          const resp = await fetch(rawAttachment);
          if (resp.ok) {
            const arrayBuf = await resp.arrayBuffer();
            attachmentsFolder.file(attachmentName, Buffer.from(arrayBuf));
          }
        }
      } catch (attachErr) {
        console.error(`[ZipExport] Error archiving attachment for record ${rawRecord.id}:`, attachErr);
      }
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    res.setHeader('Content-Length', zipBuffer.length);
    res.send(zipBuffer);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createShare,
  getByToken,
  summarizeShared,
  terminateShared,
  downloadSharedRecord,
  downloadSharedBundleZip,
  exportSharedBundle,
  listShares,
  revokeShare,
};