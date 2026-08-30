const bcrypt = require('bcryptjs');
const profileModel = require('../models/profileModel');
const userModel = require('../models/userModel');
const pool = require('../config/db');

const SALT_ROUNDS = 12;

const VALID_SEX = ['male', 'female', 'other', 'undisclosed'];
const VALID_BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'];

function formatProfileResponse(row) {
  if (!row) return null;
  return {
    user: {
      id: row.user_id,
      name: row.name,
      email: row.email,
      memberSince: row.member_since,
    },
    profile: {
      dateOfBirth: row.date_of_birth || null,
      biologicalSex: row.biological_sex || null,
      bloodType: row.blood_type || null,
      allergies: row.allergies || null,
      medicalConditions: row.medical_conditions || null,
      medicationsSummary: row.medications_summary || null,
      emergencyContactName: row.emergency_contact_name || null,
      emergencyContactRelationship: row.emergency_contact_relationship || null,
      emergencyContactPhone: row.emergency_contact_phone || null,
      phone: row.phone || null,
      address: row.address || null,
      organDonor: Boolean(row.organ_donor),
      updatedAt: row.profile_updated_at || null,
    },
    recordsCount: row.records_count || 0,
    activeSharesCount: row.active_shares_count || 0,
  };
}

async function getProfile(req, res, next) {
  try {
    const data = await profileModel.getProfileByUserId(req.user.id);
    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(formatProfileResponse(data));
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const {
      name,
      date_of_birth,
      dateOfBirth,
      biological_sex,
      biologicalSex,
      blood_type,
      bloodType,
      allergies,
      medical_conditions,
      medicalConditions,
      medications_summary,
      medicationsSummary,
      emergency_contact_name,
      emergencyContactName,
      emergency_contact_relationship,
      emergencyContactRelationship,
      emergency_contact_phone,
      emergencyContactPhone,
      phone,
      address,
      organ_donor,
      organDonor,
    } = req.body;

    const sanitizedData = {};

    if (name !== undefined) {
      sanitizedData.name = String(name).trim();
    }

    const rawDob = date_of_birth !== undefined ? date_of_birth : dateOfBirth;
    if (rawDob !== undefined) {
      if (rawDob === '' || rawDob === null) {
        sanitizedData.date_of_birth = null;
      } else {
        const d = new Date(rawDob);
        if (isNaN(d.getTime())) {
          return res.status(400).json({ error: 'Invalid date of birth format' });
        }
        sanitizedData.date_of_birth = rawDob;
      }
    }

    const rawSex = biological_sex !== undefined ? biological_sex : biologicalSex;
    if (rawSex !== undefined) {
      if (rawSex === '' || rawSex === null) {
        sanitizedData.biological_sex = null;
      } else {
        const normalizedSex = String(rawSex).toLowerCase().trim();
        if (!VALID_SEX.includes(normalizedSex)) {
          return res.status(400).json({
            error: `Invalid biological sex. Allowed: ${VALID_SEX.join(', ')}`,
          });
        }
        sanitizedData.biological_sex = normalizedSex;
      }
    }

    const rawBlood = blood_type !== undefined ? blood_type : bloodType;
    if (rawBlood !== undefined) {
      if (rawBlood === '' || rawBlood === null) {
        sanitizedData.blood_type = null;
      } else {
        const normalizedBlood = String(rawBlood).toUpperCase().trim();
        if (!VALID_BLOOD_TYPES.includes(normalizedBlood)) {
          return res.status(400).json({
            error: `Invalid blood type. Allowed: ${VALID_BLOOD_TYPES.join(', ')}`,
          });
        }
        sanitizedData.blood_type = normalizedBlood;
      }
    }

    if (allergies !== undefined) sanitizedData.allergies = allergies ? String(allergies).trim() : null;
    const rawConditions = medical_conditions !== undefined ? medical_conditions : medicalConditions;
    if (rawConditions !== undefined) sanitizedData.medical_conditions = rawConditions ? String(rawConditions).trim() : null;

    const rawMeds = medications_summary !== undefined ? medications_summary : medicationsSummary;
    if (rawMeds !== undefined) sanitizedData.medications_summary = rawMeds ? String(rawMeds).trim() : null;

    const rawEcName = emergency_contact_name !== undefined ? emergency_contact_name : emergencyContactName;
    if (rawEcName !== undefined) sanitizedData.emergency_contact_name = rawEcName ? String(rawEcName).trim() : null;

    const rawEcRel = emergency_contact_relationship !== undefined ? emergency_contact_relationship : emergencyContactRelationship;
    if (rawEcRel !== undefined) sanitizedData.emergency_contact_relationship = rawEcRel ? String(rawEcRel).trim() : null;

    const rawEcPhone = emergency_contact_phone !== undefined ? emergency_contact_phone : emergencyContactPhone;
    if (rawEcPhone !== undefined) sanitizedData.emergency_contact_phone = rawEcPhone ? String(rawEcPhone).trim() : null;

    if (phone !== undefined) sanitizedData.phone = phone ? String(phone).trim() : null;
    if (address !== undefined) sanitizedData.address = address ? String(address).trim() : null;

    const rawOrganDonor = organ_donor !== undefined ? organ_donor : organDonor;
    if (rawOrganDonor !== undefined) sanitizedData.organ_donor = Boolean(rawOrganDonor);

    const updated = await profileModel.upsertProfile(req.user.id, sanitizedData);

    if (
      sanitizedData.emergency_contact_name !== undefined ||
      sanitizedData.emergency_contact_phone !== undefined ||
      sanitizedData.blood_type !== undefined ||
      sanitizedData.allergies !== undefined
    ) {
      try {
        await notificationModel.createNotification({
          userId: req.user.id,
          type: 'emergency_updated',
          title: 'Emergency Medical ID Updated',
          body: 'Your emergency contact and clinical baseline were updated.',
          data: { timestamp: new Date().toISOString() },
        });
      } catch (notifErr) {
        console.error('Failed to create emergency_updated notification:', notifErr);
      }
    }

    res.json(formatProfileResponse(updated));
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'New password must include at least one number' });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ error: 'New password must include at least one uppercase letter' });
    }

    const { rows } = await pool.query(`SELECT password FROM users WHERE id = $1`, [req.user.id]);
    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    const matches = await bcrypt.compare(currentPassword, rows[0].password);
    if (!matches) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await profileModel.updateUserPassword(req.user.id, passwordHash);

    try {
      await notificationModel.createNotification({
        userId: req.user.id,
        type: 'security_alert',
        title: 'Security Alert: Password Changed',
        body: 'Your MedRec account password was successfully updated.',
        data: { timestamp: new Date().toISOString() },
      });
    } catch (notifErr) {
      console.error('Failed to create security_alert notification:', notifErr);
    }

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
}

async function deleteAccount(req, res, next) {
  try {
    const deleted = await profileModel.deleteUserAccount(req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
};
