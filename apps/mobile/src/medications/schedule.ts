import { isCivilDate } from '../format.ts';
import type { MealTiming, Medication, MedicationLog, ScheduledSlot } from './types';

export const MAX_SCHEDULED_NOTIFICATIONS = 48;

const TIME_24_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function localTodayIso(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function mealTimingLabel(mealTiming: MealTiming | null): string | null {
  switch (mealTiming) {
    case 'before_meal':
      return 'Before meals';
    case 'with_meal':
      return 'With food';
    case 'after_meal':
      return 'After meals';
    case 'anytime':
    case null:
      return null;
  }
}

export function isValidTime24(value: string): boolean {
  return TIME_24_RE.test(value);
}

export function formatTime12(hhmm: string): string {
  if (!isValidTime24(hhmm)) return hhmm;
  const [hStr, mStr] = hhmm.split(':');
  const h24 = Number(hStr);
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return `${h12}:${mStr} ${period}`;
}

export function addCivilDays(isoDate: string, days: number): string {
  if (!isCivilDate(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  const utc = new Date(Date.UTC(y, m - 1, d + Math.trunc(days)));
  return utc.toISOString().slice(0, 10);
}

export function computeEndDate(startDate: string, durationDays: number | null): string | null {
  if (!isCivilDate(startDate) || durationDays === null || !Number.isFinite(durationDays)) return null;
  const whole = Math.floor(durationDays);
  if (whole < 1) return null;
  return addCivilDays(startDate, whole - 1);
}

export function isCourseEnded(med: Pick<Medication, 'status' | 'endDate'>, today: string): boolean {
  if (med.status !== 'active') return true;
  if (!med.endDate || !isCivilDate(med.endDate) || !isCivilDate(today)) return false;
  return med.endDate < today;
}

/**
 * Constructs a Date at the given local civil date and wall-clock time.
 * Using component construction keeps wall-clock hours intact across DST transitions.
 */
export function parseLocalSlotDate(dateIso: string, hhmm: string): Date {
  const [y, m, d] = dateIso.split('-').map(Number) as [number, number, number];
  const [hh, mm] = hhmm.split(':').map(Number) as [number, number];
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

export function expandDailyTimes(med: Pick<Medication, 'scheduleKind' | 'times' | 'intervalHours'>): string[] {
  if (med.scheduleKind === 'as_needed') return [];

  if (med.scheduleKind === 'daily_times') {
    const valid = med.times.filter(isValidTime24);
    return Array.from(new Set(valid)).sort();
  }

  // interval_hours: expand across the 24h cycle anchored at times[0]; never invent an anchor.
  const anchor = med.times.find(isValidTime24);
  const stepHours = med.intervalHours;
  if (!anchor || stepHours === null || !Number.isFinite(stepHours) || stepHours < 1 || stepHours > 24) {
    return [];
  }

  const [ah, am] = anchor.split(':').map(Number) as [number, number];
  const anchorMinutes = ah * 60 + am;
  const stepMinutes = Math.round(stepHours * 60);
  if (stepMinutes <= 0) return [];

  const expanded = new Set<string>();
  for (let offset = 0; offset < 1440; offset += stepMinutes) {
    const total = (anchorMinutes + offset) % 1440;
    const hh = String(Math.floor(total / 60)).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    expanded.add(`${hh}:${mm}`);
  }
  return Array.from(expanded).sort();
}

export function formatScheduleSummary(med: Pick<Medication, 'scheduleKind' | 'times' | 'intervalHours' | 'mealTiming'>): string {
  const meal = mealTimingLabel(med.mealTiming);

  if (med.scheduleKind === 'as_needed') {
    return ['As needed', meal].filter(Boolean).join(' · ');
  }

  if (med.scheduleKind === 'interval_hours') {
    const every = med.intervalHours
      ? `Every ${med.intervalHours} ${med.intervalHours === 1 ? 'hour' : 'hours'}`
      : 'At regular intervals';
    const anchor = med.times.find(isValidTime24);
    const from = anchor ? `From ${formatTime12(anchor)}` : null;
    return [every, from, meal].filter(Boolean).join(' · ');
  }

  const times = expandDailyTimes(med);
  const countLabel =
    times.length === 0
      ? 'Daily'
      : times.length === 1
        ? 'Once daily'
        : times.length === 2
          ? 'Twice daily'
          : `${times.length} times daily`;
  const timesLabel = times.length > 0 ? times.map(formatTime12).join(', ') : null;
  return [countLabel, timesLabel, meal].filter(Boolean).join(' · ');
}

function indexLogs(logs: MedicationLog[]): Map<string, MedicationLog> {
  const map = new Map<string, MedicationLog>();
  for (const log of logs) {
    map.set(`${log.medicationId}:${log.scheduledDate}:${log.scheduledTime}`, log);
  }
  return map;
}

function isScheduledOnDate(med: Medication, dateIso: string): boolean {
  if (med.status !== 'active') return false;
  if (!isCivilDate(med.startDate) || dateIso < med.startDate) return false;
  if (med.endDate && isCivilDate(med.endDate) && dateIso > med.endDate) return false;
  return true;
}

export function buildDaySchedule(
  medications: Medication[],
  logs: MedicationLog[],
  snoozes: Record<string, string>,
  dateIso: string,
): ScheduledSlot[] {
  if (!isCivilDate(dateIso)) return [];

  const logMap = indexLogs(logs);
  const slots: ScheduledSlot[] = [];

  for (const med of medications) {
    if (!isScheduledOnDate(med, dateIso)) continue;
    const times = expandDailyTimes(med);
    for (const time of times) {
      const slotKey = `${med.id}:${dateIso}:${time}`;
      const log = logMap.get(slotKey);
      slots.push({
        slotKey,
        medicationId: med.id,
        personId: med.personId,
        medicationName: med.name,
        strength: med.strength,
        dose: med.dose,
        mealTiming: med.mealTiming,
        instructions: med.instructions,
        scheduledDate: dateIso,
        scheduledTime: time,
        triggerAt: parseLocalSlotDate(dateIso, time),
        outcome: log?.outcome ?? null,
        actedAt: log?.actedAt ?? null,
        snoozedUntil: log ? null : (snoozes[slotKey] ?? null),
      });
    }
  }

  return slots.sort(
    (a, b) =>
      a.triggerAt.getTime() - b.triggerAt.getTime() ||
      a.medicationName.localeCompare(b.medicationName) ||
      a.slotKey.localeCompare(b.slotKey),
  );
}

export function buildRollingNotificationPlan(
  medications: Medication[],
  logs: MedicationLog[],
  now = new Date(),
  horizonDays = 14,
): { slots: ScheduledSlot[]; truncated: boolean; renewalTriggerAt: Date | null } {
  const days = Math.max(1, Math.floor(horizonDays));
  const today = localTodayIso(now);
  const nowMs = now.getTime();
  const logMap = indexLogs(logs);

  const candidates = medications.filter(
    (med) => med.status === 'active' && med.remindersEnabled && med.scheduleKind !== 'as_needed' && !isCourseEnded(med, today),
  );

  const allSlots: ScheduledSlot[] = [];

  for (let offset = 0; offset < days; offset++) {
    const dateIso = addCivilDays(today, offset);
    for (const med of candidates) {
      if (!isScheduledOnDate(med, dateIso)) continue;
      const times = expandDailyTimes(med);
      for (const time of times) {
        const triggerAt = parseLocalSlotDate(dateIso, time);
        if (triggerAt.getTime() <= nowMs) continue;

        const slotKey = `${med.id}:${dateIso}:${time}`;
        if (logMap.has(slotKey)) continue;

        allSlots.push({
          slotKey,
          medicationId: med.id,
          personId: med.personId,
          medicationName: med.name,
          strength: med.strength,
          dose: med.dose,
          mealTiming: med.mealTiming,
          instructions: med.instructions,
          scheduledDate: dateIso,
          scheduledTime: time,
          triggerAt,
          outcome: null,
          actedAt: null,
          snoozedUntil: null,
        });
      }
    }
  }

  allSlots.sort(
    (a, b) => a.triggerAt.getTime() - b.triggerAt.getTime() || a.slotKey.localeCompare(b.slotKey),
  );

  // Reserve slot #48 for the catch-up renewal notification whenever doses exceed 47.
  const maxDoseSlots = MAX_SCHEDULED_NOTIFICATIONS - 1;
  if (allSlots.length <= maxDoseSlots) {
    return { slots: allSlots, truncated: false, renewalTriggerAt: null };
  }

  const slots = allSlots.slice(0, maxDoseSlots);
  const lastSlot = slots[slots.length - 1]!;
  const renewalTriggerAt = new Date(lastSlot.triggerAt.getTime() + 60 * 60 * 1000);
  return { slots, truncated: true, renewalTriggerAt };
}

export function formatNotificationCopy(
  slot: Pick<ScheduledSlot, 'medicationName' | 'strength' | 'dose' | 'mealTiming' | 'scheduledTime'>,
  opts: { showNames: boolean; personName?: string | null },
): { title: string; body: string } {
  const timeLabel = formatTime12(slot.scheduledTime);
  const who = opts.personName?.trim() || null;

  if (!opts.showNames) {
    if (who) {
      return {
        title: `MedRec · For ${who}`,
        body: `Time for ${who}'s ${timeLabel} scheduled medication. Open MedRec to view details.`,
      };
    }
    return {
      title: 'MedRec reminder',
      body: `Time for your ${timeLabel} scheduled medication. Open MedRec to view and log your dose.`,
    };
  }

  const medLabel = slot.strength ? `${slot.medicationName} (${slot.strength})` : slot.medicationName;
  const title = who ? `${who} · ${medLabel}` : `Time for ${medLabel}`;
  const detailParts = [slot.dose, mealTimingLabel(slot.mealTiming), timeLabel].filter(Boolean);
  const body = detailParts.length > 1 ? detailParts.join(' · ') : `Scheduled dose · ${timeLabel}`;
  return { title, body };
}

export function computeSnoozeTrigger(now = new Date(), minutes = 15): Date {
  const mins = Number.isFinite(minutes) && minutes > 0 ? minutes : 15;
  return new Date(now.getTime() + mins * 60 * 1000);
}

export function needsTimezoneReschedule(
  previousTimeZone: string | null | undefined,
  currentTimeZone: string,
): boolean {
  if (!previousTimeZone) return true;
  if (!currentTimeZone) return false;
  return previousTimeZone !== currentTimeZone;
}
