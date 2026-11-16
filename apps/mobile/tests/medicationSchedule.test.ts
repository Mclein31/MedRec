import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_SCHEDULED_NOTIFICATIONS,
  addCivilDays,
  buildDaySchedule,
  buildRollingNotificationPlan,
  computeEndDate,
  computeSnoozeTrigger,
  expandDailyTimes,
  formatNotificationCopy,
  formatScheduleSummary,
  formatTime12,
  isCourseEnded,
  isValidTime24,
  needsTimezoneReschedule,
  parseLocalSlotDate,
} from '../src/medications/schedule.ts';
import type { Medication, MedicationLog } from '../src/medications/types.ts';

function makeMed(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'med-1',
    personId: null,
    sourceRecordId: null,
    name: 'Amoxicillin',
    strength: '500 mg',
    dose: '1 capsule',
    instructions: 'Finish full course',
    prescriber: 'Dr. Rivera',
    prescribedDate: '2026-11-16',
    scheduleKind: 'daily_times',
    times: ['08:00', '20:00'],
    intervalHours: null,
    mealTiming: 'with_meal',
    startDate: '2026-11-16',
    endDate: '2026-11-22',
    durationDays: 7,
    status: 'active',
    remindersEnabled: true,
    confirmedAt: '2026-11-16T07:00:00.000Z',
    stoppedAt: null,
    createdAt: '2026-11-16T07:00:00.000Z',
    updatedAt: '2026-11-16T07:00:00.000Z',
    ...overrides,
  };
}

function makeLog(overrides: Partial<MedicationLog> = {}): MedicationLog {
  return {
    id: 'log-1',
    medicationId: 'med-1',
    scheduledDate: '2026-11-16',
    scheduledTime: '08:00',
    outcome: 'taken',
    actedAt: '2026-11-16T08:04:00.000Z',
    notes: null,
    ...overrides,
  };
}

test('validates 24-hour times and formats 12-hour labels', () => {
  assert.equal(isValidTime24('00:00'), true);
  assert.equal(isValidTime24('08:05'), true);
  assert.equal(isValidTime24('23:59'), true);
  assert.equal(isValidTime24('8:00'), false);
  assert.equal(isValidTime24('24:00'), false);
  assert.equal(isValidTime24('12:60'), false);
  assert.equal(isValidTime24('morning'), false);

  assert.equal(formatTime12('00:00'), '12:00 AM');
  assert.equal(formatTime12('08:00'), '8:00 AM');
  assert.equal(formatTime12('12:00'), '12:00 PM');
  assert.equal(formatTime12('14:30'), '2:30 PM');
  assert.equal(formatTime12('20:00'), '8:00 PM');
  assert.equal(formatTime12('23:59'), '11:59 PM');
});

test('expands daily_times (1x-4x) and interval_hours (4h, 6h, 8h, 12h) without inventing anchors', () => {
  assert.deepEqual(
    expandDailyTimes({ scheduleKind: 'daily_times', times: ['20:00', '08:00', '08:00'], intervalHours: null }),
    ['08:00', '20:00'],
  );
  assert.deepEqual(
    expandDailyTimes({ scheduleKind: 'daily_times', times: ['07:00', '12:00', '17:00', '22:00'], intervalHours: null }),
    ['07:00', '12:00', '17:00', '22:00'],
  );

  // Every 8 hours anchored from 08:00 -> 00:00, 08:00, 16:00
  assert.deepEqual(
    expandDailyTimes({ scheduleKind: 'interval_hours', times: ['08:00'], intervalHours: 8 }),
    ['00:00', '08:00', '16:00'],
  );
  // Every 12 hours
  assert.deepEqual(
    expandDailyTimes({ scheduleKind: 'interval_hours', times: ['08:00'], intervalHours: 12 }),
    ['08:00', '20:00'],
  );
  // Every 6 hours
  assert.deepEqual(
    expandDailyTimes({ scheduleKind: 'interval_hours', times: ['08:00'], intervalHours: 6 }),
    ['02:00', '08:00', '14:00', '20:00'],
  );
  // Every 4 hours
  assert.deepEqual(
    expandDailyTimes({ scheduleKind: 'interval_hours', times: ['08:00'], intervalHours: 4 }),
    ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
  );
  // Missing anchor or interval produces empty list (never invents default time)
  assert.deepEqual(
    expandDailyTimes({ scheduleKind: 'interval_hours', times: [], intervalHours: 8 }),
    [],
  );
  assert.deepEqual(
    expandDailyTimes({ scheduleKind: 'interval_hours', times: ['08:00'], intervalHours: null }),
    [],
  );
  // as_needed expands to 0 times
  assert.deepEqual(
    expandDailyTimes({ scheduleKind: 'as_needed', times: ['08:00'], intervalHours: null }),
    [],
  );
});

