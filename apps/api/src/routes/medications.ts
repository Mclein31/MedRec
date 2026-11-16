import { Hono } from 'hono';
import { requireAuth } from '../lib/auth';
import { body } from '../lib/http';
import {
  addCivilDays,
  CivilDate,
  completeExpiredMedications,
  computeEndDate,
  DoseLogSchema,
  mapMedication,
  mapMedicationLog,
  MEDICATION_COLUMNS,
  MEDICATION_LOG_COLUMNS,
  MEDICATION_LOG_RETURNING,
  MEDICATION_RETURNING,
  MedicationBatchSchema,
  MedicationCreateSchema,
  MedicationPatchSchema,
  normalizeScheduleAndDates,
  Time24,
  toIso,
  Uuid,
  type MedicationLogRow,
  type MedicationRow,
} from '../lib/medications';
import { personFilter, resolvePerson } from '../lib/people';
import { logActivity } from '../lib/security';
import { asUser, HttpError, type AppEnv, type Db } from '../lib/types';

export const medications = new Hono<AppEnv>();
medications.use('*', requireAuth);

const notFound = () => new HttpError(404, 'NOT_FOUND', 'That medication was deleted or never existed.');

async function loadOwnedMedication(db: Db, userId: string, id: string): Promise<MedicationRow> {
  if (!Uuid.safeParse(id).success) throw notFound();
  const [row] = await db.query<MedicationRow>(
    asUser(userId),
    `SELECT ${MEDICATION_COLUMNS} FROM medications m WHERE m.id = $1 AND m.user_id = $2`,
    [id, userId],
  );
  if (!row) throw notFound();
  return row;
}

async function verifySourceRecord(db: Db, userId: string, recordId: string, expectedPersonId: string | null) {
  const [rec] = await db.query<{ id: string; person_id: string | null }>(
    asUser(userId),
    'SELECT id, person_id FROM records WHERE id = $1 AND user_id = $2',
    [recordId, userId],
  );
  if (!rec) throw new HttpError(404, 'NOT_FOUND', 'That source record was deleted or does not exist.');
  if ((rec.person_id ?? null) !== expectedPersonId) {
    throw new HttpError(422, 'RECORD_MISMATCH', 'That source record belongs to someone else on this account.', { field: 'sourceRecordId' });
  }
}

interface PreparedInsert {
  personId: string | null;
  sourceRecordId: string | null;
  name: string;
  strength: string | null;
  dose: string | null;
  instructions: string | null;
  prescriber: string | null;
  prescribedDate: string | null;
  scheduleKind: 'daily_times' | 'interval_hours' | 'as_needed';
  times: string[];
  intervalHours: number | null;
  mealTiming: 'before_meal' | 'with_meal' | 'after_meal' | 'anytime' | null;
  startDate: string;
  endDate: string | null;
  durationDays: number | null;
  remindersEnabled: boolean;
}

async function insertMedications(db: Db, userId: string, items: PreparedInsert[], now: Date): Promise<MedicationRow[]> {
  const nowIso = now.toISOString();
  const values: string[] = [];
  const params: unknown[] = [];

  for (const item of items) {
    const p = (v: unknown) => `$${params.push(v)}`;
    values.push(
      `(${p(userId)}::uuid, ${p(item.personId)}::uuid, ${p(item.sourceRecordId)}::uuid, ${p(item.name)}, ${p(item.strength)}, ${p(item.dose)}, ` +
        `${p(item.instructions)}, ${p(item.prescriber)}, ${p(item.prescribedDate)}::date, ${p(item.scheduleKind)}, ${p(item.times)}::text[], ` +
        `${p(item.intervalHours)}::integer, ${p(item.mealTiming)}, ${p(item.startDate)}::date, ${p(item.endDate)}::date, ` +
        `${p(item.durationDays)}::integer, ${p(item.remindersEnabled)}::boolean, ${p(nowIso)}::timestamptz, ${p(nowIso)}::timestamptz, ${p(nowIso)}::timestamptz)`,
    );
  }

  return db.query<MedicationRow>(
    asUser(userId),
    `INSERT INTO medications (
       user_id, person_id, source_record_id, name, strength, dose, instructions, prescriber, prescribed_date,
       schedule_kind, times, interval_hours, meal_timing, start_date, end_date, duration_days,
       reminders_enabled, confirmed_at, created_at, updated_at
     ) VALUES ${values.join(', ')}
     RETURNING ${MEDICATION_RETURNING}`,
    params,
  );
}

