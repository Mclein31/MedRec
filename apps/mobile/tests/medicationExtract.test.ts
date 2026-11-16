import assert from 'node:assert/strict';
import { test } from 'node:test';
import { draftToMedicationInput, prepareReviewDrafts, validateReviewDraft } from '../src/medications/extract.ts';
import type { ExtractedMedicationLine } from '../src/medications/types.ts';

test('prepares a complete high-confidence 7-day antibiotic prescription with unchecked confirmation', () => {
  const lines: ExtractedMedicationLine[] = [
    {
      name: 'Amoxicillin',
      dosage: '500 mg, 1 capsule',
      frequency: '3 times daily',
      strength: '500 mg',
      dose: '1 capsule',
      scheduleKind: 'daily_times',
      times: ['20:00', '08:00', '14:00'],
      intervalHours: null,
      mealTiming: 'with_meal',
      durationDays: 7,
      endDate: null,
      instructions: 'Finish the full 7-day course.',
      confidence: 'high',
    },
  ];

  const [draft] = prepareReviewDrafts(lines, {
    provider: 'Dr. Elena Santos',
    eventDate: '2026-11-15',
    legible: true,
    today: '2026-11-16',
  });

  assert.ok(draft);
  assert.equal(draft.confirmed, false);
  assert.equal(draft.name, 'Amoxicillin');
  assert.equal(draft.strength, '500 mg');
  assert.equal(draft.dose, '1 capsule');
  assert.equal(draft.rawFrequency, '3 times daily');
  assert.equal(draft.prescriber, 'Dr. Elena Santos');
  assert.equal(draft.prescribedDate, '2026-11-15');
  assert.equal(draft.scheduleKind, 'daily_times');
  assert.deepEqual(draft.times, ['08:00', '14:00', '20:00']);
  assert.equal(draft.mealTiming, 'with_meal');
  assert.equal(draft.startDate, '2026-11-16');
  assert.equal(draft.durationDays, '7');
  assert.equal(draft.endDate, '2026-11-22');
  assert.equal(draft.remindersEnabled, true);
  assert.equal(draft.confidence, 'high');
  assert.deepEqual(draft.lowConfidenceFields, []);
  assert.equal(draft.needsAttention, false);
  assert.deepEqual(validateReviewDraft(draft), {});
});

test('never invents meal anchor times when a prescription says "3 times daily with meals" without clock times', () => {
  const lines: ExtractedMedicationLine[] = [
    {
      name: 'Amoxicillin',
      dosage: '500 mg',
      frequency: '3 times daily with meals',
      strength: '500 mg',
      dose: '1 capsule',
      scheduleKind: 'daily_times',
      times: [],
      mealTiming: 'with_meal',
      durationDays: 7,
      confidence: 'high',
    },
  ];

  const [draft] = prepareReviewDrafts(lines, { today: '2026-11-16' });
  assert.ok(draft);
  assert.deepEqual(draft.times, []);
  assert.equal(draft.confirmed, false);
  assert.equal(draft.lowConfidenceFields.includes('schedule'), true);
  assert.equal(draft.needsAttention, true);

  const errors = validateReviewDraft(draft);
  assert.ok(errors.times);

  // Turning reminders off allows tracking without invented times
  const withoutReminders = { ...draft, remindersEnabled: false };
  assert.deepEqual(validateReviewDraft(withoutReminders), {});
});

test('handles maintenance daily statin with no end date without flagging duration', () => {
  const lines: ExtractedMedicationLine[] = [
    {
      name: 'Atorvastatin',
      dosage: '20 mg',
      frequency: 'once daily at bedtime',
      strength: '20 mg',
      dose: '1 tablet',
      scheduleKind: 'daily_times',
      times: ['21:00'],
      durationDays: null,
      endDate: null,
      confidence: 'high',
    },
  ];

  const [draft] = prepareReviewDrafts(lines, { today: '2026-11-16' });
  assert.ok(draft);
  assert.equal(draft.durationDays, '');
  assert.equal(draft.endDate, '');
  assert.deepEqual(draft.lowConfidenceFields, []);
  assert.equal(draft.needsAttention, false);
  assert.deepEqual(validateReviewDraft(draft), {});
});

test('handles PRN inhaler with no scheduled times and reminders disabled', () => {
  const lines: ExtractedMedicationLine[] = [
    {
      name: 'Albuterol',
      dosage: '90 mcg/actuation',
      frequency: '2 puffs every 4-6 hours as needed',
      strength: '90 mcg/actuation',
      dose: '2 puffs',
      scheduleKind: 'as_needed',
      times: [],
      confidence: 'high',
    },
  ];

  const [draft] = prepareReviewDrafts(lines, { today: '2026-11-16' });
  assert.ok(draft);
  assert.equal(draft.scheduleKind, 'as_needed');
  assert.deepEqual(draft.times, []);
  assert.equal(draft.remindersEnabled, false);
  assert.deepEqual(draft.lowConfidenceFields, []);
  assert.equal(draft.needsAttention, false);
  assert.deepEqual(validateReviewDraft(draft), {});
});