test('formats schedule summaries and meal timing labels cleanly', () => {
  assert.equal(
    formatScheduleSummary({ scheduleKind: 'daily_times', times: ['08:00'], intervalHours: null, mealTiming: 'before_meal' }),
    'Once daily · 8:00 AM · Before meals',
  );
  assert.equal(
    formatScheduleSummary({ scheduleKind: 'daily_times', times: ['08:00', '20:00'], intervalHours: null, mealTiming: 'with_meal' }),
    'Twice daily · 8:00 AM, 8:00 PM · With food',
  );
  assert.equal(
    formatScheduleSummary({ scheduleKind: 'daily_times', times: ['08:00', '14:00', '20:00'], intervalHours: null, mealTiming: 'after_meal' }),
    '3 times daily · 8:00 AM, 2:00 PM, 8:00 PM · After meals',
  );
  assert.equal(
    formatScheduleSummary({ scheduleKind: 'daily_times', times: ['08:00'], intervalHours: null, mealTiming: 'anytime' }),
    'Once daily · 8:00 AM',
  );
  assert.equal(
    formatScheduleSummary({ scheduleKind: 'interval_hours', times: ['08:00'], intervalHours: 8, mealTiming: null }),
    'Every 8 hours · From 8:00 AM',
  );
  assert.equal(
    formatScheduleSummary({ scheduleKind: 'as_needed', times: [], intervalHours: null, mealTiming: 'with_meal' }),
    'As needed · With food',
  );
});

test('computes civil end dates and detects ended courses deterministically', () => {
  assert.equal(addCivilDays('2026-11-16', 6), '2026-11-22');
  assert.equal(addCivilDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addCivilDays('2026-02-28', 1), '2026-03-01');
  assert.equal(addCivilDays('2026-12-31', 1), '2027-01-01');

  assert.equal(computeEndDate('2026-11-16', 7), '2026-11-22');
  assert.equal(computeEndDate('2026-11-16', 1), '2026-11-16');
  assert.equal(computeEndDate('2026-11-16', null), null);
  assert.equal(computeEndDate('2026-11-16', 0), null);

  assert.equal(isCourseEnded({ status: 'active', endDate: '2026-11-22' }, '2026-11-22'), false);
  assert.equal(isCourseEnded({ status: 'active', endDate: '2026-11-22' }, '2026-11-23'), true);
  assert.equal(isCourseEnded({ status: 'active', endDate: null }, '2026-11-23'), false);
  assert.equal(isCourseEnded({ status: 'stopped', endDate: '2026-11-30' }, '2026-11-16'), true);
  assert.equal(isCourseEnded({ status: 'completed', endDate: '2026-11-30' }, '2026-11-16'), true);
});

