import { isCivilDate, todayIso } from '../format.ts';
import { computeEndDate, isValidTime24 } from './schedule.ts';
import type {
  ExtractedMedicationLine,
  FlaggedField,
  MealTiming,
  MedicationInput,
  MedicationReviewDraft,
  ScheduleKind,
} from './types';

const SCHEDULE_KINDS = new Set<ScheduleKind>(['daily_times', 'interval_hours', 'as_needed']);
const MEAL_TIMINGS = new Set<MealTiming>(['before_meal', 'with_meal', 'after_meal', 'anytime']);

function cleanStr(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'item';
}

export function prepareReviewDrafts(
  medications: ExtractedMedicationLine[],
  opts: { provider?: string | null; eventDate?: string | null; legible?: boolean; today?: string } = {},
): MedicationReviewDraft[] {
  const today = opts.today && isCivilDate(opts.today) ? opts.today : todayIso();
  const prescriber = cleanStr(opts.provider);
  const prescribedDate = opts.eventDate && isCivilDate(opts.eventDate) ? opts.eventDate : '';

  return medications.map((med, idx) => {
    const name = cleanStr(med.name);
    const hasEnrichedFields = med.strength !== undefined || med.dose !== undefined;
    const strength = cleanStr(med.strength);
    const dose = hasEnrichedFields ? cleanStr(med.dose) : cleanStr(med.dosage);
    const rawFrequency = cleanStr(med.frequency);
    const instructions = cleanStr(med.instructions);

    const rawKind = med.scheduleKind;
    const hasKnownKind = Boolean(rawKind && SCHEDULE_KINDS.has(rawKind));
    const hasValidInterval =
      typeof med.intervalHours === 'number' &&
      Number.isInteger(med.intervalHours) &&
      med.intervalHours >= 1 &&
      med.intervalHours <= 24;

    const scheduleKind: ScheduleKind = hasKnownKind
      ? rawKind!
      : hasValidInterval
        ? 'interval_hours'
        : 'daily_times';

    const rawTimes = Array.isArray(med.times) ? med.times.map((t) => t.trim()).filter(Boolean) : [];
    const validTimes =
      scheduleKind === 'as_needed' ? [] : Array.from(new Set(rawTimes.filter(isValidTime24))).sort();
    const droppedInvalidTime = scheduleKind !== 'as_needed' && validTimes.length < rawTimes.length;

    const intervalHours = scheduleKind === 'interval_hours' && hasValidInterval ? med.intervalHours! : null;
    const mealTiming = med.mealTiming && MEAL_TIMINGS.has(med.mealTiming) ? med.mealTiming : null;

    const hasValidDuration =
      typeof med.durationDays === 'number' &&
      Number.isInteger(med.durationDays) &&
      med.durationDays >= 1 &&
      med.durationDays <= 365;
    const droppedInvalidDuration = med.durationDays != null && !hasValidDuration;
    const durationDays = hasValidDuration ? String(med.durationDays) : '';

    const rawEnd = cleanStr(med.endDate);
    const droppedInvalidEndDate = rawEnd !== '' && !isCivilDate(rawEnd);
    const endDate =
      rawEnd && isCivilDate(rawEnd)
        ? rawEnd
        : hasValidDuration
          ? (computeEndDate(today, med.durationDays!) ?? '')
          : '';

    const confidence = med.confidence === 'low' || opts.legible === false ? 'low' : 'high';
    const lowConfidenceFields: FlaggedField[] = [];

    if (!name) lowConfidenceFields.push('name');
    if (confidence === 'low' && !strength) lowConfidenceFields.push('strength');
    if (!dose) lowConfidenceFields.push('dose');
    if (!rawFrequency) lowConfidenceFields.push('frequency');

    const scheduleUnclear =
      !hasKnownKind ||
      droppedInvalidTime ||
      (scheduleKind === 'daily_times' && validTimes.length === 0) ||
      (scheduleKind === 'interval_hours' && (intervalHours === null || validTimes.length === 0));
    if (scheduleUnclear) lowConfidenceFields.push('schedule');

    if (droppedInvalidDuration || droppedInvalidEndDate) lowConfidenceFields.push('duration');

    const needsAttention = confidence === 'low' || lowConfidenceFields.length > 0;

    return {
      key: `med-${idx}-${slug(name)}`,
      confirmed: false,
      name,
      strength,
      dose,
      rawFrequency,
      instructions,
      prescriber,
      prescribedDate,
      scheduleKind,
      times: validTimes,
      intervalHours,
      mealTiming,
      startDate: today,
      durationDays,
      endDate,
      remindersEnabled: scheduleKind !== 'as_needed',
      confidence,
      lowConfidenceFields,
      needsAttention,
    };
  });
}