medications.get('/', async (c) => {
  const { db, now } = c.get('services');
  const userId = c.get('userId');
  const currentNow = now();
  await completeExpiredMedications(db, asUser(userId), currentNow, userId);

  const rawIncludeAll = c.req.query('includeAllPersons');
  const includeAllPersons = rawIncludeAll === '1' || rawIncludeAll === 'true';

  const rawDate = c.req.query('date');
  let requestedDate: string | null = null;
  if (rawDate !== undefined && rawDate !== '') {
    const parsed = CivilDate.safeParse(rawDate);
    if (!parsed.success) {
      throw new HttpError(422, 'VALIDATION', 'date: Use YYYY-MM-DD.', { field: 'date' });
    }
    requestedDate = parsed.data;
  }

  const person = includeAllPersons ? null : await resolvePerson(db, userId, c.req.query('personId'));

  const medRows = includeAllPersons
    ? await db.query<MedicationRow>(
        asUser(userId),
        `SELECT ${MEDICATION_COLUMNS} FROM medications m
          WHERE m.user_id = $1
          ORDER BY (m.status = 'active') DESC, m.created_at DESC`,
        [userId],
      )
    : await db.query<MedicationRow>(
        asUser(userId),
        `SELECT ${MEDICATION_COLUMNS} FROM medications m
          WHERE m.user_id = $1 AND ${personFilter('m', 2)}
          ORDER BY (m.status = 'active') DESC, m.created_at DESC`,
        [userId, person?.id ?? null],
      );

  const utcToday = currentNow.toISOString().slice(0, 10);
  const startDate = requestedDate ?? addCivilDays(utcToday, -1);
  const endDate = requestedDate ?? addCivilDays(utcToday, 1);

  const logRows = includeAllPersons
    ? await db.query<MedicationLogRow>(
        asUser(userId),
        `SELECT ${MEDICATION_LOG_COLUMNS} FROM medication_logs l
          WHERE l.user_id = $1 AND l.scheduled_date BETWEEN $2::date AND $3::date
          ORDER BY l.scheduled_date DESC, l.scheduled_time ASC, l.acted_at DESC`,
        [userId, startDate, endDate],
      )
    : await db.query<MedicationLogRow>(
        asUser(userId),
        `SELECT ${MEDICATION_LOG_COLUMNS} FROM medication_logs l
          JOIN medications m ON m.id = l.medication_id
          WHERE l.user_id = $1 AND m.user_id = $1 AND ${personFilter('m', 2)}
            AND l.scheduled_date BETWEEN $3::date AND $4::date
          ORDER BY l.scheduled_date DESC, l.scheduled_time ASC, l.acted_at DESC`,
        [userId, person?.id ?? null, startDate, endDate],
      );

  return c.json({
    medications: medRows.map(mapMedication),
    logs: logRows.map(mapMedicationLog),
  });
});