test('buildDaySchedule returns chronological slots with logs and clears snooze once logged', () => {
  const medA = makeMed({ id: 'med-a', name: 'Amoxicillin', times: ['08:00', '20:00'] });
  const medB = makeMed({ id: 'med-b', name: 'Metformin', times: ['08:00', '14:00'], remindersEnabled: false });
  const medPrn = makeMed({ id: 'med-prn', name: 'Albuterol', scheduleKind: 'as_needed', times: [], remindersEnabled: false });
  const medFuture = makeMed({ id: 'med-future', name: 'Cefuroxime', startDate: '2026-11-18', endDate: '2026-11-25' });

  const logs = [makeLog({ medicationId: 'med-a', scheduledDate: '2026-11-16', scheduledTime: '08:00', outcome: 'taken' })];
  const snoozes = {
    'med-a:2026-11-16:08:00': '2026-11-16T08:15:00.000Z',
    'med-b:2026-11-16:14:00': '2026-11-16T14:15:00.000Z',
  };

  const slots = buildDaySchedule([medA, medB, medPrn, medFuture], logs, snoozes, '2026-11-16');
  assert.equal(slots.length, 4);
  assert.deepEqual(
    slots.map((s) => `${s.medicationId}:${s.scheduledTime}`),
    ['med-a:08:00', 'med-b:08:00', 'med-b:14:00', 'med-a:20:00'],
  );
  assert.equal(slots[0]!.outcome, 'taken');
  assert.equal(slots[0]!.snoozedUntil, null);
  assert.equal(slots[2]!.snoozedUntil, '2026-11-16T14:15:00.000Z');
});

test('rolling notification plan enforces endDate cutoff, excludes logged/PRN/disabled meds, and caps at 48', () => {
  const now = parseLocalSlotDate('2026-11-16', '09:00');

  // 1-day course ending today: includes 20:00 today, excludes 08:00 past today, excludes tomorrow
  const shortCourse = makeMed({
    id: 'short',
    times: ['08:00', '20:00'],
    startDate: '2026-11-16',
    endDate: '2026-11-16',
    durationDays: 1,
  });
  const prn = makeMed({ id: 'prn', scheduleKind: 'as_needed', times: [], remindersEnabled: false });
  const silent = makeMed({ id: 'silent', times: ['12:00'], remindersEnabled: false });

  const smallPlan = buildRollingNotificationPlan([shortCourse, prn, silent], [], now, 14);
  assert.equal(smallPlan.truncated, false);
  assert.equal(smallPlan.renewalTriggerAt, null);
  assert.equal(smallPlan.slots.length, 1);
  assert.equal(smallPlan.slots[0]!.slotKey, 'short:2026-11-16:20:00');

  // Excludes already-logged doses (taken or skipped)
  const loggedPlan = buildRollingNotificationPlan(
    [shortCourse],
    [makeLog({ medicationId: 'short', scheduledDate: '2026-11-16', scheduledTime: '20:00', outcome: 'skipped' })],
    now,
    14,
  );
  assert.equal(loggedPlan.slots.length, 0);

  // 10 active medications x 4 doses/day = 40 doses/day -> exceeds 47 slots and triggers slot #48 renewal
  const heavyMeds = Array.from({ length: 10 }, (_, idx) =>
    makeMed({
      id: `heavy-${idx}`,
      personId: idx % 2 === 0 ? null : 'person-mia',
      name: `Med ${idx}`,
      times: ['08:00', '12:00', '16:00', '20:00'],
      startDate: '2026-11-16',
      endDate: null,
      durationDays: null,
    }),
  );

  const cappedPlan = buildRollingNotificationPlan(heavyMeds, [], now, 14);
  assert.equal(MAX_SCHEDULED_NOTIFICATIONS, 48);
  assert.equal(cappedPlan.slots.length, 47);
  assert.equal(cappedPlan.truncated, true);
  assert.ok(cappedPlan.renewalTriggerAt);
  const lastTriggerMs = cappedPlan.slots[46]!.triggerAt.getTime();
  assert.equal(cappedPlan.renewalTriggerAt.getTime(), lastTriggerMs + 60 * 60 * 1000);
});

test('exact boundary of 47 future doses is not truncated; 48 future doses triggers slot #48 renewal', () => {
  const now = parseLocalSlotDate('2026-11-16', '07:00');
  // 1 med x 4 doses/day over 12 days = 48 doses -> truncated to 47 + 1 renewal
  const med48 = makeMed({
    id: 'm48',
    times: ['08:00', '12:00', '16:00', '20:00'],
    startDate: '2026-11-16',
    endDate: '2026-11-27',
    durationDays: 12,
  });
  const plan48 = buildRollingNotificationPlan([med48], [], now, 14);
  assert.equal(plan48.slots.length, 47);
  assert.equal(plan48.truncated, true);
  assert.ok(plan48.renewalTriggerAt);

  // Logged one dose -> 47 remaining future doses -> not truncated
  const plan47 = buildRollingNotificationPlan(
    [med48],
    [makeLog({ medicationId: 'm48', scheduledDate: '2026-11-16', scheduledTime: '08:00' })],
    now,
    14,
  );
  assert.equal(plan47.slots.length, 47);
  assert.equal(plan47.truncated, false);
  assert.equal(plan47.renewalTriggerAt, null);
});

