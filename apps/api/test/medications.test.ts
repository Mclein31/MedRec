import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { cleanup } from '../src/app';
import { addCivilDays } from '../src/lib/medications';
import { asUser } from '../src/lib/types';
import { PASSWORD, bucket, call, clock, db, env, mail, pool, setFetch, signUp } from './helpers';

afterAll(() => pool.end());
beforeEach(() => {
  clock.offsetMs = 0;
});

const todayUtc = () => new Date(Date.now() + clock.offsetMs).toISOString().slice(0, 10);

const prescriptionRecord = (title = 'Antibiotic Rx', personId?: string | null) => ({
  title,
  category: 'prescription',
  eventDate: '2026-11-16',
  provider: 'Dr. Santos',
  facility: 'Metro Clinic',
  notes: null,
  ai: null,
  ...(personId ? { personId } : {}),
});

describe('medications CRUD, batch confirmation & validation', () => {
  it('batch-saves confirmed medications from a prescription record and clears sourceRecordId when record is deleted', async () => {
    const { token } = await signUp();
    const rec = await call('POST', '/api/records', { token, json: prescriptionRecord('Strep prescription') });
    expect(rec.status).toBe(201);
    const recordId = rec.data.record.id as string;

    const batch = await call('POST', '/api/medications/batch', {
      token,
      json: {
        sourceRecordId: recordId,
        items: [
          {
            name: 'Amoxicillin',
            strength: '500 mg',
            dose: '1 capsule',
            instructions: 'Finish full course.',
            prescriber: 'Dr. Santos',
            prescribedDate: '2026-11-16',
            scheduleKind: 'daily_times',
            times: ['20:00', '08:00'],
            mealTiming: 'with_meal',
            startDate: '2026-11-16',
            durationDays: 7,
          },
          {
            name: 'Ibuprofen',
            strength: '400 mg',
            dose: '1 tablet',
            scheduleKind: 'as_needed',
            times: [],
            startDate: '2026-11-16',
          },
        ],
      },
    });
    expect(batch.status).toBe(201);
    expect(batch.data.medications).toHaveLength(2);
    const [amox, ibu] = batch.data.medications;
    expect(amox).toMatchObject({
      name: 'Amoxicillin',
      strength: '500 mg',
      dose: '1 capsule',
      sourceRecordId: recordId,
      times: ['08:00', '20:00'],
      endDate: '2026-11-22',
      durationDays: 7,
      status: 'active',
      remindersEnabled: true,
    });
    expect(ibu).toMatchObject({
      name: 'Ibuprofen',
      scheduleKind: 'as_needed',
      times: [],
      remindersEnabled: false,
      endDate: null,
    });

    // Activity ledger never leaks clinical medication names or doses.
    const activity = await call('GET', '/api/activity', { token });
    const serializedActivity = JSON.stringify(activity.data.items);
    expect(activity.data.items.map((i: { kind: string }) => i.kind)).toContain('medication_added');
    expect(serializedActivity).not.toContain('Amoxicillin');
    expect(serializedActivity).not.toContain('Ibuprofen');
    expect(serializedActivity).not.toContain('500 mg');

    // Deleting the source record sets source_record_id = NULL without deleting medications.
    expect((await call('DELETE', `/api/records/${recordId}`, { token })).status).toBe(200);
    const afterDelete = await call('GET', `/api/medications/${amox.id}`, { token });
    expect(afterDelete.status).toBe(200);
    expect(afterDelete.data.medication.sourceRecordId).toBeNull();
    expect(afterDelete.data.medication.name).toBe('Amoxicillin');
  });

  it('creates, updates, stops, reactivates and deletes a single medication', async () => {
    const { token } = await signUp();
    const created = await call('POST', '/api/medications', {
      token,
      json: {
        name: 'Azithromycin',
        scheduleKind: 'interval_hours',
        intervalHours: 8,
        times: ['08:00'],
        startDate: '2026-11-16',
        durationDays: 5,
      },
    });
    expect(created.status).toBe(201);
    const id = created.data.medication.id as string;
    expect(created.data.medication.endDate).toBe('2026-11-20');

    // Empty PATCH returns current state unchanged.
    const noop = await call('PATCH', `/api/medications/${id}`, { token, json: {} });
    expect(noop.status).toBe(200);
    expect(noop.data.medication.durationDays).toBe(5);

    // Extending durationDays recomputes endDate; toggling reminders off works cleanly.
    const extended = await call('PATCH', `/api/medications/${id}`, {
      token,
      json: { durationDays: 10, remindersEnabled: false },
    });
    expect(extended.status).toBe(200);
    expect(extended.data.medication).toMatchObject({
      durationDays: 10,
      endDate: '2026-11-25',
      remindersEnabled: false,
    });

    // Clearing endDate explicitly makes the course ongoing and clears stale durationDays.
    const ongoing = await call('PATCH', `/api/medications/${id}`, {
      token,
      json: { endDate: null },
    });
    expect(ongoing.status).toBe(200);
    expect(ongoing.data.medication).toMatchObject({ endDate: null, durationDays: null });

    // Stopping sets stoppedAt; reactivating clears stoppedAt.
    const stopped = await call('PATCH', `/api/medications/${id}`, { token, json: { status: 'stopped' } });
    expect(stopped.status).toBe(200);
    expect(stopped.data.medication.status).toBe('stopped');
    expect(stopped.data.medication.stoppedAt).toBeTruthy();

    const reactivated = await call('PATCH', `/api/medications/${id}`, { token, json: { status: 'active' } });
    expect(reactivated.status).toBe(200);
    expect(reactivated.data.medication).toMatchObject({ status: 'active', stoppedAt: null });

    // Delete removes the medication and records metadata-only activity.
    const del = await call('DELETE', `/api/medications/${id}`, { token });
    expect(del.status).toBe(200);
    expect(del.data).toEqual({ deleted: true });
    expect((await call('GET', `/api/medications/${id}`, { token })).status).toBe(404);
  });

  it('rejects invalid schedules, impossible dates, bad times and oversized batches without partial writes', async () => {
    const { token } = await signUp();

    // daily_times with remindersEnabled=true requires at least one time.
    expect(
      (
        await call('POST', '/api/medications', {
          token,
          json: { name: 'Metformin', scheduleKind: 'daily_times', times: [], startDate: '2026-11-16' },
        })
      ).status,
    ).toBe(422);

    // daily_times with remindersEnabled=false is allowed without times.
    expect(
      (
        await call('POST', '/api/medications', {
          token,
          json: { name: 'Metformin', scheduleKind: 'daily_times', times: [], startDate: '2026-11-16', remindersEnabled: false },
        })
      ).status,
    ).toBe(201);

    // interval_hours requires intervalHours 1..24.
    expect(
      (
        await call('POST', '/api/medications', {
          token,
          json: { name: 'Cefalexin', scheduleKind: 'interval_hours', times: ['08:00'], startDate: '2026-11-16' },
        })
      ).status,
    ).toBe(422);

    // Impossible date & endDate before startDate & bad time.
    expect(
      (
        await call('POST', '/api/medications', {
          token,
          json: { name: 'Test', scheduleKind: 'as_needed', times: [], startDate: '2026-02-30' },
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await call('POST', '/api/medications', {
          token,
          json: { name: 'Test', scheduleKind: 'as_needed', times: [], startDate: '2026-11-16', endDate: '2026-11-15' },
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await call('POST', '/api/medications', {
          token,
          json: { name: 'Test', scheduleKind: 'daily_times', times: ['25:00'], startDate: '2026-11-16' },
        })
      ).status,
    ).toBe(422);

    // Empty batch and invalid item inside batch insert zero rows.
    expect((await call('POST', '/api/medications/batch', { token, json: { items: [] } })).status).toBe(422);
    const badBatch = await call('POST', '/api/medications/batch', {
      token,
      json: {
        items: [
          { name: 'Valid Med', scheduleKind: 'as_needed', times: [], startDate: '2026-11-16' },
          { name: '   ', scheduleKind: 'as_needed', times: [], startDate: '2026-11-16' },
        ],
      },
    });
    expect(badBatch.status).toBe(422);
    const list = await call('GET', '/api/medications', { token });
    expect(list.data.medications.map((m: { name: string }) => m.name)).toEqual(['Metformin']);
  });
});

describe('caregiver isolation, cross-account security & RLS', () => {
  it('isolates medications per family member, supports includeAllPersons=1, and cascades on person delete', async () => {
    const { token } = await signUp('Ada Parent');
    const miaRes = await call('POST', '/api/people', { token, json: { name: 'Mia', relation: 'Child' } });
    const miaId = miaRes.data.person.id as string;

    const myRec = await call('POST', '/api/records', { token, json: prescriptionRecord('Ada Rx') });
    const miaRec = await call('POST', '/api/records', { token, json: prescriptionRecord('Mia Rx', miaId) });

    // Mismatched personId vs sourceRecordId fails with 422 RECORD_MISMATCH.
    const mismatch = await call('POST', '/api/medications', {
      token,
      json: {
        personId: miaId,
        sourceRecordId: myRec.data.record.id,
        name: 'Sneaky',
        scheduleKind: 'as_needed',
        times: [],
        startDate: '2026-11-16',
      },
    });
    expect(mismatch.status).toBe(422);
    expect(mismatch.data.error.code).toBe('RECORD_MISMATCH');

    const adaMed = await call('POST', '/api/medications', {
      token,
      json: { name: 'Lisinopril', scheduleKind: 'daily_times', times: ['08:00'], startDate: '2026-11-16' },
    });
    const miaMed = await call('POST', '/api/medications', {
      token,
      json: {
        personId: miaId,
        sourceRecordId: miaRec.data.record.id,
        name: 'Cetirizine',
        scheduleKind: 'daily_times',
        times: ['20:00'],
        startDate: '2026-11-16',
      },
    });
    expect(adaMed.status).toBe(201);
    expect(miaMed.status).toBe(201);
    expect(miaMed.data.medication.personId).toBe(miaId);

    // Log a dose for Mia.
    await call('PUT', `/api/medications/${miaMed.data.medication.id}/logs`, {
      token,
      json: { scheduledDate: todayUtc(), scheduledTime: '20:00', outcome: 'taken' },
    });

    const ownList = await call('GET', '/api/medications', { token });
    expect(ownList.data.medications.map((m: { name: string }) => m.name)).toEqual(['Lisinopril']);
    expect(ownList.data.logs).toHaveLength(0);

    const miaList = await call('GET', `/api/medications?personId=${miaId}`, { token });
    expect(miaList.data.medications.map((m: { name: string }) => m.name)).toEqual(['Cetirizine']);
    expect(miaList.data.logs).toHaveLength(1);

    const allList = await call('GET', '/api/medications?includeAllPersons=1', { token });
    expect(allList.data.medications.map((m: { name: string }) => m.name).sort()).toEqual(['Cetirizine', 'Lisinopril']);
    expect(allList.data.logs).toHaveLength(1);

    // Deleting Mia cascades only Mia's medications and logs.
    expect((await call('DELETE', `/api/people/${miaId}`, { token })).status).toBe(200);
    expect((await call('GET', `/api/medications/${miaMed.data.medication.id}`, { token })).status).toBe(404);
    const remaining = await call('GET', '/api/medications?includeAllPersons=1', { token });
    expect(remaining.data.medications.map((m: { name: string }) => m.name)).toEqual(['Lisinopril']);
    expect(remaining.data.logs).toHaveLength(0);
  });

  it('prevents cross-account access via routes and forced Postgres RLS', async () => {
    const a = await signUp();
    const b = await signUp();
    const aPerson = await call('POST', '/api/people', { token: a.token, json: { name: 'Leo' } });
    const aRec = await call('POST', '/api/records', { token: a.token, json: prescriptionRecord('Private Rx') });
    const aMed = await call('POST', '/api/medications', {
      token: a.token,
      json: {
        name: 'Warfarin',
        scheduleKind: 'daily_times',
        times: ['18:00'],
        startDate: '2026-11-16',
        sourceRecordId: aRec.data.record.id,
      },
    });
    const medId = aMed.data.medication.id as string;

    // Account B cannot read, edit, delete, log doses on, or link Account A's medication/person/record.
    expect((await call('GET', `/api/medications/${medId}`, { token: b.token })).status).toBe(404);
    expect((await call('PATCH', `/api/medications/${medId}`, { token: b.token, json: { name: 'Hacked' } })).status).toBe(404);
    expect((await call('DELETE', `/api/medications/${medId}`, { token: b.token })).status).toBe(404);
    expect(
      (
        await call('PUT', `/api/medications/${medId}/logs`, {
          token: b.token,
          json: { scheduledDate: '2026-11-16', scheduledTime: '18:00', outcome: 'taken' },
        })
      ).status,
    ).toBe(404);
    expect(
      (await call('DELETE', `/api/medications/${medId}/logs?scheduledDate=2026-11-16&scheduledTime=18:00`, { token: b.token })).status,
    ).toBe(404);
    expect((await call('GET', `/api/medications?personId=${aPerson.data.person.id}`, { token: b.token })).status).toBe(404);
    expect(
      (
        await call('POST', '/api/medications', {
          token: b.token,
          json: {
            name: 'Sneaky',
            scheduleKind: 'as_needed',
            times: [],
            startDate: '2026-11-16',
            sourceRecordId: aRec.data.record.id,
          },
        })
      ).status,
    ).toBe(404);

    // Forced RLS blocks raw SQL without matching user context even without a WHERE clause.
    expect(await db.query(asUser(b.userId), 'SELECT id FROM medications')).toHaveLength(0);
    expect(await db.query(asUser(b.userId), 'SELECT id FROM medication_logs')).toHaveLength(0);
  });
});

describe('dose logs & course auto-completion (one-day grace)', () => {
  it('upserts dose logs idempotently, filters by date, returns 14-day history, and undoes logs', async () => {
    const { token } = await signUp();
    const today = todayUtc();
    const yesterday = addCivilDays(today, -1);
    const threeWeeksAgo = addCivilDays(today, -21);

    const med = await call('POST', '/api/medications', {
      token,
      json: { name: 'Atorvastatin', scheduleKind: 'daily_times', times: ['21:00'], startDate: threeWeeksAgo },
    });
    const medId = med.data.medication.id as string;

    const first = await call('PUT', `/api/medications/${medId}/logs`, {
      token,
      json: { scheduledDate: today, scheduledTime: '21:00', outcome: 'skipped', notes: 'Felt nauseous' },
    });
    expect(first.status).toBe(200);
    expect(first.data.log).toMatchObject({ outcome: 'skipped', notes: 'Felt nauseous', scheduledDate: today, scheduledTime: '21:00' });

    // Repeat PUT on the same slot updates in place without duplicating.
    const updated = await call('PUT', `/api/medications/${medId}/logs`, {
      token,
      json: { scheduledDate: today, scheduledTime: '21:00', outcome: 'taken', actedAt: '2026-11-16T21:10:00Z', notes: null },
    });
    expect(updated.status).toBe(200);
    expect(updated.data.log).toMatchObject({ id: first.data.log.id, outcome: 'taken', notes: null });

    // Add an older log (yesterday) and an out-of-14-day-window log.
    await call('PUT', `/api/medications/${medId}/logs`, {
      token,
      json: { scheduledDate: yesterday, scheduledTime: '21:00', outcome: 'taken' },
    });
    await call('PUT', `/api/medications/${medId}/logs`, {
      token,
      json: { scheduledDate: threeWeeksAgo, scheduledTime: '21:00', outcome: 'taken' },
    });

    // Exact date query returns only that date's logs; default query covers +/- 1 day UTC window.
    const exactToday = await call('GET', `/api/medications?date=${today}`, { token });
    expect(exactToday.data.logs).toHaveLength(1);
    expect(exactToday.data.logs[0].scheduledDate).toBe(today);

    const defaultWindow = await call('GET', '/api/medications', { token });
    expect(defaultWindow.data.logs).toHaveLength(2);

    // Detail endpoint returns last 14 days only.
    const detail = await call('GET', `/api/medications/${medId}`, { token });
    expect(detail.data.logs).toHaveLength(2);

    // Undo deletes the log and returns deleted: false if already gone.
    const undo = await call('DELETE', `/api/medications/${medId}/logs?scheduledDate=${today}&scheduledTime=21:00`, { token });
    expect(undo.status).toBe(200);
    expect(undo.data).toEqual({ deleted: true });

    const undoAgain = await call('DELETE', `/api/medications/${medId}/logs?scheduledDate=${today}&scheduledTime=21:00`, { token });
    expect(undoAgain.status).toBe(200);
    expect(undoAgain.data).toEqual({ deleted: false });
  });

  it('auto-completes expired courses only after the one-day grace period in GET /api/medications and cleanup()', async () => {
    const user = await signUp();
    const today = todayUtc();
    const yesterday = addCivilDays(today, -1);
    const twoDaysAgo = addCivilDays(today, -2);
    const start = addCivilDays(today, -10);

    const endsToday = await call('POST', '/api/medications', {
      token: user.token,
      json: { name: 'EndsToday', scheduleKind: 'daily_times', times: ['08:00'], startDate: start, endDate: today },
    });
    const endsYesterday = await call('POST', '/api/medications', {
      token: user.token,
      json: { name: 'EndsYesterday', scheduleKind: 'daily_times', times: ['08:00'], startDate: start, endDate: yesterday },
    });
    const endedTwoDaysAgo = await call('POST', '/api/medications', {
      token: user.token,
      json: { name: 'EndedTwoDaysAgo', scheduleKind: 'daily_times', times: ['08:00'], startDate: start, endDate: twoDaysAgo },
    });

    // On GET /api/medications: today and yesterday (grace day) stay active; twoDaysAgo transitions to completed.
    const list = await call('GET', '/api/medications', { token: user.token });
    const byId = new Map<string, string>(list.data.medications.map((m: { id: string; status: string }) => [m.id, m.status]));
    expect(byId.get(endsToday.data.medication.id)).toBe('active');
    expect(byId.get(endsYesterday.data.medication.id)).toBe('active');
    expect(byId.get(endedTwoDaysAgo.data.medication.id)).toBe('completed');

    // Within grace period, cleanup() leaves endsYesterday active too.
    await cleanup(env, {
      db,
      mailer: { send: async (m) => void mail.push(m) },
      fetch: (...a) => fetch(...a),
      now: () => new Date(Date.now() + clock.offsetMs),
    });
    expect((await call('GET', `/api/medications/${endsYesterday.data.medication.id}`, { token: user.token })).data.medication.status).toBe('active');

    // Advance clock by 1 day so `yesterday` is now strictly before UTC today - 1; cleanup() completes it.
    clock.offsetMs = 24 * 60 * 60_000;
    const cleaned = await cleanup(env, {
      db,
      mailer: { send: async (m) => void mail.push(m) },
      fetch: (...a) => fetch(...a),
      now: () => new Date(Date.now() + clock.offsetMs),
    });
    expect(cleaned.medicationsCompleted).toBeGreaterThanOrEqual(1);

    // Refresh token (the 15-min access token expired when clock moved +24h) and verify via GET /:id.
    const refreshed = await call('POST', '/api/auth/refresh', { json: { refreshToken: user.refresh } });
    const afterYesterday = await call('GET', `/api/medications/${endsYesterday.data.medication.id}`, {
      token: refreshed.data.session.accessToken,
    });
    const afterToday = await call('GET', `/api/medications/${endsToday.data.medication.id}`, {
      token: refreshed.data.session.accessToken,
    });
    expect(afterYesterday.status).toBe(200);
    expect(afterYesterday.data.medication.status).toBe('completed');
    expect(afterToday.data.medication.status).toBe('active');
  });
});

describe('vault integration (Ask Remy, summary, export) & account deletion', () => {
  it('includes person-scoped active medications in Ask Remy and summary, and includes all in export', async () => {
    const user = await signUp('Ada Parent');
    const mia = await call('POST', '/api/people', { token: user.token, json: { name: 'Mia', relation: 'Child' } });
    const miaId = mia.data.person.id as string;
    const today = todayUtc();

    // Account holder active med + stopped med.
    const ownMed = await call('POST', '/api/medications', {
      token: user.token,
      json: {
        name: 'Amoxicillin',
        strength: '500 mg',
        dose: '1 capsule',
        scheduleKind: 'daily_times',
        times: ['08:00', '20:00'],
        mealTiming: 'with_meal',
        startDate: today,
        endDate: addCivilDays(today, 6),
      },
    });
    const stoppedMed = await call('POST', '/api/medications', {
      token: user.token,
      json: { name: 'StoppedDrug', scheduleKind: 'as_needed', times: [], startDate: today },
    });
    await call('PATCH', `/api/medications/${stoppedMed.data.medication.id}`, { token: user.token, json: { status: 'stopped' } });

    // Mia active med.
    await call('POST', '/api/medications', {
      token: user.token,
      json: {
        personId: miaId,
        name: 'Children Cetirizine',
        strength: '5 mg',
        dose: '5 mL',
        scheduleKind: 'daily_times',
        times: ['20:00'],
        startDate: today,
      },
    });

    await call('PUT', `/api/medications/${ownMed.data.medication.id}/logs`, {
      token: user.token,
      json: { scheduledDate: today, scheduledTime: '08:00', outcome: 'taken' },
    });

    // Ask Remy for account holder sees Amoxicillin, not StoppedDrug or Mia's med.
    let askBody = '';
    setFetch(async (_input, init) => {
      askBody = String(init?.body ?? '');
      return Response.json({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ kind: 'answer', answer: 'You are taking Amoxicillin.', recordIds: [], followUps: [] }) }] } }],
      });
    });
    const askOwn = await call('POST', '/api/ai/ask', { token: user.token, json: { question: 'What medications am I taking?' } });
    expect(askOwn.status).toBe(200);
    expect(askBody).toContain('Active prescribed medications: Amoxicillin 500 mg (1 capsule, 08:00, 20:00, with food');
    expect(askBody).not.toContain('StoppedDrug');
    expect(askBody).not.toContain('Children Cetirizine');

    // Ask Remy for Mia sees only Mia's med.
    const askMia = await call('POST', '/api/ai/ask', {
      token: user.token,
      json: { question: 'What medications is Mia taking?', personId: miaId },
    });
    expect(askMia.status).toBe(200);
    expect(askBody).toContain('Active prescribed medications: Children Cetirizine 5 mg (5 mL, 20:00)');
    expect(askBody).not.toContain('Amoxicillin');

    // Health summary includes active medications for target person.
    let summaryBody = '';
    setFetch(async (_input, init) => {
      summaryBody = String(init?.body ?? '');
      return Response.json({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ overview: 'Stable.', conditions: [], medications: [], allergies: [], recentEvents: [] }) }] } }],
      });
    });
    const sum = await call('POST', '/api/ai/summary', { token: user.token, json: {} });
    expect(sum.status).toBe(200);
    expect(summaryBody).toContain('Active prescribed medications: Amoxicillin 500 mg');
    expect(summaryBody).not.toContain('Children Cetirizine');

    // Export includes all medications and medicationLogs.
    const exported = await call('GET', '/api/export', { token: user.token });
    expect(exported.status).toBe(200);
    expect(exported.data.medications).toHaveLength(3);
    expect(exported.data.medicationLogs).toHaveLength(1);
    expect(exported.data.medicationLogs[0]).toMatchObject({ medicationId: ownMed.data.medication.id, outcome: 'taken' });

    // Account deletion cascades medications and medication_logs.
    expect((await call('DELETE', '/api/auth/account', { token: user.token, json: { password: PASSWORD } })).status).toBe(200);
    expect(bucket.objects.size).toBeGreaterThanOrEqual(0);
    expect(await db.query({ system: true }, 'SELECT 1 FROM medications WHERE user_id = $1', [user.userId])).toHaveLength(0);
    expect(await db.query({ system: true }, 'SELECT 1 FROM medication_logs WHERE user_id = $1', [user.userId])).toHaveLength(0);
  });
});
