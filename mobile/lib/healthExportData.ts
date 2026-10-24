// Pure archive/print helpers: no local paths, signed URLs, or attachment bytes.
type Source = Record<string, unknown>;
type RecordSource = {
  id?: unknown; title?: unknown; type?: unknown; date?: unknown; description?: unknown;
  created_at?: unknown; updated_at?: unknown; attachment_url?: unknown;
  attachmentUrl?: unknown; attachmentPath?: unknown;
};

const text = (value: unknown): string | null =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : null;

export function buildHealthArchive(profileResponse: Source, records: RecordSource[], exportedAt = new Date().toISOString()) {
  const user = profileResponse.user as Source | undefined;
  const profile = profileResponse.profile as Source | undefined;
  if (!user || !profile) throw new Error('Your profile could not be loaded. Please try again.');
  const expectedCount = Number(profileResponse.recordsCount);
  if (Number.isFinite(expectedCount) && expectedCount !== records.length) {
    throw new Error('Your vault changed while exporting. Please try again to include every record.');
  }

  return {
    application: 'MedRec Health Vault',
    schemaVersion: 1,
    exportedAt,
    contents: 'Patient profile and record metadata/text. Attachment files and profile photos are not embedded.',
    user: { name: text(user.name), email: text(user.email) },
    profile: {
      dateOfBirth: text(profile.dateOfBirth), biologicalSex: text(profile.biologicalSex),
      height: text(profile.height), weight: text(profile.weight), bloodType: text(profile.bloodType),
      allergies: text(profile.allergies), medicalConditions: text(profile.medicalConditions),
      medicationsSummary: text(profile.medicationsSummary), phone: text(profile.phone),
      address: text(profile.address), organDonor: typeof profile.organDonor === 'boolean' ? profile.organDonor : null,
      emergencyContact: {
        name: text(profile.emergencyContactName), relationship: text(profile.emergencyContactRelationship),
        phone: text(profile.emergencyContactPhone),
      },
    },
    recordsCount: records.length,
    records: records.map((record) => ({
      id: text(record.id), title: text(record.title), type: text(record.type), date: text(record.date),
      description: text(record.description), createdAt: text(record.created_at), updatedAt: text(record.updated_at),
      hasAttachment: Boolean(record.attachment_url || record.attachmentUrl || record.attachmentPath),
    })),
  };
}

export type HealthArchive = ReturnType<typeof buildHealthArchive>;

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

export function buildHealthHistoryHtml(archive: HealthArchive): string {
  const value = (entry: unknown) => escapeHtml(entry === null || entry === undefined || entry === '' ? 'Not recorded' : entry);
  const row = (label: string, entry: unknown) => `<div class="field"><dt>${escapeHtml(label)}</dt><dd>${value(entry)}</dd></div>`;
  const profile = archive.profile;
  const records = archive.records.map((record) => `<article>
    <div class="record-meta">${value(record.date)} · ${value(record.type)}</div>
    <h3>${value(record.title)}</h3><p class="notes">${value(record.description)}</p>
    ${record.hasAttachment ? '<p class="attachment">Attachment on file — not included in this history.</p>' : ''}
  </article>`).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>MedRec — Patient health history</title><style>
    @page{size:A4;margin:18mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#183330;font-size:11pt;line-height:1.5;margin:0}
    header{border-bottom:3px solid #278C80;padding-bottom:18px;margin-bottom:24px}.brand{font-size:10pt;letter-spacing:2px;color:#278C80;font-weight:bold}
    h1{font-size:26pt;line-height:1.15;margin:8px 0}h2{font-size:15pt;margin:26px 0 12px}h3{font-size:13pt;line-height:1.3;margin:6px 0}
    p{margin:6px 0}.muted,.record-meta,.attachment{font-size:9pt;color:#566D68}.field{display:flex;border-bottom:1px solid #E0E9E6;padding:7px 0;break-inside:avoid}
    dt{width:38%;font-weight:bold;padding-right:14px}dd{margin:0;flex:1;white-space:pre-wrap;overflow-wrap:anywhere}dl{margin:0}
    article{border-top:1px solid #C9DAD4;padding:14px 0;break-inside:auto}h3,.record-meta{break-after:avoid}.notes{white-space:pre-wrap;overflow-wrap:anywhere}
    footer{border-top:1px solid #C9DAD4;margin-top:28px;padding-top:10px;font-size:9pt;color:#566D68}
    </style></head><body><header><div class="brand">MEDREC / HEALTH HISTORY</div><h1>${value(archive.user.name)}</h1>
    <p>${value(archive.user.email)}</p><p class="muted">Prepared ${escapeHtml(archive.exportedAt.slice(0, 10))} · ${archive.recordsCount} records</p></header>
    <h2>Patient information</h2><dl>${row('Date of birth', profile.dateOfBirth)}${row('Biological sex', profile.biologicalSex)}
    ${row('Height (cm)', profile.height)}${row('Weight (kg)', profile.weight)}${row('Phone', profile.phone)}${row('Address', profile.address)}</dl>
    <h2>Medical information</h2><dl>${row('Blood type', profile.bloodType)}${row('Allergies', profile.allergies)}
    ${row('Medical conditions', profile.medicalConditions)}${row('Medications', profile.medicationsSummary)}
    ${row('Organ donor', profile.organDonor === null ? null : profile.organDonor ? 'Yes (patient reported)' : 'No / not registered')}
    ${row('Emergency contact', profile.emergencyContact.name)}${row('Relationship', profile.emergencyContact.relationship)}${row('Emergency phone', profile.emergencyContact.phone)}</dl>
    <h2>Record history</h2>${records || '<p>No medical records in this vault.</p>'}
    <footer>${escapeHtml(archive.contents)}<p>This history contains patient-entered information. Verify it with the patient and original clinical documents.</p></footer>
    </body></html>`;
}
