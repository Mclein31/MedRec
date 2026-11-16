import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { formatDate, isCivilDate, todayIso } from '../format';
import { radius, space, useColors } from '../theme';
import { Eyebrow, Icon, Tappable, TextLink, Txt } from '../ui/core';
import { Chip, Field, Toggle } from '../ui/form';
import { Rule } from '../ui/layout';
import { Segmented } from '../ui/Segmented';
import { computeEndDate, formatScheduleSummary, formatTime12, isCourseEnded, isValidTime24 } from './schedule';
import type { FlaggedField, MealTiming, Medication, ScheduleKind, ScheduledSlot } from './types';

const MEAL_LABELS: Record<MealTiming, string> = {
  before_meal: 'Before meals',
  with_meal: 'With food',
  after_meal: 'After meals',
  anytime: 'Anytime',
};

const MEAL_OPTIONS: { key: MealTiming; label: string }[] = [
  { key: 'anytime', label: 'Anytime' },
  { key: 'before_meal', label: 'Before meals' },
  { key: 'with_meal', label: 'With food' },
  { key: 'after_meal', label: 'After meals' },
];

const SCHEDULE_OPTIONS: { key: ScheduleKind; label: string }[] = [
  { key: 'daily_times', label: 'Set times' },
  { key: 'interval_hours', label: 'Intervals' },
  { key: 'as_needed', label: 'As needed' },
];

const INTERVAL_PRESETS = [4, 6, 8, 12];
const MAX_DAILY_TIMES = 12;

/** Shared form shape used by both prescription review and manual add/edit. */
export interface MedicationFormValue {
  name: string;
  strength: string;
  dose: string;
  scheduleKind: ScheduleKind;
  times: string[];
  intervalHours: number | null;
  mealTiming: MealTiming | null;
  startDate: string;
  durationDays: string;
  endDate: string;
  instructions: string;
  prescriber: string;
  prescribedDate: string;
  remindersEnabled: boolean;
}

export type MedicationFormErrors = Partial<
  Record<'name' | 'times' | 'intervalHours' | 'startDate' | 'durationDays' | 'endDate' | 'prescribedDate', string>
>;