test('snooze trigger adds exact elapsed minutes', () => {
  const base = new Date('2026-11-16T08:00:00.000Z');
  assert.equal(computeSnoozeTrigger(base, 15).toISOString(), '2026-11-16T08:15:00.000Z');
  assert.equal(computeSnoozeTrigger(base).toISOString(), '2026-11-16T08:15:00.000Z');
  assert.equal(computeSnoozeTrigger(base, 30).toISOString(), '2026-11-16T08:30:00.000Z');
});

test('lock-screen privacy copy hides all clinical fields by default and shows details when opted in', () => {
  const slot = {
    medicationName: 'Amoxicillin',
    strength: '500 mg',
    dose: '1 capsule',
    mealTiming: 'with_meal' as const,
    scheduledTime: '08:00',
  };

  const quietSelf = formatNotificationCopy(slot, { showNames: false });
  assert.equal(quietSelf.title, 'MedRec reminder');
  assert.equal(quietSelf.body, 'Time for your 8:00 AM scheduled medication. Open MedRec to view and log your dose.');
  for (const secret of ['Amoxicillin', '500 mg', '1 capsule', 'With food']) {
    assert.equal(quietSelf.title.includes(secret), false);
    assert.equal(quietSelf.body.includes(secret), false);
  }

  const quietFamily = formatNotificationCopy(slot, { showNames: false, personName: 'Mia' });
  assert.equal(quietFamily.title, 'MedRec · For Mia');
  assert.equal(quietFamily.body, "Time for Mia's 8:00 AM scheduled medication. Open MedRec to view details.");
  for (const secret of ['Amoxicillin', '500 mg', '1 capsule', 'With food']) {
    assert.equal(quietFamily.title.includes(secret), false);
    assert.equal(quietFamily.body.includes(secret), false);
  }

  const detailedSelf = formatNotificationCopy(slot, { showNames: true });
  assert.equal(detailedSelf.title, 'Time for Amoxicillin (500 mg)');
  assert.equal(detailedSelf.body, '1 capsule · With food · 8:00 AM');

  const detailedFamily = formatNotificationCopy(slot, { showNames: true, personName: 'Mia' });
  assert.equal(detailedFamily.title, 'Mia · Amoxicillin (500 mg)');
  assert.equal(detailedFamily.body, '1 capsule · With food · 8:00 AM');
});

test('DST and timezone handling preserves wall-clock slot times and detects timezone shifts', () => {
  const prevTz = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    const springForward = parseLocalSlotDate('2026-03-08', '08:00');
    assert.equal(springForward.getFullYear(), 2026);
    assert.equal(springForward.getMonth(), 2);
    assert.equal(springForward.getDate(), 8);
    assert.equal(springForward.getHours(), 8);
    assert.equal(springForward.getMinutes(), 0);

    const fallBack = parseLocalSlotDate('2026-11-01', '08:00');
    assert.equal(fallBack.getFullYear(), 2026);
    assert.equal(fallBack.getMonth(), 10);
    assert.equal(fallBack.getDate(), 1);
    assert.equal(fallBack.getHours(), 8);
    assert.equal(fallBack.getMinutes(), 0);
  } finally {
    if (prevTz === undefined) delete process.env.TZ;
    else process.env.TZ = prevTz;
  }

  assert.equal(needsTimezoneReschedule(null, 'America/New_York'), true);
  assert.equal(needsTimezoneReschedule(undefined, 'America/New_York'), true);
  assert.equal(needsTimezoneReschedule('America/Los_Angeles', 'America/New_York'), true);
  assert.equal(needsTimezoneReschedule('America/New_York', 'America/New_York'), false);
});