medications.post('/batch', async (c) => {
  const input = await body(c, MedicationBatchSchema);
  const { db, now } = c.get('services');
  const userId = c.get('userId');

  const hasTopPerson = input.personId !== undefined;
  const topPerson = hasTopPerson ? await resolvePerson(db, userId, input.personId) : null;
  const defaultSourceRecordId = input.sourceRecordId ?? null;

  const prepared: PreparedInsert[] = [];
  const checkedRecords = new Map<string, string | null>();
  const resolvedItemPeople = new Map<string, string | null>();

  for (const item of input.items) {
    let itemPersonId: string | null;
    if (item.personId === undefined) {
      itemPersonId = topPerson?.id ?? null;
    } else {
      const rawNormalized = item.personId && item.personId !== 'me' ? item.personId : null;
      if (hasTopPerson && rawNormalized !== (topPerson?.id ?? null)) {
        throw new HttpError(422, 'VALIDATION', 'All medications in a batch must belong to the same person.', { field: 'personId' });
      }
      if (!rawNormalized) {
        itemPersonId = null;
      } else if (resolvedItemPeople.has(rawNormalized)) {
        itemPersonId = resolvedItemPeople.get(rawNormalized)!;
      } else {
        const resolved = await resolvePerson(db, userId, rawNormalized);
        itemPersonId = resolved?.id ?? null;
        resolvedItemPeople.set(rawNormalized, itemPersonId);
      }
    }

    const sourceRecordId = item.sourceRecordId !== undefined ? (item.sourceRecordId ?? null) : defaultSourceRecordId;
    if (sourceRecordId) {
      const cachedOwnerPerson = checkedRecords.get(sourceRecordId);
      if (cachedOwnerPerson === undefined && !checkedRecords.has(sourceRecordId)) {
        await verifySourceRecord(db, userId, sourceRecordId, itemPersonId);
        checkedRecords.set(sourceRecordId, itemPersonId);
      } else if (cachedOwnerPerson !== itemPersonId) {
        throw new HttpError(422, 'RECORD_MISMATCH', 'That source record belongs to someone else on this account.', { field: 'sourceRecordId' });
      }
    }

    const normalized = normalizeScheduleAndDates({
      scheduleKind: item.scheduleKind,
      times: item.times,
      intervalHours: item.intervalHours ?? null,
      remindersEnabled: item.remindersEnabled ?? item.scheduleKind !== 'as_needed',
      startDate: item.startDate,
      durationDays: item.durationDays ?? null,
      endDate: item.endDate ?? null,
    });

    prepared.push({
      personId: itemPersonId,
      sourceRecordId,
      name: item.name,
      strength: item.strength ?? null,
      dose: item.dose ?? null,
      instructions: item.instructions ?? null,
      prescriber: item.prescriber ?? null,
      prescribedDate: item.prescribedDate ?? null,
      scheduleKind: normalized.scheduleKind,
      times: normalized.times,
      intervalHours: normalized.intervalHours,
      mealTiming: item.mealTiming ?? null,
      startDate: normalized.startDate,
      endDate: normalized.endDate,
      durationDays: normalized.durationDays,
      remindersEnabled: normalized.remindersEnabled,
    });
  }

  const inserted = await insertMedications(db, userId, prepared, now());
  await logActivity(db, {
    userId,
    kind: 'medication_added',
    title: inserted.length === 1 ? 'Medication added' : `${inserted.length} medications added`,
    meta: { count: inserted.length, ...(defaultSourceRecordId ? { sourceRecordId: defaultSourceRecordId } : {}) },
  });

  return c.json({ medications: inserted.map(mapMedication) }, 201);
});

medications.post('/', async (c) => {
  const input = await body(c, MedicationCreateSchema);
  const { db, now } = c.get('services');
  const userId = c.get('userId');

  const person = await resolvePerson(db, userId, input.personId);
  const sourceRecordId = input.sourceRecordId ?? null;
  if (sourceRecordId) await verifySourceRecord(db, userId, sourceRecordId, person?.id ?? null);

  const normalized = normalizeScheduleAndDates({
    scheduleKind: input.scheduleKind,
    times: input.times,
    intervalHours: input.intervalHours ?? null,
    remindersEnabled: input.remindersEnabled ?? input.scheduleKind !== 'as_needed',
    startDate: input.startDate,
    durationDays: input.durationDays ?? null,
    endDate: input.endDate ?? null,
  });

  const [created] = await insertMedications(
    db,
    userId,
    [
      {
        personId: person?.id ?? null,
        sourceRecordId,
        name: input.name,
        strength: input.strength ?? null,
        dose: input.dose ?? null,
        instructions: input.instructions ?? null,
        prescriber: input.prescriber ?? null,
        prescribedDate: input.prescribedDate ?? null,
        scheduleKind: normalized.scheduleKind,
        times: normalized.times,
        intervalHours: normalized.intervalHours,
        mealTiming: input.mealTiming ?? null,
        startDate: normalized.startDate,
        endDate: normalized.endDate,
        durationDays: normalized.durationDays,
        remindersEnabled: normalized.remindersEnabled,
      },
    ],
    now(),
  );

  await logActivity(db, { userId, kind: 'medication_added', title: 'Medication added', meta: { medicationId: created!.id } });
  return c.json({ medication: mapMedication(created!) }, 201);
});

