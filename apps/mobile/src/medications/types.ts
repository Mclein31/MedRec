export type ScheduleKind = 'daily_times' | 'interval_hours' | 'as_needed';
export type MealTiming = 'before_meal' | 'with_meal' | 'after_meal' | 'anytime';
export type MedicationStatus = 'active' | 'stopped' | 'completed';
export type DoseOutcome = 'taken' | 'skipped';
export type ExtractionConfidence = 'high' | 'low';

/** Medication line extracted by Gemini inside AiSnapshot.medications[]. */
export interface ExtractedMedicationLine {
  name: string;
  dosage: string | null;
  frequency: string | null;
  strength?: string | null;
  dose?: string | null;
  scheduleKind?: ScheduleKind | null;
  times?: string[];
  intervalHours?: number | null;
  mealTiming?: MealTiming | null;
  durationDays?: number | null;
  endDate?: string | null;
  instructions?: string | null;
  confidence?: ExtractionConfidence;
}

/** Saved medication returned by the API. */
export interface Medication {
  id: string;
  personId: string | null;
  sourceRecordId: string | null;
  name: string;
  strength: string | null;
  dose: string | null;
  instructions: string | null;
  prescriber: string | null;
  prescribedDate: string | null;
  scheduleKind: ScheduleKind;
  /** 24-hour 'HH:MM' strings in local civil time, sorted ascending. */
  times: string[];
  intervalHours: number | null;
  mealTiming: MealTiming | null;
  startDate: string;
  endDate: string | null;
  durationDays: number | null;
  status: MedicationStatus;
  remindersEnabled: boolean;
  confirmedAt: string;
  stoppedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationInput {
  personId?: string | null;
  sourceRecordId?: string | null;
  name: string;
  strength?: string | null;
  dose?: string | null;
  instructions?: string | null;
  prescriber?: string | null;
  prescribedDate?: string | null;
  scheduleKind: ScheduleKind;
  times: string[];
  intervalHours?: number | null;
  mealTiming?: MealTiming | null;
  startDate: string;
  endDate?: string | null;
  durationDays?: number | null;
  remindersEnabled?: boolean;
}

export type MedicationPatch = Partial<Omit<MedicationInput, 'personId' | 'sourceRecordId'>> & {
  status?: MedicationStatus;
};

export interface MedicationLog {
  id: string;
  medicationId: string;
  scheduledDate: string;
  scheduledTime: string;
  outcome: DoseOutcome;
  actedAt: string;
  notes: string | null;
}

export interface DoseLogInput {
  scheduledDate: string;
  scheduledTime: string;
  outcome: DoseOutcome;
  actedAt?: string;
  notes?: string | null;
}

export type FlaggedField = 'name' | 'strength' | 'dose' | 'frequency' | 'schedule' | 'duration';

/** Client-side draft used on /medications/review before anything is saved. */
export interface MedicationReviewDraft {
  key: string;
  confirmed: boolean;
  name: string;
  strength: string;
  dose: string;
  rawFrequency: string;
  instructions: string;
  prescriber: string;
  prescribedDate: string;
  scheduleKind: ScheduleKind;
  times: string[];
  intervalHours: number | null;
  mealTiming: MealTiming | null;
  startDate: string;
  durationDays: string;
  endDate: string;
  remindersEnabled: boolean;
  confidence: ExtractionConfidence;
  lowConfidenceFields: FlaggedField[];
  needsAttention: boolean;
}

/** Concrete dose occurrence for a specific calendar day and 'HH:MM' time. */
export interface ScheduledSlot {
  /** Deterministic key: `${medicationId}:${scheduledDate}:${scheduledTime}` */
  slotKey: string;
  medicationId: string;
  personId: string | null;
  medicationName: string;
  strength: string | null;
  dose: string | null;
  mealTiming: MealTiming | null;
  instructions: string | null;
  scheduledDate: string;
  scheduledTime: string;
  /** Local Date when the notification should fire. */
  triggerAt: Date;
  outcome: DoseOutcome | null;
  actedAt: string | null;
  snoozedUntil: string | null;
}

export type NotificationPermissionState = 'undetermined' | 'granted' | 'denied' | 'unsupported';
