import { z } from 'zod';
import { HttpError, type Db, type DbContext } from './types';

export type ScheduleKind = 'daily_times' | 'interval_hours' | 'as_needed';
export type MealTiming = 'before_meal' | 'with_meal' | 'after_meal' | 'anytime';
export type MedicationStatus = 'active' | 'stopped' | 'completed';
export type DoseOutcome = 'taken' | 'skipped';

export interface MedicationRow {
  id: string;
  user_id: string;
  person_id: string | null;
  source_record_id: string | null;
  name: string;
  strength: string | null;
  dose: string | null;
  instructions: string | null;
  prescriber: string | null;
  prescribed_date: string | null;
  schedule_kind: ScheduleKind;
  times: string[];
  interval_hours: number | null;
  meal_timing: MealTiming | null;
  start_date: string;
  end_date: string | null;
  duration_days: number | null;
  status: MedicationStatus;
  reminders_enabled: boolean;
  confirmed_at: string | Date;
  stopped_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface MedicationLogRow {
  id: string;
  medication_id: string;
  scheduled_date: string;
  scheduled_time: string;
  outcome: DoseOutcome;
  acted_at: string | Date;
  notes: string | null;
}

export const MEDICATION_RETURNING = `id, user_id, person_id, source_record_id, name, strength, dose,
  instructions, prescriber, to_char(prescribed_date, 'YYYY-MM-DD') AS prescribed_date,
  schedule_kind, times, interval_hours, meal_timing,
  to_char(start_date, 'YYYY-MM-DD') AS start_date, to_char(end_date, 'YYYY-MM-DD') AS end_date,
  duration_days, status, reminders_enabled, confirmed_at, stopped_at, created_at, updated_at`;

export const MEDICATION_COLUMNS = `m.id, m.user_id, m.person_id, m.source_record_id, m.name, m.strength, m.dose,
  m.instructions, m.prescriber, to_char(m.prescribed_date, 'YYYY-MM-DD') AS prescribed_date,
  m.schedule_kind, m.times, m.interval_hours, m.meal_timing,
  to_char(m.start_date, 'YYYY-MM-DD') AS start_date, to_char(m.end_date, 'YYYY-MM-DD') AS end_date,
  m.duration_days, m.status, m.reminders_enabled, m.confirmed_at, m.stopped_at, m.created_at, m.updated_at`;

export const MEDICATION_LOG_RETURNING = `id, medication_id, to_char(scheduled_date, 'YYYY-MM-DD') AS scheduled_date,
  scheduled_time, outcome, acted_at, notes`;

export const MEDICATION_LOG_COLUMNS = `l.id, l.medication_id, to_char(l.scheduled_date, 'YYYY-MM-DD') AS scheduled_date,
  l.scheduled_time, l.outcome, l.acted_at, l.notes`;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_24_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/;

export function isRealCivilDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function addCivilDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function computeEndDate(startDate: string, durationDays: number | null): string | null {
  return durationDays === null ? null : addCivilDays(startDate, durationDays - 1);
}

/**
 * Server-side auto-complete uses a one-day grace period behind UTC today
 * so users west of UTC never lose their last evening dose before their local day ends.
 */
export function graceCutoffDate(now: Date): string {
  return addCivilDays(now.toISOString().slice(0, 10), -1);
}

export function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

export function mapMedication(r: MedicationRow) {
  return {
    id: r.id,
    personId: r.person_id ?? null,
    sourceRecordId: r.source_record_id ?? null,
    name: r.name,
    strength: r.strength ?? null,
    dose: r.dose ?? null,
    instructions: r.instructions ?? null,
    prescriber: r.prescriber ?? null,
    prescribedDate: r.prescribed_date ?? null,
    scheduleKind: r.schedule_kind,
    times: r.times ?? [],
    intervalHours: r.interval_hours ?? null,
    mealTiming: r.meal_timing ?? null,
    startDate: r.start_date,
    endDate: r.end_date ?? null,
    durationDays: r.duration_days ?? null,
    status: r.status,
    remindersEnabled: r.reminders_enabled,
    confirmedAt: toIso(r.confirmed_at),
    stoppedAt: r.stopped_at ? toIso(r.stopped_at) : null,
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}

export function mapMedicationLog(l: MedicationLogRow) {
  return {
    id: l.id,
    medicationId: l.medication_id,
    scheduledDate: l.scheduled_date,
    scheduledTime: l.scheduled_time,
    outcome: l.outcome,
    actedAt: toIso(l.acted_at),
    notes: l.notes ?? null,
  };
}

export const Uuid = z.string().uuid();
export const CivilDate = z
  .string()
  .regex(ISO_DATE_RE, 'Use YYYY-MM-DD.')
  .refine(isRealCivilDate, 'Enter a real calendar date.');
export const Time24 = z.string().regex(TIME_24_RE, 'Use HH:MM in 24-hour time.');
export const ScheduleKindSchema = z.enum(['daily_times', 'interval_hours', 'as_needed']);
export const MealTimingSchema = z.enum(['before_meal', 'with_meal', 'after_meal', 'anytime']);
export const MedicationStatusSchema = z.enum(['active', 'stopped', 'completed']);
export const DoseOutcomeSchema = z.enum(['taken', 'skipped']);

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v || null));

const optionalNullableDate = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v === undefined ? undefined : v === '' || v === null ? null : v))
  .refine((v) => v === undefined || v === null || ISO_DATE_RE.test(v), 'Use YYYY-MM-DD.')
  .refine((v) => v === undefined || v === null || isRealCivilDate(v), 'Enter a real calendar date.');