test('flags blurry or low-confidence handwritten prescriptions without inventing missing doses or times', () => {
  const lines: ExtractedMedicationLine[] = [
    {
      name: 'Prednisone',
      dosage: null,
      frequency: null,
      strength: null,
      dose: null,
      scheduleKind: null,
      times: [],
      confidence: 'low',
    },
  ];

  const [draft] = prepareReviewDrafts(lines, { legible: false, today: '2026-11-16' });
  assert.ok(draft);
  assert.equal(draft.confirmed, false);
  assert.equal(draft.confidence, 'low');
  assert.equal(draft.dose, '');
  assert.deepEqual(draft.times, []);
  assert.equal(draft.needsAttention, true);
  assert.equal(draft.lowConfidenceFields.includes('strength'), true);
  assert.equal(draft.lowConfidenceFields.includes('dose'), true);
  assert.equal(draft.lowConfidenceFields.includes('frequency'), true);
  assert.equal(draft.lowConfidenceFields.includes('schedule'), true);

  const errors = validateReviewDraft(draft);
  assert.ok(errors.times);
});

test('drops invalid AI times/dates and flags affected fields; preserves legacy dosage fallback', () => {
  const [bad] = prepareReviewDrafts(
    [
      {
        name: 'Ibuprofen',
        dosage: '400 mg',
        frequency: 'every 8 hours',
        strength: '400 mg',
        dose: '1 tablet',
        scheduleKind: 'interval_hours',
        times: ['08:00', 'morning', '25:99'],
        intervalHours: 8,
        durationDays: 500,
        endDate: '2026-02-30',
        confidence: 'high',
      },
    ],
    { today: '2026-11-16' },
  );

  assert.ok(bad);
  assert.deepEqual(bad.times, ['08:00']);
  assert.equal(bad.durationDays, '');
  assert.equal(bad.endDate, '');
  assert.equal(bad.lowConfidenceFields.includes('schedule'), true);
  assert.equal(bad.lowConfidenceFields.includes('duration'), true);

  const [legacy] = prepareReviewDrafts(
    [{ name: 'Metformin', dosage: '500 mg', frequency: 'twice daily' }],
    { today: '2026-11-16' },
  );
  assert.ok(legacy);
  assert.equal(legacy.dose, '500 mg');
  assert.equal(legacy.confirmed, false);
  assert.equal(legacy.lowConfidenceFields.includes('schedule'), true);
});

test('validateReviewDraft rejects incomplete fields and draftToMedicationInput produces API payload', () => {
  const [draft] = prepareReviewDrafts(
    [
      {
        name: '  Lisinopril  ',
        dosage: '10 mg',
        frequency: 'once daily',
        strength: '10 mg',
        dose: '1 tablet',
        scheduleKind: 'daily_times',
        times: ['08:00'],
        mealTiming: 'anytime',
        durationDays: 30,
        confidence: 'high',
      },
    ],
    { provider: 'Dr. Cruz', eventDate: '2026-11-14', today: '2026-11-16' },
  );
  assert.ok(draft);

  assert.ok(validateReviewDraft({ ...draft, name: '   ' }).name);
  assert.ok(validateReviewDraft({ ...draft, startDate: '2026-02-30' }).startDate);
  assert.ok(validateReviewDraft({ ...draft, endDate: '2026-11-10' }).endDate);
  assert.ok(validateReviewDraft({ ...draft, durationDays: '400' }).durationDays);
  assert.ok(validateReviewDraft({ ...draft, times: ['9:00'] }).times);
  assert.ok(
    validateReviewDraft({ ...draft, scheduleKind: 'interval_hours', intervalHours: null }).times,
  );

  const input = draftToMedicationInput(draft, { personId: 'person-1', sourceRecordId: 'rec-1' });
  assert.deepEqual(input, {
    personId: 'person-1',
    sourceRecordId: 'rec-1',
    name: 'Lisinopril',
    strength: '10 mg',
    dose: '1 tablet',
    instructions: null,
    prescriber: 'Dr. Cruz',
    prescribedDate: '2026-11-14',
    scheduleKind: 'daily_times',
    times: ['08:00'],
    intervalHours: null,
    mealTiming: 'anytime',
    startDate: '2026-11-16',
    endDate: '2026-12-15',
    durationDays: 30,
    remindersEnabled: true,
  });
});