/** Whole calendar days from `fromIso` to `toIso` using UTC civil dates so DST never shifts a day. */
export function diffCivilDays(fromIso: string, toIso: string): number {
  if (!isCivilDate(fromIso) || !isCivilDate(toIso)) return 0;
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

/** Local clock string (e.g. "8:04 AM") for an ISO timestamp. */
export function formatTimestamp12(isoTimestamp: string | null | undefined): string {
  if (!isoTimestamp) return '';
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** Parses user-entered 24h ("08:00", "20:00", "0800") or 12h ("8:00 AM", "8pm") clock text into `'HH:MM'`. */
export function parseUserTime(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return null;
  const m12 = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (m12) {
    const hRaw = Number(m12[1]);
    const min = Number(m12[2] ?? '0');
    if (hRaw < 1 || hRaw > 12 || min < 0 || min > 59) return null;
    const h24 = m12[3] === 'am' ? (hRaw === 12 ? 0 : hRaw) : hRaw === 12 ? 12 : hRaw + 12;
    const candidate = `${String(h24).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    return isValidTime24(candidate) ? candidate : null;
  }
  const m4 = s.match(/^(\d{2})(\d{2})$/);
  if (m4) {
    const candidate = `${m4[1]}:${m4[2]}`;
    return isValidTime24(candidate) ? candidate : null;
  }
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const candidate = `${m24[1]!.padStart(2, '0')}:${m24[2]}`;
    return isValidTime24(candidate) ? candidate : null;
  }
  return null;
}

/** Merges any pending typed reminder time into `times` so tapping Save/Confirm never drops un-submitted input. */
export function withPendingTime(times: string[], raw: string): { times: string[]; invalid: boolean } {
  const trimmed = raw.trim();
  if (!trimmed) return { times, invalid: false };
  const parsed = parseUserTime(trimmed);
  if (!parsed) return { times, invalid: true };
  if (times.includes(parsed) || times.length >= MAX_DAILY_TIMES) return { times: [...times].sort(), invalid: false };
  return { times: [...times, parsed].sort(), invalid: false };
}

export function validateMedicationForm(
  v: MedicationFormValue,
  opts?: { anchorInput?: string; timeDraft?: string },
): MedicationFormErrors {
  const errors: MedicationFormErrors = {};
  const trimmedName = v.name.trim();
  if (!trimmedName) errors.name = 'Enter the medication name.';
  else if (trimmedName.length > 160) errors.name = 'Medication name must be 160 characters or fewer.';

  if (!isCivilDate(v.startDate)) {
    errors.startDate = 'Use YYYY-MM-DD with a real date, like 2026-11-16.';
  }

  const durRaw = v.durationDays.trim();
  if (durRaw) {
    const dur = /^\d+$/.test(durRaw) ? Number(durRaw) : Number.NaN;
    if (!Number.isInteger(dur) || dur < 1 || dur > 365) {
      errors.durationDays = 'Use a whole number of days between 1 and 365.';
    }
  }

  const endRaw = v.endDate.trim();
  if (endRaw) {
    if (!isCivilDate(endRaw)) errors.endDate = 'Use YYYY-MM-DD with a real date.';
    else if (isCivilDate(v.startDate) && endRaw < v.startDate) errors.endDate = 'End date cannot be before the start date.';
  }

  const prescribedRaw = v.prescribedDate.trim();
  if (prescribedRaw && !isCivilDate(prescribedRaw)) {
    errors.prescribedDate = 'Use YYYY-MM-DD with a real date.';
  }

  if (v.scheduleKind === 'daily_times') {
    if (opts?.timeDraft && opts.timeDraft.trim() && !parseUserTime(opts.timeDraft)) {
      errors.times = 'Use a time like 08:00, 14:30, or 8:00 PM.';
    } else if (v.remindersEnabled && v.times.filter(isValidTime24).length === 0) {
      errors.times = 'Add at least one reminder time, or turn reminders off.';
    }
  } else if (v.scheduleKind === 'interval_hours') {
    if (!v.intervalHours || !Number.isInteger(v.intervalHours) || v.intervalHours < 1 || v.intervalHours > 24) {
      errors.intervalHours = 'Enter hours between doses (1 to 24).';
    }
    if (opts?.anchorInput !== undefined && opts.anchorInput.trim() && !parseUserTime(opts.anchorInput)) {
      errors.times = 'Use a time like 08:00 or 8:00 AM.';
    } else if (v.remindersEnabled && (!v.times[0] || !isValidTime24(v.times[0]))) {
      errors.times = 'Enter the first dose time so reminders can be scheduled.';
    }
  }

  return errors;
}

/** Persistent clinical disclaimer shown on all medication screens. */
export function MedicationDisclaimer() {
  const c = useColors();
  return (
    <Txt variant="caption" color={c.ink3}>
      Reminders follow the schedule you confirmed. They do not replace your doctor&apos;s or pharmacist&apos;s instructions.
    </Txt>
  );
}

/** Today's scheduled dose row with Taken / Snooze 15m / Skip / Undo actions. */
export function DoseSlotCard({
  slot,
  nowMs,
  highlighted = false,
  busy = false,
  onTaken,
  onSnooze,
  onSkip,
  onUndo,
  onOpenMedication,
}: {
  slot: ScheduledSlot;
  nowMs: number;
  highlighted?: boolean;
  busy?: boolean;
  onTaken: () => void;
  onSnooze: () => void;
  onSkip: () => void;
  onUndo: () => void;
  onOpenMedication: () => void;
}) {
  const c = useColors();
  const timeLabel = formatTime12(slot.scheduledTime);
  const meal = slot.mealTiming && slot.mealTiming !== 'anytime' ? MEAL_LABELS[slot.mealTiming] : null;
  const subtitle = [slot.dose, meal].filter(Boolean).join(' · ');
  const snoozedMs = slot.snoozedUntil ? Date.parse(slot.snoozedUntil) : Number.NaN;
  const isSnoozed = slot.outcome === null && !Number.isNaN(snoozedMs) && snoozedMs > nowMs;
  const isDueNow = slot.outcome === null && !isSnoozed && slot.triggerAt.getTime() <= nowMs;
  const actedTime = formatTimestamp12(slot.actedAt);

  return (
    <View
      style={{
        backgroundColor: slot.outcome ? c.surfaceSunken : c.surface,
        borderRadius: radius.lg,
        borderWidth: highlighted ? 1.5 : 1,
        borderColor: highlighted ? c.accent : c.line,
        padding: space.lg,
        gap: space.md,
      }}
    >
      <Tappable
        onPress={onOpenMedication}
        accessibilityLabel={`${slot.medicationName}${slot.strength ? ` ${slot.strength}` : ''}, ${timeLabel}${subtitle ? `, ${subtitle}` : ''}`}
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}
      >
        <View style={{ minWidth: 74, gap: 4 }}>
          <Txt variant="headline" color={slot.outcome ? c.ink3 : c.ink}>
            {timeLabel}
          </Txt>
          {isDueNow && (
            <View style={{ alignSelf: 'flex-start', backgroundColor: c.warnSoft, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 }}>
              <Txt variant="micro" color={c.warn}>DUE NOW</Txt>
            </View>
          )}
          {isSnoozed && (
            <View style={{ alignSelf: 'flex-start', backgroundColor: c.accentSoft, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 }}>
              <Txt variant="micro" color={c.ink2}>SNOOZED</Txt>
            </View>
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="headline" color={slot.outcome ? c.ink2 : c.ink} numberOfLines={2}>
            {slot.medicationName}
            {slot.strength ? ` ${slot.strength}` : ''}
          </Txt>
          {!!subtitle && (
            <Txt variant="caption" color={c.ink3} numberOfLines={2}>
              {subtitle}
            </Txt>
          )}
          {isSnoozed && slot.snoozedUntil && (
            <Txt variant="caption" color={c.ink2}>
              Snoozed until {formatTimestamp12(slot.snoozedUntil)}
            </Txt>
          )}
        </View>
        <Icon name="chevron-right" size={18} color={c.ink3} />
      </Tappable>

      {slot.outcome === 'taken' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Icon name="check-circle-outline" size={18} color={c.ink2} />
            <Txt variant="caption" color={c.ink2}>
              {actedTime ? `Taken at ${actedTime}` : 'Taken'}
            </Txt>
          </View>
          <Tappable
            onPress={onUndo}
            disabled={busy}
            dimmed={busy}
            hitSlop={8}
            accessibilityLabel={`Undo taken for ${slot.medicationName} at ${timeLabel}`}
            style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: space.sm }}
          >
            <Txt variant="label" color={c.ink} style={{ textDecorationLine: 'underline' }}>Undo</Txt>
          </Tappable>
        </View>
      ) : slot.outcome === 'skipped' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Icon name="minus-circle-outline" size={18} color={c.ink3} />
            <Txt variant="caption" color={c.ink3}>Skipped</Txt>
          </View>
          <Tappable
            onPress={onUndo}
            disabled={busy}
            dimmed={busy}
            hitSlop={8}
            accessibilityLabel={`Undo skipped for ${slot.medicationName} at ${timeLabel}`}
            style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: space.sm }}
          >
            <Txt variant="label" color={c.ink} style={{ textDecorationLine: 'underline' }}>Undo</Txt>
          </Tappable>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <DoseActionButton
            label="Taken"
            icon="check"
            kind="primary"
            disabled={busy}
            onPress={onTaken}
            accessibilityLabel={`Mark ${slot.medicationName} ${timeLabel} as taken`}
          />
          <DoseActionButton
            label="Snooze 15m"
            icon="alarm-snooze"
            kind="secondary"
            disabled={busy}
            onPress={onSnooze}
            accessibilityLabel={`Snooze ${slot.medicationName} ${timeLabel} for 15 minutes`}
          />
          <DoseActionButton
            label="Skip"
            icon="close"
            kind="muted"
            disabled={busy}
            onPress={onSkip}
            accessibilityLabel={`Skip ${slot.medicationName} ${timeLabel}`}
          />
        </View>
      )}
    </View>
  );
}

function DoseActionButton({
  label,
  icon,
  kind,
  disabled,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  icon: 'check' | 'alarm-snooze' | 'close';
  kind: 'primary' | 'secondary' | 'muted';
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const c = useColors();
  const palette =
    kind === 'primary'
      ? { bg: c.accent, fg: c.onAccent, border: c.accent }
      : kind === 'secondary'
        ? { bg: c.surface, fg: c.ink, border: c.line }
        : { bg: c.surface, fg: c.ink3, border: c.line };

  return (
    <Tappable
      onPress={onPress}
      disabled={disabled}
      dimmed={disabled}
      haptic
      accessibilityLabel={accessibilityLabel}
      style={{
        minHeight: 44,
        paddingHorizontal: space.md,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.bg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Icon name={icon} size={16} color={palette.fg} />
      <Txt variant="label" color={palette.fg}>{label}</Txt>
    </Tappable>
  );
}

function courseStatusLabel(medication: Medication, today: string): { label: string; ended: boolean } {
  if (medication.status === 'stopped') return { label: 'Stopped', ended: true };
  if (isCourseEnded(medication, today)) {
    return {
      label: medication.endDate ? `Course ended ${formatDate(medication.endDate)}` : 'Completed',
      ended: true,
    };
  }
  if (medication.startDate > today) {
    return {
      label: medication.endDate
        ? `Starts ${formatDate(medication.startDate)} · Ends ${formatDate(medication.endDate)}`
        : `Starts ${formatDate(medication.startDate)}`,
      ended: false,
    };
  }
  if (medication.endDate) {
    const totalDays = medication.durationDays ?? Math.max(1, diffCivilDays(medication.startDate, medication.endDate) + 1);
    const day = Math.min(totalDays, Math.max(1, diffCivilDays(medication.startDate, today) + 1));
    return {
      label: `Day ${day} of ${totalDays} · Ends ${formatDate(medication.endDate)}`,
      ended: false,
    };
  }
  return { label: 'Ongoing', ended: false };
}

/** Active or finished medication course card shown on `/medications`. */
export function MedicationCard({
  medication,
  today,
  onPress,
  onOpenRecord,
}: {
  medication: Medication;
  today: string;
  onPress: () => void;
  onOpenRecord?: (recordId: string) => void;
}) {
  const c = useColors();
  const course = courseStatusLabel(medication, today);
  const summary = formatScheduleSummary(medication);
  const prescriberLine = [
    medication.prescriber ? `Prescribed by ${medication.prescriber}` : null,
    medication.prescribedDate ? formatDate(medication.prescribedDate, { year: true }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      style={{
        backgroundColor: course.ended ? c.surfaceSunken : c.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.line,
        padding: space.lg,
        gap: space.md,
      }}
    >
      <Tappable
        onPress={onPress}
        accessibilityLabel={`${medication.name}${medication.strength ? ` ${medication.strength}` : ''}, ${summary}, ${course.label}. Tap to edit`}
        style={{ gap: space.sm }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
          <View style={{ width: 34, height: 34, borderRadius: radius.sm, backgroundColor: course.ended ? c.surface : c.accentSoft, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
            <Icon name="pill" size={18} color={course.ended ? c.ink3 : c.ink} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="headline" color={course.ended ? c.ink2 : c.ink} numberOfLines={2}>
              {medication.name}
              {medication.strength ? ` ${medication.strength}` : ''}
            </Txt>
            {!!medication.dose && (
              <Txt variant="label" color={c.ink2} numberOfLines={1}>
                {medication.dose}
              </Txt>
            )}
          </View>
          <Icon name="chevron-right" size={20} color={c.ink3} />
        </View>

        <Txt variant="caption" color={c.ink2}>
          {summary}
        </Txt>

        {!!medication.instructions && (
          <Txt variant="caption" color={c.ink3} numberOfLines={2}>
            {medication.instructions}
          </Txt>
        )}

        {!!prescriberLine && (
          <Txt variant="caption" color={c.ink3} numberOfLines={1}>
            {prescriberLine}
          </Txt>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingTop: 2 }}>
          <View
            style={{
              backgroundColor: course.ended ? c.surface : c.accentSoft,
              borderWidth: course.ended ? 1 : 0,
              borderColor: c.line,
              borderRadius: radius.pill,
              paddingHorizontal: space.md,
              paddingVertical: 4,
            }}
          >
            <Txt variant="caption" color={course.ended ? c.ink3 : c.ink2}>
              {course.label}
            </Txt>
          </View>

          {!course.ended && !medication.remindersEnabled && medication.scheduleKind !== 'as_needed' && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: c.surfaceSunken,
                borderRadius: radius.pill,
                paddingHorizontal: space.md,
                paddingVertical: 4,
              }}
            >
              <Icon name="bell-off-outline" size={13} color={c.ink3} />
              <Txt variant="caption" color={c.ink3}>Reminders off</Txt>
            </View>
          )}
        </View>
      </Tappable>

      {medication.sourceRecordId && onOpenRecord && (
        <>
          <Rule />
          <TextLink
            label={course.ended ? 'View source prescription' : 'View prescription'}
            onPress={() => onOpenRecord(medication.sourceRecordId!)}
          />
        </>
      )}
    </View>
  );
}

function FlaggedBox({ flagged, message, children }: { flagged: boolean; message?: string; children: ReactNode }) {
  const c = useColors();
  if (!flagged) return <>{children}</>;
  return (
    <View style={{ backgroundColor: c.warnSoft, borderWidth: 1, borderColor: c.warn, borderRadius: radius.md, padding: space.md, gap: space.sm }}>
      {children}
      {!!message && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="alert-circle-outline" size={15} color={c.warn} />
          <Txt variant="caption" color={c.warn} style={{ flex: 1 }}>{message}</Txt>
        </View>
      )}
    </View>
  );
}

/** Shared medication form fields used by both `/medications/review` and `/medications/[id]`. */
export function MedicationFormFields({
  value,
  onChange,
  errors = {},
  flaggedFields = [],
  rawFrequency,
  anchorText,
  onAnchorTextChange,
  timeDraft,
  onTimeDraftChange,
}: {
  value: MedicationFormValue;
  onChange: (next: MedicationFormValue) => void;
  errors?: MedicationFormErrors;
  flaggedFields?: FlaggedField[];
  rawFrequency?: string;
  anchorText?: string;
  onAnchorTextChange?: (text: string) => void;
  timeDraft?: string;
  onTimeDraftChange?: (text: string) => void;
}) {
  const c = useColors();
  const [localTimeDraft, setLocalTimeDraft] = useState('');
  const [localTimeError, setLocalTimeError] = useState<string | null>(null);
  const [localAnchor, setLocalAnchor] = useState(value.times[0] ?? '');

  const draftTime = timeDraft ?? localTimeDraft;
  const setDraftTime = (v: string) => {
    setLocalTimeError(null);
    if (onTimeDraftChange) onTimeDraftChange(v);
    else setLocalTimeDraft(v);
  };

  const anchor = anchorText ?? localAnchor;
  const setAnchor = (v: string) => {
    if (onAnchorTextChange) onAnchorTextChange(v);
    else setLocalAnchor(v);
  };

  const flagSet = new Set(flaggedFields);
  const setField = <K extends keyof MedicationFormValue>(k: K, v: MedicationFormValue[K]) => onChange({ ...value, [k]: v });

  const addDailyTime = () => {
    const trimmed = draftTime.trim();
    if (!trimmed) return;
    const parsed = parseUserTime(trimmed);
    if (!parsed) {
      setLocalTimeError('Use a time like 08:00, 14:30, or 8:00 PM.');
      return;
    }
    if (value.times.includes(parsed)) {
      setDraftTime('');
      return;
    }
    if (value.times.length >= MAX_DAILY_TIMES) {
      setLocalTimeError(`Up to ${MAX_DAILY_TIMES} times per day.`);
      return;
    }
    onChange({ ...value, times: [...value.times, parsed].sort() });
    setDraftTime('');
  };

  const handleScheduleKind = (next: ScheduleKind) => {
    if (next === value.scheduleKind) return;
    if (next === 'as_needed') {
      onChange({ ...value, scheduleKind: 'as_needed', remindersEnabled: false });
      return;
    }
    if (next === 'interval_hours') {
      const first = value.times[0] && isValidTime24(value.times[0]) ? [value.times[0]] : [];
      setAnchor(first[0] ?? '');
      onChange({
        ...value,
        scheduleKind: 'interval_hours',
        times: first,
        remindersEnabled: value.scheduleKind === 'as_needed' ? true : value.remindersEnabled,
      });
      return;
    }
    onChange({
      ...value,
      scheduleKind: 'daily_times',
      remindersEnabled: value.scheduleKind === 'as_needed' ? true : value.remindersEnabled,
    });
  };

  const handleStartDate = (raw: string) => {
    const cleaned = raw.replace(/[^\d-]/g, '').slice(0, 10);
    const dur = Number(value.durationDays.trim());
    if (isCivilDate(cleaned) && Number.isInteger(dur) && dur >= 1 && dur <= 365) {
      const nextEnd = computeEndDate(cleaned, dur) ?? '';
      onChange({ ...value, startDate: cleaned, endDate: nextEnd });
      return;
    }
    onChange({ ...value, startDate: cleaned });
  };

  const handleDurationDays = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 3);
    if (!digits) {
      onChange({ ...value, durationDays: '', endDate: '' });
      return;
    }
    const n = Number(digits);
    if (Number.isInteger(n) && n >= 1 && n <= 365 && isCivilDate(value.startDate)) {
      const nextEnd = computeEndDate(value.startDate, n) ?? '';
      onChange({ ...value, durationDays: digits, endDate: nextEnd });
      return;
    }
    onChange({ ...value, durationDays: digits });
  };

  const handleEndDate = (raw: string) => {
    const cleaned = raw.replace(/[^\d-]/g, '').slice(0, 10);
    if (!cleaned) {
      onChange({ ...value, endDate: '', durationDays: '' });
      return;
    }
    if (isCivilDate(cleaned) && isCivilDate(value.startDate) && cleaned >= value.startDate) {
      const days = diffCivilDays(value.startDate, cleaned) + 1;
      onChange({ ...value, endDate: cleaned, durationDays: days >= 1 && days <= 365 ? String(days) : '' });
      return;
    }
    onChange({ ...value, endDate: cleaned });
  };

  const handleAnchorChange = (raw: string) => {
    setAnchor(raw);
    const parsed = parseUserTime(raw);
    onChange({ ...value, times: parsed ? [parsed] : [] });
  };

  const scheduleFlagged = flagSet.has('schedule') || flagSet.has('frequency');
  const timesError = localTimeError ?? errors.times;

  return (
    <View style={{ gap: space.lg }}>
      <FlaggedBox flagged={flagSet.has('name')} message="Check the medication name against your prescription.">
        <Field
          label="Medication name"
          value={value.name}
          onChangeText={(v) => setField('name', v)}
          placeholder="e.g. Amoxicillin"
          autoCapitalize="words"
          error={errors.name}
        />
      </FlaggedBox>

      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <FlaggedBox flagged={flagSet.has('strength')} message="Check strength.">
            <Field
              label="Strength (optional)"
              value={value.strength}
              onChangeText={(v) => setField('strength', v)}
              placeholder="e.g. 500 mg"
            />
          </FlaggedBox>
        </View>
        <View style={{ flex: 1 }}>
          <FlaggedBox flagged={flagSet.has('dose')} message="Check dose.">
            <Field
              label="Dose (optional)"
              value={value.dose}
              onChangeText={(v) => setField('dose', v)}
              placeholder="e.g. 1 capsule"
            />
          </FlaggedBox>
        </View>
      </View>

      {!!rawFrequency && (
        <View style={{ backgroundColor: c.surfaceSunken, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: space.sm, gap: 2 }}>
          <Eyebrow>Frequency on prescription</Eyebrow>
          <Txt variant="body" color={c.ink}>{rawFrequency}</Txt>
        </View>
      )}

      <FlaggedBox
        flagged={scheduleFlagged}
        message={
          value.scheduleKind === 'as_needed'
            ? 'Set the exact schedule or keep this as As needed.'
            : 'Prescription did not state exact clock hours. Enter your reminder times yourself or turn reminders off.'
        }
      >
        <View style={{ gap: space.md }}>
          <View style={{ gap: 6 }}>
            <Txt variant="label">Schedule</Txt>
            <Segmented<ScheduleKind>
              label="Schedule type"
              items={SCHEDULE_OPTIONS}
              value={value.scheduleKind}
              onChange={handleScheduleKind}
            />
          </View>

          {value.scheduleKind === 'daily_times' && (
            <View style={{ gap: space.sm }}>
              <Field
                label="Reminder times"
                value={draftTime}
                onChangeText={setDraftTime}
                onSubmitEditing={addDailyTime}
                onBlur={() => {
                  if (parseUserTime(draftTime)) addDailyTime();
                }}
                returnKeyType="done"
                submitBehavior="submit"
                placeholder="e.g. 08:00 or 8:00 PM"
                error={timesError}
                hint={timesError ? undefined : 'Enter one time at a time, e.g. 08:00 or 20:00.'}
              />
              {!!draftTime.trim() && (
                <Tappable
                  onPress={addDailyTime}
                  accessibilityLabel={`Add time ${draftTime.trim()}`}
                  hitSlop={8}
                  style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36 }}
                >
                  <Icon name="plus" size={18} color={c.accent} />
                  <Txt variant="label" color={c.accent}>
                    Add {parseUserTime(draftTime) ? formatTime12(parseUserTime(draftTime)!) : `“${draftTime.trim()}”`}
                  </Txt>
                </Tappable>
              )}
              {value.times.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                  {value.times.map((t) => (
                    <Tappable
                      key={t}
                      onPress={() => onChange({ ...value, times: value.times.filter((x) => x !== t) })}
                      accessibilityLabel={`Remove ${formatTime12(t)}`}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingLeft: 12,
                        paddingRight: 10,
                        minHeight: 36,
                        borderRadius: radius.pill,
                        backgroundColor: c.surface,
                        borderWidth: 1,
                        borderColor: c.line,
                      }}
                    >
                      <Icon name="clock-outline" size={14} color={c.ink2} />
                      <Txt variant="label">{formatTime12(t)}</Txt>
                      <Icon name="close" size={14} color={c.ink3} />
                    </Tappable>
                  ))}
                </View>
              )}
            </View>
          )}

          {value.scheduleKind === 'interval_hours' && (
            <View style={{ gap: space.md }}>
              <View style={{ gap: 6 }}>
                <Txt variant="label">Every</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                  {INTERVAL_PRESETS.map((h) => (
                    <Chip
                      key={h}
                      label={`${h} hrs`}
                      selected={value.intervalHours === h}
                      onPress={() => setField('intervalHours', value.intervalHours === h ? null : h)}
                    />
                  ))}
                </View>
              </View>
              <Field
                label="Or custom hours (1–24)"
                value={value.intervalHours ? String(value.intervalHours) : ''}
                onChangeText={(raw) => {
                  const d = raw.replace(/\D/g, '').slice(0, 2);
                  if (!d) return setField('intervalHours', null);
                  const n = Number(d);
                  setField('intervalHours', n > 0 ? n : null);
                }}
                keyboardType="number-pad"
                placeholder="e.g. 8"
                error={errors.intervalHours}
              />
              <Field
                label="First dose time"
                value={anchor}
                onChangeText={handleAnchorChange}
                onBlur={() => {
                  const parsed = parseUserTime(anchor);
                  if (parsed) setAnchor(parsed);
                }}
                placeholder="e.g. 08:00 or 8:00 AM"
                error={errors.times}
                hint={errors.times ? undefined : value.times[0] ? `Anchored from ${formatTime12(value.times[0])}` : 'Enter the time of the first dose of the day.'}
              />
            </View>
          )}

          {value.scheduleKind === 'as_needed' && (
            <Txt variant="caption" color={c.ink3}>
              As-needed medications stay on your active list with no scheduled reminders.
            </Txt>
          )}
        </View>
      </FlaggedBox>

      <View style={{ gap: 6 }}>
        <Txt variant="label">Meal timing</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }} accessibilityRole="radiogroup">
          {MEAL_OPTIONS.map((m) => (
            <Chip
              key={m.key}
              label={m.label}
              selected={(value.mealTiming ?? 'anytime') === m.key}
              onPress={() => setField('mealTiming', m.key)}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Field
          label="Start date"
          value={value.startDate}
          onChangeText={handleStartDate}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          error={errors.startDate}
        />
        {value.startDate !== todayIso() && (
          <Tappable onPress={() => handleStartDate(todayIso())} accessibilityLabel="Use today's date" hitSlop={8} style={{ alignSelf: 'flex-start' }}>
            <Txt variant="label" color={c.accent}>Use today</Txt>
          </Tappable>
        )}
      </View>

      <FlaggedBox flagged={flagSet.has('duration')} message="Check how many days this course lasts, or leave blank if ongoing.">
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Duration (days)"
              value={value.durationDays}
              onChangeText={handleDurationDays}
              keyboardType="number-pad"
              placeholder="Optional"
              error={errors.durationDays}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="End date"
              value={value.endDate}
              onChangeText={handleEndDate}
              placeholder="Ongoing"
              keyboardType="numbers-and-punctuation"
              error={errors.endDate}
            />
          </View>
        </View>
        {(!!value.durationDays || !!value.endDate) && (
          <Tappable
            onPress={() => onChange({ ...value, durationDays: '', endDate: '' })}
            accessibilityLabel="Clear end date and make ongoing"
            hitSlop={8}
            style={{ alignSelf: 'flex-start' }}
          >
            <Txt variant="label" color={c.ink2}>Ongoing (no end date)</Txt>
          </Tappable>
        )}
      </FlaggedBox>

      <Field
        label="Instructions (optional)"
        value={value.instructions}
        onChangeText={(v) => setField('instructions', v)}
        placeholder="e.g. Finish full course, take with water"
        multiline
        textAlignVertical="top"
        style={{ minHeight: 76 }}
      />

      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Prescriber (optional)"
            value={value.prescriber}
            onChangeText={(v) => setField('prescriber', v)}
            placeholder="e.g. Dr. Cruz"
            autoCapitalize="words"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Prescribed date"
            value={value.prescribedDate}
            onChangeText={(v) => setField('prescribedDate', v.replace(/[^\d-]/g, '').slice(0, 10))}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            error={errors.prescribedDate}
          />
        </View>
      </View>

      {value.scheduleKind !== 'as_needed' && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            backgroundColor: c.surface,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: c.line,
            padding: space.lg,
          }}
        >
          <Icon name={value.remindersEnabled ? 'bell-outline' : 'bell-off-outline'} size={22} color={c.ink} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="headline">Remind me at scheduled times</Txt>
            <Txt variant="caption" color={c.ink3}>
              {value.remindersEnabled
                ? 'MedRec schedules private local reminders on this device.'
                : 'Off · stays on your active list with no notifications.'}
            </Txt>
          </View>
          <Toggle
            value={value.remindersEnabled}
            onValueChange={(v) => setField('remindersEnabled', v)}
            accessibilityLabel="Remind me at scheduled times"
          />
        </View>
      )}
    </View>
  );
}