export function validateReviewDraft(
  draft: MedicationReviewDraft,
): Partial<Record<'name' | 'times' | 'startDate' | 'endDate' | 'durationDays', string>> {
  const errors: Partial<Record<'name' | 'times' | 'startDate' | 'endDate' | 'durationDays', string>> = {};

  const name = draft.name.trim();
  if (!name) {
    errors.name = 'Enter a medication name.';
  } else if (name.length > 160) {
    errors.name = 'Medication name must be 160 characters or fewer.';
  }

  const startDate = draft.startDate.trim();
  if (!isCivilDate(startDate)) {
    errors.startDate = 'Enter a valid start date (YYYY-MM-DD).';
  }

  if (draft.scheduleKind !== 'as_needed') {
    const hasInvalidTime = draft.times.some((t) => !isValidTime24(t));
    if (hasInvalidTime) {
      errors.times = 'Use 24-hour HH:MM times (for example 08:00).';
    } else if (draft.times.length > 12) {
      errors.times = 'You can add up to 12 times per day.';
    } else if (
      draft.scheduleKind === 'interval_hours' &&
      (draft.intervalHours === null ||
        !Number.isInteger(draft.intervalHours) ||
        draft.intervalHours < 1 ||
        draft.intervalHours > 24)
    ) {
      errors.times = 'Choose how many hours between doses (1 to 24).';
    } else if (draft.remindersEnabled && draft.times.length === 0) {
      errors.times =
        draft.scheduleKind === 'interval_hours'
          ? 'Choose a first dose time, or turn reminders off.'
          : 'Add at least one dose time, or turn reminders off.';
    }
  }

  const rawDuration = draft.durationDays.trim();
  if (rawDuration !== '') {
    if (!/^\d+$/.test(rawDuration)) {
      errors.durationDays = 'Duration must be a whole number from 1 to 365 days.';
    } else {
      const days = Number(rawDuration);
      if (days < 1 || days > 365) {
        errors.durationDays = 'Duration must be a whole number from 1 to 365 days.';
      }
    }
  }

  const rawEnd = draft.endDate.trim();
  if (rawEnd !== '') {
    if (!isCivilDate(rawEnd)) {
      errors.endDate = 'Enter a valid end date (YYYY-MM-DD).';
    } else if (isCivilDate(startDate) && rawEnd < startDate) {
      errors.endDate = 'End date must be on or after the start date.';
    }
  }

  return errors;
}

export function draftToMedicationInput(
  draft: MedicationReviewDraft,
  opts: { personId?: string | null; sourceRecordId?: string | null } = {},
): MedicationInput {
  const startDate = draft.startDate.trim();
  const rawDuration = draft.durationDays.trim();
  const durationDays = /^\d+$/.test(rawDuration) ? Number(rawDuration) : null;
  const rawEnd = draft.endDate.trim();
  const endDate =
    rawEnd && isCivilDate(rawEnd)
      ? rawEnd
      : durationDays !== null
        ? computeEndDate(startDate, durationDays)
        : null;

  const times =
    draft.scheduleKind === 'as_needed'
      ? []
      : Array.from(new Set(draft.times.filter(isValidTime24))).sort();

  const prescribedDate = draft.prescribedDate.trim();

  return {
    personId: opts.personId ?? null,
    sourceRecordId: opts.sourceRecordId ?? null,
    name: draft.name.trim(),
    strength: draft.strength.trim() || null,
    dose: draft.dose.trim() || null,
    instructions: draft.instructions.trim() || null,
    prescriber: draft.prescriber.trim() || null,
    prescribedDate: prescribedDate && isCivilDate(prescribedDate) ? prescribedDate : null,
    scheduleKind: draft.scheduleKind,
    times,
    intervalHours: draft.scheduleKind === 'interval_hours' ? draft.intervalHours : null,
    mealTiming: draft.mealTiming ?? null,
    startDate,
    endDate,
    durationDays,
    remindersEnabled: draft.scheduleKind === 'as_needed' ? false : draft.remindersEnabled,
  };
}