medications.get('/:id', async (c) => {
  const { db, now } = c.get('services');
  const userId = c.get('userId');
  const row = await loadOwnedMedication(db, userId, c.req.param('id'));
  const since = addCivilDays(now().toISOString().slice(0, 10), -14);
  const logRows = await db.query<MedicationLogRow>(
    asUser(userId),
    `SELECT ${MEDICATION_LOG_COLUMNS} FROM medication_logs l
      WHERE l.medication_id = $1 AND l.user_id = $2 AND l.scheduled_date >= $3::date
      ORDER BY l.scheduled_date DESC, l.scheduled_time DESC, l.acted_at DESC`,
    [row.id, userId, since],
  );
  return c.json({ medication: mapMedication(row), logs: logRows.map(mapMedicationLog) });
});

medications.patch('/:id', async (c) => {
  const patch = await body(c, MedicationPatchSchema);
  const { db, now } = c.get('services');
  const userId = c.get('userId');
  const existing = await loadOwnedMedication(db, userId, c.req.param('id'));

  if (!Object.keys(patch).length) {
    return c.json({ medication: mapMedication(existing) });
  }

  const startDate = patch.startDate ?? existing.start_date;
  const hasDuration = patch.durationDays !== undefined;
  const hasEnd = patch.endDate !== undefined;

  let durationDays = hasDuration ? (patch.durationDays ?? null) : existing.duration_days;
  let endDate = hasEnd ? (patch.endDate ?? null) : existing.end_date;

  if (hasDuration && !hasEnd) {
    endDate = durationDays !== null ? computeEndDate(startDate, durationDays) : existing.end_date;
  } else if (!hasDuration && hasEnd) {
    if (endDate === null) {
      durationDays = null;
    } else if (durationDays !== null && computeEndDate(startDate, durationDays) !== endDate) {
      durationDays = null;
    }
  } else if (!hasDuration && !hasEnd && patch.startDate !== undefined && durationDays !== null) {
    endDate = computeEndDate(startDate, durationDays);
  }

  const normalized = normalizeScheduleAndDates({
    scheduleKind: patch.scheduleKind ?? existing.schedule_kind,
    times: patch.times ?? existing.times,
    intervalHours: patch.intervalHours !== undefined ? patch.intervalHours : existing.interval_hours,
    remindersEnabled: patch.remindersEnabled ?? existing.reminders_enabled,
    startDate,
    durationDays,
    endDate,
  });

  const currentNow = now().toISOString();
  const status = patch.status ?? existing.status;
  const existingStoppedAt = existing.stopped_at ? toIso(existing.stopped_at) : null;
  const stoppedAt =
    status === 'stopped' ? (existing.status === 'stopped' && existingStoppedAt ? existingStoppedAt : currentNow) : status === 'active' ? null : existingStoppedAt;

  const [updated] = await db.query<MedicationRow>(
    asUser(userId),
    `UPDATE medications SET
       name = $3,
       strength = $4,
       dose = $5,
       instructions = $6,
       prescriber = $7,
       prescribed_date = $8::date,
       schedule_kind = $9,
       times = $10::text[],
       interval_hours = $11::integer,
       meal_timing = $12,
       start_date = $13::date,
       end_date = $14::date,
       duration_days = $15::integer,
       status = $16,
       reminders_enabled = $17::boolean,
       stopped_at = $18::timestamptz,
       updated_at = $19::timestamptz
     WHERE id = $1 AND user_id = $2
     RETURNING ${MEDICATION_RETURNING}`,
    [
      existing.id,
      userId,
      patch.name ?? existing.name,
      'strength' in patch ? (patch.strength ?? null) : existing.strength,
      'dose' in patch ? (patch.dose ?? null) : existing.dose,
      'instructions' in patch ? (patch.instructions ?? null) : existing.instructions,
      'prescriber' in patch ? (patch.prescriber ?? null) : existing.prescriber,
      'prescribedDate' in patch ? (patch.prescribedDate ?? null) : existing.prescribed_date,
      normalized.scheduleKind,
      normalized.times,
      normalized.intervalHours,
      'mealTiming' in patch ? (patch.mealTiming ?? null) : existing.meal_timing,
      normalized.startDate,
      normalized.endDate,
      normalized.durationDays,
      status,
      normalized.remindersEnabled,
      stoppedAt,
      currentNow,
    ],
  );

  return c.json({ medication: mapMedication(updated!) });
});