export const OptionalPersonId = z.union([z.string().uuid(), z.literal('me'), z.literal(''), z.null()]).optional();

export const MedicationCreateSchema = z.object({
  personId: OptionalPersonId,
  sourceRecordId: Uuid.nullable().optional(),
  name: z.string().trim().min(1, 'Enter a medication name.').max(160),
  strength: nullableText(80),
  dose: nullableText(120),
  instructions: nullableText(1000),
  prescriber: nullableText(160),
  prescribedDate: optionalNullableDate,
  scheduleKind: ScheduleKindSchema,
  times: z.array(Time24).max(12).default([]),
  intervalHours: z.number().int().min(1).max(24).nullable().optional(),
  mealTiming: MealTimingSchema.nullable().optional(),
  startDate: CivilDate,
  endDate: optionalNullableDate,
  durationDays: z.number().int().min(1).max(365).nullable().optional(),
  remindersEnabled: z.boolean().optional(),
});

export const MedicationBatchSchema = z.object({
  personId: OptionalPersonId,
  sourceRecordId: Uuid.nullable().optional(),
  items: z
    .array(MedicationCreateSchema)
    .min(1, 'Confirm at least one medication to save.')
    .max(20, 'You can save up to 20 medications at once.'),
});

export const MedicationPatchSchema = z.object({
  name: z.string().trim().min(1, 'Enter a medication name.').max(160).optional(),
  strength: nullableText(80),
  dose: nullableText(120),
  instructions: nullableText(1000),
  prescriber: nullableText(160),
  prescribedDate: optionalNullableDate,
  scheduleKind: ScheduleKindSchema.optional(),
  times: z.array(Time24).max(12).optional(),
  intervalHours: z.number().int().min(1).max(24).nullable().optional(),
  mealTiming: MealTimingSchema.nullable().optional(),
  startDate: CivilDate.optional(),
  endDate: optionalNullableDate,
  durationDays: z.number().int().min(1).max(365).nullable().optional(),
  status: MedicationStatusSchema.optional(),
  remindersEnabled: z.boolean().optional(),
});

export const DoseLogSchema = z.object({
  scheduledDate: CivilDate,
  scheduledTime: Time24,
  outcome: DoseOutcomeSchema,
  actedAt: z
    .string()
    .regex(ISO_TIMESTAMP_RE, 'Use an ISO timestamp with timezone.')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Use an ISO timestamp with timezone.')
    .optional(),
  notes: nullableText(500),
});

export interface NormalizedScheduleAndDates {
  scheduleKind: ScheduleKind;
  times: string[];
  intervalHours: number | null;
  remindersEnabled: boolean;
  startDate: string;
  durationDays: number | null;
  endDate: string | null;
}

export function normalizeScheduleAndDates(input: {
  scheduleKind: ScheduleKind;
  times: string[];
  intervalHours: number | null;
  remindersEnabled: boolean;
  startDate: string;
  durationDays: number | null;
  endDate: string | null;
}): NormalizedScheduleAndDates {
  let times = [...new Set(input.times)].sort();
  let intervalHours = input.intervalHours;
  const remindersEnabled = input.remindersEnabled;

  if (input.scheduleKind === 'as_needed') {
    times = [];
    intervalHours = null;
  } else if (input.scheduleKind === 'daily_times') {
    intervalHours = null;
    if (remindersEnabled && times.length === 0) {
      throw new HttpError(422, 'VALIDATION', 'Add at least one reminder time, or turn reminders off.', { field: 'times' });
    }
  } else if (input.scheduleKind === 'interval_hours') {
    if (intervalHours === null) {
      throw new HttpError(422, 'VALIDATION', 'Choose how many hours between doses.', { field: 'intervalHours' });
    }
    if (remindersEnabled && times.length === 0) {
      throw new HttpError(422, 'VALIDATION', 'Choose a first dose time, or turn reminders off.', { field: 'times' });
    }
  }

  let endDate = input.endDate;
  if (input.durationDays !== null && endDate === null) {
    endDate = computeEndDate(input.startDate, input.durationDays);
  }
  if (endDate !== null && endDate < input.startDate) {
    throw new HttpError(422, 'VALIDATION', 'End date must be on or after the start date.', { field: 'endDate' });
  }

  return {
    scheduleKind: input.scheduleKind,
    times,
    intervalHours,
    remindersEnabled,
    startDate: input.startDate,
    durationDays: input.durationDays,
    endDate,
  };
}

/**
 * Transitions active courses whose end_date is strictly before `current UTC date - 1`
 * to 'completed'. Runs on GET /api/medications and hourly cleanup().
 */
export async function completeExpiredMedications(db: Db, ctx: DbContext, now: Date, userId?: string): Promise<number> {
  const cutoff = graceCutoffDate(now);
  const rows = userId
    ? await db.query<{ id: string }>(
        ctx,
        `UPDATE medications SET status = 'completed', updated_at = $3::timestamptz
          WHERE user_id = $1 AND status = 'active' AND end_date IS NOT NULL AND end_date < $2::date
         RETURNING id`,
        [userId, cutoff, now.toISOString()],
      )
    : await db.query<{ id: string }>(
        ctx,
        `UPDATE medications SET status = 'completed', updated_at = $2::timestamptz
          WHERE status = 'active' AND end_date IS NOT NULL AND end_date < $1::date
         RETURNING id`,
        [cutoff, now.toISOString()],
      );
  return rows.length;
}