medications.delete('/:id', async (c) => {
  const id = c.req.param('id');
  if (!Uuid.safeParse(id).success) throw notFound();
  const { db } = c.get('services');
  const userId = c.get('userId');
  const [gone] = await db.query<{ id: string }>(
    asUser(userId),
    'DELETE FROM medications WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, userId],
  );
  if (!gone) throw notFound();
  await logActivity(db, { userId, kind: 'medication_deleted', title: 'Medication removed', meta: { medicationId: id } });
  return c.json({ deleted: true });
});

medications.put('/:id/logs', async (c) => {
  const input = await body(c, DoseLogSchema);
  const { db, now } = c.get('services');
  const userId = c.get('userId');
  const med = await loadOwnedMedication(db, userId, c.req.param('id'));
  const actedAt = input.actedAt ?? now().toISOString();

  const [row] = await db.query<MedicationLogRow>(
    asUser(userId),
    `INSERT INTO medication_logs (user_id, medication_id, scheduled_date, scheduled_time, outcome, acted_at, notes)
     VALUES ($1, $2, $3::date, $4, $5, $6::timestamptz, $7)
     ON CONFLICT (medication_id, scheduled_date, scheduled_time)
     DO UPDATE SET outcome = EXCLUDED.outcome, acted_at = EXCLUDED.acted_at, notes = EXCLUDED.notes
     RETURNING ${MEDICATION_LOG_RETURNING}`,
    [userId, med.id, input.scheduledDate, input.scheduledTime, input.outcome, actedAt, input.notes ?? null],
  );

  return c.json({ log: mapMedicationLog(row!) });
});

medications.delete('/:id/logs', async (c) => {
  const { db } = c.get('services');
  const userId = c.get('userId');
  const med = await loadOwnedMedication(db, userId, c.req.param('id'));

  const rawDate = c.req.query('scheduledDate');
  const parsedDate = CivilDate.safeParse(rawDate);
  if (!parsedDate.success) {
    throw new HttpError(422, 'VALIDATION', 'scheduledDate: Use YYYY-MM-DD.', { field: 'scheduledDate' });
  }

  const rawTime = c.req.query('scheduledTime');
  const parsedTime = Time24.safeParse(rawTime);
  if (!parsedTime.success) {
    throw new HttpError(422, 'VALIDATION', 'scheduledTime: Use HH:MM in 24-hour time.', { field: 'scheduledTime' });
  }

  const rows = await db.query<{ id: string }>(
    asUser(userId),
    `DELETE FROM medication_logs
      WHERE medication_id = $1 AND user_id = $2 AND scheduled_date = $3::date AND scheduled_time = $4
      RETURNING id`,
    [med.id, userId, parsedDate.data, parsedTime.data],
  );

  return c.json({ deleted: rows.length > 0 });
});
