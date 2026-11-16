---
type: implementation-plan
title: MedRecord_App Medication Reminders Plan
project: MedRecord_App
status: implemented
last_updated: 2026-11-16
---

# MedRec — Medication Reminders Implementation Plan

## Overview

When a person scans a doctor's prescription (or adds a medication manually), MedRec extracts the prescribed medication lines with Google Gemini, guides the user through a mandatory per-medication review and confirmation step, maintains an active medications list per person (account holder or family member via DD-55 caregiver profiles), and schedules privacy-preserving local notifications on iOS and Android that work offline.

---

## 1. End-to-End User Flow

### 1.1 Prescription Scan → AI Extraction → Record Saved

1. **Intake (`apps/mobile/app/add.tsx` & `apps/mobile/app/record/[id].tsx`):**
   - The user photographs or uploads pages of a prescription and taps **Read with AI** (`api.scan(fileIds)` → `POST /api/records/scan` → `scanDocument()` in `apps/api/src/lib/gemini.ts`).
   - `SCAN_SCHEMA` in `apps/api/src/lib/gemini.ts` is enriched (backwards-compatibly) so each item in `draft.medications[]` extracts:
     - `name: string` (required, e.g. `"Amoxicillin"`)
     - `strength: string | null` (e.g. `"500 mg"`)
     - `dose: string | null` (e.g. `"1 capsule"`, `"5 mL"`)
     - `frequency: string | null` (verbatim phrase from the page, e.g. `"3 times daily"`, `"every 8 hours"`, `"once daily at bedtime"`, `"as needed for pain"`)
     - `scheduleKind: 'daily_times' | 'interval_hours' | 'as_needed' | null`
     - `times: string[]` (`'HH:MM'` 24h strings only when explicitly stated or standard times like morning/evening are unambiguous; empty `[]` when unclear)
     - `intervalHours: number | null` (e.g. `8` for `"every 8 hours"`)
     - `mealTiming: 'before_meal' | 'with_meal' | 'after_meal' | 'anytime' | null`
     - `durationDays: number | null` (e.g. `7` for `"for 7 days"`)
     - `endDate: string | null` (`YYYY-MM-DD` if an explicit stop date is written on the prescription)
     - `instructions: string | null` (verbatim notes on the prescription, e.g. `"Take with plenty of water. Finish full course."`)
     - `confidence: 'high' | 'low'` (`'low'` whenever handwriting, print, dose, or frequency is ambiguous, partial, or hard to read)
   - Prescribing doctor and date come from the record's top-level `provider` (`draft.provider`) and `eventDate` (`draft.eventDate`), which the user already reviews in `RecordForm` (`apps/mobile/src/add/RecordForm.tsx`).
   - In the **Review details** step (`app/add.tsx`), `AiPanel` (`apps/mobile/src/ui/AiPanel.tsx`) displays the extracted medications with the caption: *"Read from your prescription. You can review and set reminders after saving this record."* **Saving the record does not activate any medication or schedule any reminder.**

2. **Post-Save & Existing-Record Entry Points:**
   - **On `Saved` (`apps/mobile/src/add/AddParts.tsx`):** When `record.ai?.medications?.length > 0`, a warm-folio callout card appears above **View this record**:
     - Eyebrow: `PRESCRIPTION MEDICATIONS`
     - Headline: `${n} ${n === 1 ? 'medication' : 'medications'} read from this record`
     - Body: `Review each medication and confirm the schedule before turning on reminders.`
     - Primary CTA button: **Review & set reminders** → navigates to `/medications/review?recordId=${record.id}`.
   - **On `RecordDetail` (`apps/mobile/app/record/[id].tsx`):** Whenever `r.ai?.medications?.length > 0`, a secondary CTA button **Review medications for reminders** opens `/medications/review?recordId=${r.id}`.

### 1.2 Mandatory Review & Explicit Confirmation (`/medications/review`)

1. **Draft preparation (`prepareReviewDrafts(record)` in `apps/mobile/src/medications/extract.ts`):**
   - Maps `record.ai.medications` into `MedicationReviewDraft[]`, prefilling `prescriber: record.provider`, `prescribedDate: record.eventDate`, `sourceRecordId: record.id`, and `personId: record.personId ?? activePersonId`.
   - Computes `lowConfidenceFields: ('name' | 'strength' | 'dose' | 'frequency' | 'schedule' | 'duration')[]` and `needsAttention: boolean`:
     - Any field that is `null`/empty (`dose`, `frequency`, `times` when `scheduleKind !== 'as_needed'`) is flagged.
     - If `med.confidence === 'low'` or the scan had `legible === false`, the entire card is badged **Check carefully against your prescription**.
   - **Never invents defaults for clinical values:** If Gemini could not read a dose or frequency, those fields remain blank and highlighted with a warm warning (`c.warnSoft` / `c.warn`) requiring the user to type what their prescription says or switch the schedule to **As needed (no reminders)** / **Keep on active list without reminders**.
2. **Per-medication confirmation gate:**
   - Each extracted medication is rendered as an expandable editor card with an explicit `Choice` / checkbox toggle: **"Confirm details are accurate for [Medication Name]"** (unchecked by default).
   - A medication cannot be checked as confirmed until its required fields are valid (`name` non-empty, `startDate` valid civil date, and if `remindersEnabled === true` and `scheduleKind !== 'as_needed'`, at least one valid `'HH:MM'` time).
   - Unchecked medications are skipped (not saved as active medications).
   - Tapping **Save confirmed medications (N)** calls `POST /api/medications/batch`, requests notification permissions if any confirmed medication has `remindersEnabled: true`, schedules local notifications on the device, and navigates to `/medications`.

### 1.3 Active Medications List, Reminders & Dose Actions (`/medications`)

1. **Today's schedule & Active courses (`apps/mobile/app/medications/index.tsx`):**
   - Person-scoped via `useActivePerson()` (`apps/mobile/src/people.ts`) with `PersonSwitcher` (`apps/mobile/src/ui/PersonSwitcher.tsx`) at the top when family members exist.
   - **Due Today / Upcoming Doses section:** Lists today's scheduled dose slots for the active person in chronological order (`08:00 AM`, `02:00 PM`, `08:00 PM`), showing status:
     - **Upcoming / Due now:** Action buttons **Taken**, **Snooze 15m**, **Skip**.
     - **Taken / Skipped:** Shows timestamp (`Taken at 8:04 AM` or `Skipped`) with an **Undo** link.
   - **Active Medications section:** Cards for each active medication showing `name`, `strength`, `dose`, schedule summary (`Twice daily · 8:00 AM, 8:00 PM · With food`), `prescriber`, link to source prescription record (`View prescription ↗` → `/record/[id]`), remaining days badge (`Day 3 of 7 · Ends Nov 22` or `Ongoing`), and tap to edit (`/medications/[id]`).
   - **Completed & Stopped section:** Collapsible or lower section listing courses that reached their `endDate` or were manually stopped by the user.

### 1.4 Automatic Course End & Manual Stop

- **Automatic course completion:**
  - Every medication with a finite course has `startDate` (`YYYY-MM-DD`) and `endDate` (`YYYY-MM-DD`). When a user enters `durationDays: N`, `endDate` is computed deterministically as `addCivilDays(startDate, N - 1)` (e.g. a 7-day course starting `2026-11-16` has `endDate = '2026-11-22'`, covering 7 full calendar days).
  - The local notification scheduler (`schedule.ts`) never generates a notification trigger after `endDate` `23:59:59` local time.
  - On the API (`GET /api/medications` and hourly `cleanup()` in `apps/api/src/app.ts`) and on the client (`isCourseEnded(med, todayIso())`), any `'active'` medication with `endDate < todayIso()` transitions to `status: 'completed'`.
- **Manual stop / pause:**
  - In `/medications/[id]`, the user can toggle **Reminders on/off** (`remindersEnabled`), tap **Stop this medication** (`PATCH /api/medications/:id` with `{ status: 'stopped' }`, which immediately cancels all pending local notifications for that medication), or **Delete medication** (`DELETE /api/medications/:id`).

### 1.5 Manual Add/Edit Without a Scan & Caregiver Profiles (DD-55)

- Tapping **Add medication** on `/medications` opens `/medications/new` (`apps/mobile/app/medications/[id].tsx` with `id === 'new'`), allowing the user to enter a medication without scanning a document, or to edit any existing medication.
- Every medication and dose log carries `personId: string | null` (`null` = account holder, UUID = family member in `people`).
- Local notifications are scheduled across **all people on the signed-in account** so a caregiver receives reminders for both their own medications and their child's or parent's medications on the same phone, even when `useActivePerson()` is currently switched to someone else.

---

## 2. Data Model and API

### 2.1 Database Migration (`apps/api/migrations/006_medications.sql`)

Follows the exact idempotent + forced RLS pattern of `001_init.sql`, `002_rls.sql`, and `003_people.sql`:

```sql
-- Medication reminders & dose adherence logs (DD-59).
-- person_id NULL means the account holder (DD-55); deleting a person cascades their medications.
-- Deleting a source record keeps the medication row with source_record_id = NULL.
-- Idempotent: safe to run repeatedly.

CREATE TABLE IF NOT EXISTS medications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  person_id           uuid REFERENCES people(id) ON DELETE CASCADE,
  source_record_id    uuid REFERENCES records(id) ON DELETE SET NULL,
  name                text NOT NULL,
  strength            text,
  dose                text,
  instructions        text,
  prescriber          text,
  prescribed_date     date,
  schedule_kind       text NOT NULL CHECK (schedule_kind IN ('daily_times', 'interval_hours', 'as_needed')),
  times               text[] NOT NULL DEFAULT '{}',
  interval_hours      integer CHECK (interval_hours IS NULL OR (interval_hours >= 1 AND interval_hours <= 24)),
  meal_timing         text CHECK (meal_timing IS NULL OR meal_timing IN ('before_meal', 'with_meal', 'after_meal', 'anytime')),
  start_date          date NOT NULL,
  end_date            date,
  duration_days       integer CHECK (duration_days IS NULL OR (duration_days >= 1 AND duration_days <= 365)),
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stopped', 'completed')),
  reminders_enabled   boolean NOT NULL DEFAULT true,
  confirmed_at        timestamptz NOT NULL DEFAULT now(),
  stopped_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT medications_end_after_start CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS medications_user_person_idx ON medications (user_id, person_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS medications_record_idx ON medications (source_record_id) WHERE source_record_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS medication_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  medication_id   uuid NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  scheduled_date  date NOT NULL,
  scheduled_time  text NOT NULL,
  outcome         text NOT NULL CHECK (outcome IN ('taken', 'skipped')),
  acted_at        timestamptz NOT NULL DEFAULT now(),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (medication_id, scheduled_date, scheduled_time)
);
CREATE INDEX IF NOT EXISTS medication_logs_user_date_idx ON medication_logs (user_id, scheduled_date DESC);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS owner_rows ON medications;
CREATE POLICY owner_rows ON medications
  USING (user_id = app_user_id() OR app_is_system())
  WITH CHECK (user_id = app_user_id() OR app_is_system());

ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS owner_rows ON medication_logs;
CREATE POLICY owner_rows ON medication_logs
  USING (user_id = app_user_id() OR app_is_system())
  WITH CHECK (user_id = app_user_id() OR app_is_system());

GRANT SELECT, INSERT, UPDATE, DELETE ON medications, medication_logs TO medrec_app;
```

### 2.2 API Endpoints (`apps/api/src/routes/medications.ts`, mounted at `/api/medications`)

All routes require `requireAuth` and execute queries with `asUser(userId)`:

1. `GET /api/medications?personId=<optional>&includeAllPersons=<0|1>&date=<YYYY-MM-DD>`
   - If `includeAllPersons=1`, returns all medications for the account across the account holder and all family members (used by the device's background/foreground notification scheduler so reminders for all family members stay scheduled).
   - Otherwise, resolves `personId` via `resolvePerson(db, userId, c.req.query('personId'))` and filters by `personFilter('m', 2)`.
   - Automatically marks any row with `status = 'active' AND end_date < $today::date` as `status = 'completed'` before returning.
   - Also returns `logs: MedicationLog[]` for the requested `date` (defaults to today in UTC or +/- 1 day window so local today is always covered).
2. `POST /api/medications`
   - Creates a single confirmed medication. Validates `personId` via `resolvePerson`. If `sourceRecordId` is provided, verifies the record belongs to `userId` and the same `person_id` (`422 RECORD_MISMATCH` / `404` if not).
   - Logs activity `kind: 'medication_added'`, `title: 'Medication added'` (no medication name or dose stored in `activity` per `001_init.sql` comment: *"Holds metadata only, never clinical values"*).
3. `POST /api/medications/batch`
   - Accepts `{ personId?: string | null, sourceRecordId?: string | null, items: MedicationInput[] }` (1–20 items) from the prescription review screen. Inserts confirmed medications and returns `{ medications: Medication[] }`.
4. `GET /api/medications/:id`
   - Returns `{ medication: Medication, logs: MedicationLog[] }` (last 14 days of dose logs). Returns `404 NOT_FOUND` if not owned by `userId`.
5. `PATCH /api/medications/:id`
   - Updates fields (`name`, `strength`, `dose`, `instructions`, `prescriber`, `prescribedDate`, `scheduleKind`, `times`, `intervalHours`, `mealTiming`, `startDate`, `endDate`, `durationDays`, `status`, `remindersEnabled`). Sets `stopped_at = now()` when transitioning to `status = 'stopped'`.
6. `DELETE /api/medications/:id`
   - Deletes the medication (cascading its `medication_logs`) and logs `kind: 'medication_deleted'`.
7. `PUT /api/medications/:id/logs`
   - Upserts a dose log for `{ scheduledDate: 'YYYY-MM-DD', scheduledTime: 'HH:MM', outcome: 'taken' | 'skipped', actedAt?: string, notes?: string }` using `ON CONFLICT (medication_id, scheduled_date, scheduled_time) DO UPDATE`.
8. `DELETE /api/medications/:id/logs?scheduledDate=YYYY-MM-DD&scheduledTime=HH:MM`
   - Undoes a dose log (`Taken` / `Skipped`) for that slot.

### 2.3 Integration with Ask Remy, Health Summary & Export (`apps/api/src/routes/vault.ts`)

- `POST /api/ai/ask` and `POST /api/ai/summary`: Query active `medications` for the target `personId` and include a structured line in the model context (`Active prescribed medications: Amoxicillin 500 mg (1 capsule, 08:00, 20:00, until Nov 22, 2026); ...`) alongside `profile.medications`.
- `GET /api/export`: Includes `medications: Medication[]` and `medicationLogs: MedicationLog[]` in the exported JSON bundle.

### 2.4 What Stays On Device Only (`apps/mobile/src/lib/storage.ts` & `src/prefs.ts`)

- **OS Notification IDs & schedule ledger (`KEYS.medsNotifMap(userId)`):** Maps `{ slotKey -> expoNotificationId }`, plus `lastScheduledTimeZone: string` and `lastScheduledAt: string`. Never sent to the server.
- **Snooze state (`KEYS.medsSnooze(userId)`):** Ephemeral map of `{ [slotKey]: { snoozedUntil: string, notificationId: string } }`.
- **Offline cache & dose-log outbox (`KEYS.medsCache(userId)` & `KEYS.medsOutbox(userId)`):** Cached `Medication[]` (across all family members on the account) and pending offline `taken`/`skipped` actions so reminders and dose logging work with zero network connectivity and flush on reconnect.
- **Lock-screen privacy preference (`Prefs.showMedicationNamesOnLockScreen: boolean`, default `false` in `apps/mobile/src/prefs.ts`):** Stored in `KEYS.prefs` on device only.

---

## 3. Reminder Engine (`expo-notifications` on Expo SDK 58)

### 3.1 Package & Platform Setup (`expo-notifications ~58.1.9`)

- `expo-notifications` is **not currently installed** in `apps/mobile/package.json`. Expo SDK 58 bundles `"expo-notifications": "~58.1.9"` (verified in `apps/mobile/node_modules/expo/bundledNativeModules.json`).
- **Local Concrete `DATE` Triggers (`SchedulableTriggerInputTypes.DATE`):**
  - Instead of open-ended repeating `DAILY` triggers (which cannot stop automatically on `endDate`, cannot express arbitrary `interval_hours`, and quickly exhaust iOS's 64-notification limit when multiple daily times exist), MedRec compiles all active medications across the account into concrete upcoming dose occurrences (`ScheduledSlot[]`) over a rolling horizon (up to 14 days ahead) and schedules the soonest **47 concrete occurrences** as individual `DATE` notifications.
- **Pending-Notification Cap (iOS 64-Notification Limit):**
  - iOS (`UNUserNotificationCenter`) enforces a hard cap of **64 pending local notifications per app**.
  - MedRec caps scheduled medication notifications at **`MAX_SCHEDULED_NOTIFICATIONS = 48`**:
    - Up to **47 concrete dose reminders** (`slotKey = "${medicationId}:${scheduledDate}:${scheduledTime}"`), sorted chronologically by `triggerAt`.
    - **Slot #48 (Catch-up Renewal Notification):** If there are additional upcoming doses beyond the 47th notification, the 48th slot is scheduled 1 hour after the 47th dose with title `"MedRec reminder"` and body `"Open MedRec to refresh your upcoming medication reminders."` Opening the app automatically replenishes the rolling 48-notification window.
    - Leaving 16 slots of headroom below 64 guarantees that snoozed notifications (15-minute one-shot triggers) never evict scheduled doses on iOS.
- **Android Notification Channel & Exact Timing:**
  - Registers channel `'medication-reminders'` with `AndroidImportance.HIGH`, default sound, vibration `[0, 250, 250, 250]`, and `AndroidNotificationVisibility.PUBLIC` (since lock-screen privacy is enforced by MedRec's own notification text).
  - Uses concrete `DATE` triggers (`{ type: SchedulableTriggerInputTypes.DATE, date: slot.triggerAt, channelId: 'medication-reminders' }`), which work without requiring special Google Play restricted `USE_EXACT_ALARM` approval while still firing reliably through Android notification channels.

### 3.2 Rescheduling Lifecycle

`syncMedicationNotifications()` in `apps/mobile/src/medications/notifications.ts` runs:
1. Whenever a medication is confirmed, created, edited, paused, stopped, or deleted.
2. Whenever a dose is marked **Taken** or **Skipped** (immediately cancels that slot's pending OS notification if marked before the scheduled time, and cancels any active snooze for that slot).
3. Whenever the user toggles **Show medication names on lock screen** in Preferences.
4. On app launch and whenever `AppState` transitions to `'active'` (`app/_layout.tsx`):
   - Compares `Intl.DateTimeFormat().resolvedOptions().timeZone` against `lastScheduledTimeZone`. If the user traveled across timezones or DST shifted, or if `getAllScheduledNotificationsAsync()` is empty (e.g. after app reinstall or device restore), rebuilds all pending notifications from the synced medications list.
5. On sign-out (`resetMedications()`): Cancels all MedRec-scheduled notifications on the device and clears local medication caches for that user.

### 3.3 Permission Denied Path

-MedRec never prompts for notification permissions on cold app launch.
- Permission is requested (`Notifications.requestPermissionsAsync()`) only when the user confirms a prescription medication with reminders enabled or turns on reminders in `/medications`.
- If permission is `denied` (or `Platform.OS === 'web'`):
  - The medication is still saved and its daily schedule appears in `/medications` so the user can track doses in-app.
  - A calm `Banner tone="warn"` is shown at the top of `/medications`:
    - Native denied: *"Notifications are turned off for MedRec. Turn them on in Settings to get lock-screen reminders when a dose is due."* with action `{ label: 'Settings', onPress: () => Linking.openSettings() }`.
    - Web: *"Browser preview shows your schedule and logs doses, but lock-screen reminders require the iPhone or Android app."*

### 3.4 Lock-Screen Privacy (Default Quiet Wording)

- **Default (`prefs.showMedicationNamesOnLockScreen === false`):**
  - Account holder:
    - Title: `"MedRec reminder"`
    - Body: `"Time for your 8:00 AM scheduled medication. Open MedRec to view and log your dose."`
  - Caregiver family member (e.g. `personName = "Mia"`):
    - Title: `"MedRec · For Mia"`
    - Body: `"Time for Mia's 8:00 AM scheduled medication. Open MedRec to view details."`
  - **Zero clinical data (no drug name, strength, dose, or instructions) is placed in the notification title or body.**
- **Opt-in (`prefs.showMedicationNamesOnLockScreen === true`):**
  - Title: `"Time for Amoxicillin (500 mg)"` (or `"Mia · Amoxicillin (500 mg)"`)
  - Body: `"1 capsule · With food · 8:00 AM"`

---

## 4. Safety Rules (Non-Negotiable)

1. **Never invent, change, or suggest doses:**
   - Both `GUARDRAILS` in `apps/api/src/lib/gemini.ts` and `extract.ts` in `apps/mobile/src/medications/extract.ts` strictly forbid filling in missing strengths, doses, frequencies, or durations. If a prescription says `"Amoxicillin 500mg"` with no readable frequency, `frequency` is `null` and `times` is `[]`; the UI flags the field in amber (`c.warnSoft`) and requires the user to look at their bottle/paper prescription and enter it themselves.
2. **Explicit provenance & verification copy:**
   - Every AI-extracted medication card on `/medications/review` displays the eyebrow `READ FROM YOUR PRESCRIPTION — PLEASE CHECK` and a per-card confirmation checkbox that starts **unchecked**.
3. **Nothing becomes active without confirmation:**
   - `POST /api/records/scan` and `POST /api/records` never insert into `medications` or schedule notifications. Only `POST /api/medications` and `POST /api/medications/batch` (triggered by the user's explicit save on `/medications/review` or `/medications/new`) create active medications.
4. **Remy keeps DD-54's no-medication-decisions rule:**
   - `REMY_SYSTEM` in `apps/api/src/lib/gemini.ts` and `ADVICE` in `apps/mobile/src/remy/answer.ts` explicitly refuse questions about missed doses, doubling up, stopping a course early, changing dose timing, or drug interactions (`kind: 'advice'` online, `kind: 'unsupported'` offline), while quoting the exact instructions written on the user's saved prescription record and advising them to ask their prescribing doctor or pharmacist.
5. **Persistent clinical disclaimer:**
   - Displayed on `/medications`, `/medications/review`, and `/medications/[id]`:
     *"Reminders follow the schedule you confirmed. They do not replace your doctor's or pharmacist's instructions."*

---

## 5. UX, Navigation & Warm-Folio Design

### 5.1 Where It Lives in Navigation

- **Keep the 4-tab `NativeTabs` bar (`Records`, `Share`, `Medical ID`, `Profile` from DD-56)** so the native tab bar stays clean and uncrowded.
- **Entry points across the app:**
  1. **Records Home (`apps/mobile/app/(tabs)/index.tsx`):** Directly above the `Your health summary` shortcut row, a new **Medications & reminders** row (`icon="pill"`) shows live status for the active person:
     - When active medications exist: title `"Medications & reminders"`, subtitle `"2 active · Next dose at 8:00 PM"` (or `"All doses logged for today"`).
     - When none exist: title `"Medications & reminders"`, subtitle `"Track prescribed courses and dose times"`.
  2. **Post-Scan Saved Screen (`apps/mobile/src/add/AddParts.tsx`):** Prominent card + primary CTA **Review & set reminders** whenever `record.ai?.medications?.length > 0`.
  3. **Record Detail (`apps/mobile/app/record/[id].tsx`):** Secondary button **Review medications for reminders** whenever `r.ai?.medications?.length > 0`.
  4. **Profile Tab (`apps/mobile/app/(tabs)/profile.tsx`):** Row in the main settings `Group`: `icon="pill"`, title `"Medications & reminders"`, subtitle `"Active prescriptions, dose schedule and reminder privacy"` → `/medications`.
  5. **Reading & Motion / Preferences (`apps/mobile/app/preferences.tsx`):** Toggle row `"Show medication names on lock screen"` (`icon="bell-Lock-outline"` / `"lock-outline"`, off by default, subtitle `"Off by default for privacy. When off, reminders say 'Time for your scheduled medication'."`).

### 5.2 Routes & Presentation (`apps/mobile/app/_layout.tsx`)

- `<Stack.Screen name="medications/index" options={push} />`
- `<Stack.Screen name="medications/[id]" options={push} />`
- `<Stack.Screen name="medications/review" options={sheet} />` (also added to `SHEET_ROUTES` in `apps/mobile/src/ui/layout.tsx` so `useTopInset()` handles iOS page-sheet spacing per DD-50).

### 5.3 Visual Design, States & Motion

- Uses Warm-Folio tokens (`c.bg`, `c.surface`, `c.surfaceSunken`, `c.persimmon`, `c.accent`, `c.warnSoft`, `c.dangerSoft`) and existing primitives (`Screen`, `Section`, `Group`, `Row`, `Rule`, `Empty`, `Banner`, `Chip`, `Choice`, `Field`, `Toggle`, `Sheet`, `PersonSwitcher`, `Remy`).
- **States on `/medications`:**
  - **Loading:** `<Remy pose="reading" motion="read" size={140} />` with calm copy.
  - **Empty:** `<Empty pose="curious" motion="peek" title="No active medications" message="Scan a prescription or add a medication yourself to get reminders when a dose is due." />` with **Scan a prescription** (`/add?source=camera`) and **Add a medication manually** (`/medications/new`).
  - **Permission off:** `<Banner tone="warn" ... />` with **Settings** action.
  - **Course ended:** Cards in the **Completed & stopped** section use `c.surfaceSunken` and a calm pill badge (`Course ended Nov 22` or `Stopped`), with a one-tap **View source prescription** link if linked to a record.
- **Motion (DD-50):**
  - Uses `Rise` and `Swap` from `apps/mobile/src/ui/motion.tsx` and `Enter` from `apps/mobile/src/ui/layout.tsx` (native-only layout entering; plain `View` on web per DD-44).
  - Respects `useCalmMotion()` (system Reduce Motion + in-app Gentler motion).

---

## 6. Testing Strategy

1. **Schedule Calculation & Privacy Unit Tests (`apps/mobile/tests/medicationSchedule.test.ts`):**
   - `daily_times`: 1×, 2×, 3×, 4× daily slot generation across multiple days.
   - `interval_hours`: Every 4h, 6h, 8h, 12h anchored from `times[0]` (`08:00` → `08:00, 16:00, 00:00`).
   - `as_needed` and `remindersEnabled: false`: Generates 0 notification slots while still appearing in the active list.
   - Meal timing formatting (`before_meal` → `"Before meals"`, `with_meal` → `"With food"`, `after_meal` → `"After meals"`).
   - Course `durationDays` → `endDate` calculation (`addCivilDays('2026-11-16', 6) === '2026-11-22'` for a 7-day course) and strict cutoff at `endDate` `23:59:59` local time.
   - Automatic status transition (`isCourseEnded`) when `todayIso > endDate`.
   - Rolling window cap (`MAX_SCHEDULED_NOTIFICATIONS = 48`): With 10 active medications (40 doses/day), caps output at 47 concrete dose notifications + 1 catch-up renewal notification at slot #48.
   - Already-logged doses (`taken` or `skipped` in `MedicationLog[]`) are excluded from pending notifications.
   - Snooze slot generation (`computeSnoozeTrigger(now, 15)`).
   - Lock-screen copy builder (`formatNotificationCopy`): verifies that when `showMedicationNamesOnLockScreen === false`, neither `title` nor `body` contains the medication's `name`, `strength`, `dose`, or `instructions`, and when `true`, includes them clearly (for both account holder and family member).
   - DST & timezone handling: `parseLocalSlotDate('2026-03-08', '08:00')` preserves wall-clock `08:00` local time across DST boundaries; `needsTimezoneReschedule(prevTz, currentTz)` detects timezone shifts.

2. **Prescription Extraction & Review Validation Unit Tests (`apps/mobile/tests/medicationExtract.test.ts`):**
   - Converts sample Gemini `ScanDraft` prescription outputs (antibiotic 7-day course, maintenance daily statin, PRN inhaler, blurry/low-confidence handwritten rx) into `MedicationReviewDraft[]`.
   - Flags low-confidence and missing fields (`dose: null`, `times: []`, `confidence: 'low'`, `legible: false`) in `lowConfidenceFields`.
   - Verifies that `confirmed` defaults to `false` for every extracted item and `validateMedicationDraft` rejects unconfirmed or incomplete items without inventing doses or times.

3. **API Integration Tests (`apps/api/test/medications.test.ts` & `apps/api/test/prescriptionScan.test.ts`):**
   - Runs against real local Postgres with `medrec_test` (`medrec_app` RLS enforced).
   - Batch creation from a prescription record (`POST /api/medications/batch`), linking `source_record_id`, and verifying `ON DELETE SET NULL` when the source record is deleted.
   - Caregiver profile isolation (`personId`): Mia's medications are separate from the account holder's; `includeAllPersons=1` returns both for the account holder; deleting Mia cascades her `medications` and `medication_logs`.
   - Cross-account security: Account B gets `404` on Account A's medication IDs, cannot log doses on Account A's medications, and cannot link Account A's `sourceRecordId` or `personId`.
   - Dose logging (`PUT /api/medications/:id/logs` for `taken` and `skipped`, idempotency on repeat PUT, undo via `DELETE /api/medications/:id/logs`).
   - Auto-completion of expired courses (`end_date < today`) on `GET /api/medications`.
   - Gemini scan schema & fallback test (`apps/api/test/prescriptionScan.test.ts`) verifying structured prescription extraction fields and Remy's refusal of missed-dose / dose-change questions.

---

## 7. Work Split for Parallel Builders (6 Packages, Zero Shared Files)

### Execution Waves

- **Wave 1 (Foundation — Small, Built First):** **Package 1** (Shared types, API client methods, storage keys, prefs field, and `expo-notifications` dependency in `package.json` / `app.json`).
- **Wave 2 (Parallel Builders — Run Simultaneously with ZERO Shared Files):** **Packages 2, 3, 4, 5, and 6** have 100% disjoint file sets and code against the exact contracts from Package 1 below.

| Package | Role | Wave | Files Owned (Create / Modify) |
| :--- | :--- | :--- | :--- |
| **Pkg 1** | Shared Contracts & Config | Wave 1 (First) | `apps/mobile/src/medications/types.ts` *(create)*<br>`apps/mobile/src/lib/api.ts` *(modify)*<br>`apps/mobile/src/lib/storage.ts` *(modify)*<br>`apps/mobile/src/prefs.ts` *(modify)*<br>`apps/mobile/package.json` *(modify)*<br>`apps/mobile/app.json` *(modify)* |
| **Pkg 2** | API Database, RLS & Routes | Wave 2 (Parallel) | `apps/api/migrations/006_medications.sql` *(create)*<br>`apps/api/src/lib/medications.ts` *(create)*<br>`apps/api/src/routes/medications.ts` *(create)*<br>`apps/api/src/routes/vault.ts` *(modify)*<br>`apps/api/src/app.ts` *(modify)*<br>`apps/api/test/medications.test.ts` *(create)* |
| **Pkg 3** | API Gemini Prescription Scan | Wave 2 (Parallel) | `apps/api/src/lib/gemini.ts` *(modify)*<br>`apps/api/src/routes/records.ts` *(modify)*<br>`apps/api/test/prescriptionScan.test.ts` *(create)* |
| **Pkg 4** | Mobile Schedule & Notification Engine | Wave 2 (Parallel) | `apps/mobile/src/medications/schedule.ts` *(create)*<br>`apps/mobile/src/medications/extract.ts` *(create)*<br>`apps/mobile/src/medications/notifications.ts` *(create)*<br>`apps/mobile/src/medications/store.ts` *(create)*<br>`apps/mobile/tests/medicationSchedule.test.ts` *(create)*<br>`apps/mobile/tests/medicationExtract.test.ts` *(create)* |
| **Pkg 5** | Mobile Medications Screens & Components | Wave 2 (Parallel) | `apps/mobile/app/medications/index.tsx` *(create)*<br>`apps/mobile/app/medications/[id].tsx` *(create)*<br>`apps/mobile/app/medications/review.tsx` *(create)*<br>`apps/mobile/src/medications/MedicationCard.tsx` *(create)* |
| **Pkg 6** | Mobile Navigation & Entry-Point Wiring | Wave 2 (Parallel) | `apps/mobile/app/_layout.tsx` *(modify)*<br>`apps/mobile/src/ui/layout.tsx` *(modify)*<br>`apps/mobile/app/(tabs)/index.tsx` *(modify)*<br>`apps/mobile/app/(tabs)/profile.tsx` *(modify)*<br>`apps/mobile/app/preferences.tsx` *(modify)*<br>`apps/mobile/src/add/AddParts.tsx` *(modify)*<br>`apps/mobile/app/record/[id].tsx` *(modify)*<br>`apps/mobile/src/remy/answer.ts` *(modify)* |

---

### Shared Contracts (Written Out in Full)

Every builder in Wave 2 codes against these exact TypeScript definitions.

#### A. `apps/mobile/src/medications/types.ts` (Created by Package 1)

```ts
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
```

#### B. Additions to `apps/mobile/src/lib/api.ts` (Modified by Package 1)

- Update `AiSnapshot.medications` to `ExtractedMedicationLine[]` (imported from `../medications/types`).
- Re-export `Medication`, `MedicationInput`, `MedicationPatch`, `MedicationLog`, `DoseLogInput`, `ExtractedMedicationLine` from `../medications/types`.
- Add to `api` object:
```ts
  medications: (params: { personId?: string | null; includeAllPersons?: boolean; date?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.personId) qs.set('personId', params.personId);
    if (params.includeAllPersons) qs.set('includeAllPersons', '1');
    if (params.date) qs.set('date', params.date);
    return request<{ medications: Medication[]; logs: MedicationLog[] }>(`/api/medications${qs.size ? `?${qs}` : ''}`);
  },
  medication: (id: string) => request<{ medication: Medication; logs: MedicationLog[] }>(`/api/medications/${id}`),
  createMedication: (input: MedicationInput) => request<{ medication: Medication }>('/api/medications', { method: 'POST', json: input }),
  createMedicationsBatch: (input: { personId?: string | null; sourceRecordId?: string | null; items: MedicationInput[] }) =>
    request<{ medications: Medication[] }>('/api/medications/batch', { method: 'POST', json: input }),
  updateMedication: (id: string, patch: MedicationPatch) => request<{ medication: Medication }>(`/api/medications/${id}`, { method: 'PATCH', json: patch }),
  deleteMedication: (id: string) => request<{ deleted: true }>(`/api/medications/${id}`, { method: 'DELETE' }),
  logMedicationDose: (id: string, input: DoseLogInput) => request<{ log: MedicationLog }>(`/api/medications/${id}/logs`, { method: 'PUT', json: input }),
  undoMedicationDose: (id: string, scheduledDate: string, scheduledTime: string) =>
    request<{ deleted: boolean }>(`/api/medications/${id}/logs?scheduledDate=${encodeURIComponent(scheduledDate)}&scheduledTime=${encodeURIComponent(scheduledTime)}`, { method: 'DELETE' }),
```

#### C. Additions to `apps/mobile/src/lib/storage.ts` & `apps/mobile/src/prefs.ts` (Modified by Package 1)

- In `KEYS` (`apps/mobile/src/lib/storage.ts`):
```ts
  medsCache: (userId: string) => `medrec.meds.cache.${userId}`,
  medsOutbox: (userId: string) => `medrec.meds.outbox.${userId}`,
  medsNotifMap: (userId: string) => `medrec.meds.notif.${userId}`,
  medsSnooze: (userId: string) => `medrec.meds.snooze.${userId}`,
```
- In `Prefs` (`apps/mobile/src/prefs.ts`):
```ts
  /** Off by default so lock-screen notifications never reveal medication names unless opted in. */
  showMedicationNamesOnLockScreen: boolean;
```
(Default in `DEFAULTS`: `showMedicationNamesOnLockScreen: false`).

#### D. Function Signatures Exported by Package 4 (`schedule.ts`, `extract.ts`, `notifications.ts`, `store.ts`) for Packages 5 & 6

- `apps/mobile/src/medications/schedule.ts` (pure TS, no React Native imports):
  - `export const MAX_SCHEDULED_NOTIFICATIONS = 48;`
  - `export function isValidTime24(value: string): boolean;`
  - `export function formatTime12(hhmm: string): string;`
  - `export function addCivilDays(isoDate: string, days: number): string;`
  - `export function computeEndDate(startDate: string, durationDays: number | null): string | null;`
  - `export function isCourseEnded(med: Pick<Medication, 'status' | 'endDate'>, today: string): boolean;`
  - `export function expandDailyTimes(med: Pick<Medication, 'scheduleKind' | 'times' | 'intervalHours'>): string[];`
  - `export function formatScheduleSummary(med: Pick<Medication, 'scheduleKind' | 'times' | 'intervalHours' | 'mealTiming'>): string;`
  - `export function buildDaySchedule(medications: Medication[], logs: MedicationLog[], snoozes: Record<string, string>, dateIso: string): ScheduledSlot[];`
  - `export function buildRollingNotificationPlan(medications: Medication[], logs: MedicationLog[], now?: Date, horizonDays?: number): { slots: ScheduledSlot[]; truncated: boolean; renewalTriggerAt: Date | null };`
  - `export function formatNotificationCopy(slot: Pick<ScheduledSlot, 'medicationName' | 'strength' | 'dose' | 'mealTiming' | 'scheduledTime'>, opts: { showNames: boolean; personName?: string | null }): { title: string; body: string };`
  - `export function computeSnoozeTrigger(now?: Date, minutes?: number): Date;`
  - `export function needsTimezoneReschedule(previousTimeZone: string | null | undefined, currentTimeZone: string): boolean;`

- `apps/mobile/src/medications/extract.ts` (pure TS, no React Native imports):
  - `export function prepareReviewDrafts(medications: ExtractedMedicationLine[], opts: { provider?: string | null; eventDate?: string | null; legible?: boolean; today?: string }): MedicationReviewDraft[];`
  - `export function validateReviewDraft(draft: MedicationReviewDraft): Partial<Record<'name' | 'times' | 'startDate' | 'endDate' | 'durationDays', string>>;`
  - `export function draftToMedicationInput(draft: MedicationReviewDraft, opts: { personId?: string | null; sourceRecordId?: string | null }): MedicationInput;`

- `apps/mobile/src/medications/notifications.ts`:
  - `export function getNotificationPermission(): Promise<NotificationPermissionState>;`
  - `export function requestNotificationPermission(): Promise<NotificationPermissionState>;`
  - `export function syncMedicationNotifications(userId: string, medications: Medication[], logs: MedicationLog[], people: { id: string; name: string }[], showNames: boolean): Promise<void>;`
  - `export function scheduleSnoozeNotification(userId: string, slot: ScheduledSlot, opts: { showNames: boolean; personName?: string | null; minutes?: number }): Promise<string | null>;`
  - `export function cancelAllMedicationNotifications(userId?: string | null): Promise<void>;`

- `apps/mobile/src/medications/store.ts`:
  - `export function useMedications(personId?: string | null): { medications: Medication[]; active: Medication[]; past: Medication[]; todaySlots: ScheduledSlot[]; loading: boolean; refreshing: boolean; error: string | null; permission: NotificationPermissionState; reload: () => Promise<void>; refresh: () => Promise<void> };`
  - `export function loadAccountMedications(userId: string): Promise<void>;`
  - `export function resetMedications(): void;`
  - `export function recordDoseOutcome(medicationId: string, scheduledDate: string, scheduledTime: string, outcome: DoseOutcome): Promise<void>;`
  - `export function undoDoseOutcome(medicationId: string, scheduledDate: string, scheduledTime: string): Promise<void>;`
  - `export function snoozeDoseSlot(slot: ScheduledSlot, minutes?: number): Promise<void>;`
  - `export function saveConfirmedMedications(input: { personId?: string | null; sourceRecordId?: string | null; items: MedicationInput[] }): Promise<Medication[]>;`
  - `export function upsertMedicationInStore(med: Medication): void;`
  - `export function removeMedicationFromStore(id: string): void;`

---

### Detailed Package Specifications & Acceptance Checks

#### Package 1: Foundation — Shared Contracts, API Client, Prefs & `expo-notifications` Config (Wave 1 — Built First)
- **Goal:** Establish the shared TypeScript contracts, API client methods, storage keys, lock-screen privacy preference, and `expo-notifications` dependency so all Wave 2 builders can work in parallel without touching shared files.
- **Exact files owned:**
  - `apps/mobile/src/medications/types.ts` *(create)*
  - `apps/mobile/src/lib/api.ts` *(modify)*
  - `apps/mobile/src/lib/storage.ts` *(modify)*
  - `apps/mobile/src/prefs.ts` *(modify)*
  - `apps/mobile/package.json` *(modify — add `"expo-notifications": "~58.1.9"`)*
  - `apps/mobile/app.json` *(modify — add `"expo-notifications"` to `plugins`)*
- **Dependencies:** None (runs first).
- **Acceptance checks:**
  - `npm run typecheck --prefix apps/mobile`
  - `npm test --prefix apps/mobile`

#### Package 2: Backend — DB Migration `006_medications.sql`, RLS, CRUD/Logs Routes & Vault Integration (Wave 2 — Parallel)
- **Goal:** Create the `medications` and `medication_logs` tables with forced RLS for `medrec_app`, implement `/api/medications` endpoints (list, batch create, single create, get, patch, delete, log dose, undo dose), and include active medications in `routes/vault.ts` (`ask`, `summary`, `export`).
- **Exact files owned:**
  - `apps/api/migrations/006_medications.sql` *(create)*
  - `apps/api/src/lib/medications.ts` *(create — row mappers, Zod validators, auto-complete expired courses helper)*
  - `apps/api/src/routes/medications.ts` *(create)*
  - `apps/api/src/routes/vault.ts` *(modify — include active medications in Remy context, health summary context, and JSON export)*
  - `apps/api/src/app.ts` *(modify — mount `app.route('/api/medications', medications)` and auto-complete expired courses in `cleanup()`)*
  - `apps/api/test/medications.test.ts` *(create — integration tests for CRUD, batch confirm, caregiver `personId` isolation, cross-account 404/RLS, `source_record_id` `ON DELETE SET NULL`, dose logs upsert/undo, auto-completion at `end_date`)*
- **Depends on:** API payload shapes matching `Medication`, `MedicationInput`, `MedicationPatch`, `MedicationLog`, `DoseLogInput` from Package 1.
- **Acceptance checks:**
  - `npm run typecheck --prefix apps/api`
  - `npm test --prefix apps/api`

#### Package 3: Backend AI — Enriched Prescription Extraction & Remy Medication Guardrails (Wave 2 — Parallel)
- **Goal:** Enrich `SCAN_SCHEMA` and `ScanResult` in `apps/api/src/lib/gemini.ts` and `AiSnapshot` in `apps/api/src/routes/records.ts` so prescription scans return structured medication fields (`strength`, `dose`, `frequency`, `scheduleKind`, `times`, `intervalHours`, `mealTiming`, `durationDays`, `endDate`, `instructions`, `confidence`) without ever inventing missing values, and reinforce `REMY_SYSTEM` against missed-dose / medication-change decisions.
- **Exact files owned:**
  - `apps/api/src/lib/gemini.ts` *(modify)*
  - `apps/api/src/routes/records.ts` *(modify)*
  - `apps/api/test/prescriptionScan.test.ts` *(create — tests structured prescription extraction, sanitization of invalid times/dates, low-confidence handling, backwards compatibility with legacy `AiSnapshot`, and Remy refusal of missed-dose advice)*
- **Depends on:** `ExtractedMedicationLine` contract from Package 1.
- **Acceptance checks:**
  - `npm run typecheck --prefix apps/api`
  - `npm test --prefix apps/api`

#### Package 4: Mobile Core — Schedule Calculator, Extraction Normalizer, Notification Engine & Store (Wave 2 — Parallel)
- **Goal:** Build the pure schedule & rolling-window engine (`schedule.ts`), the prescription extraction normalizer & low-confidence validator (`extract.ts`), the `expo-notifications` wrapper with lock-screen privacy & timezone rescheduling (`notifications.ts`), the reactive store with offline cache & dose-log outbox (`store.ts`), and comprehensive Node unit tests.
- **Exact files owned:**
  - `apps/mobile/src/medications/schedule.ts` *(create)*
  - `apps/mobile/src/medications/extract.ts` *(create)*
  - `apps/mobile/src/medications/notifications.ts` *(create)*
  - `apps/mobile/src/medications/store.ts` *(create)*
  - `apps/mobile/tests/medicationSchedule.test.ts` *(create)*
  - `apps/mobile/tests/medicationExtract.test.ts` *(create)*
- **Depends on:** Package 1 (`src/medications/types.ts`, `src/lib/api.ts`, `src/lib/storage.ts`, `src/prefs.ts`). Note: `schedule.ts` and `extract.ts` must have zero React Native imports so `node --test --experimental-strip-types` runs them directly.
- **Acceptance checks:**
  - `npm run typecheck --prefix apps/mobile`
  - `npm test --prefix apps/mobile`

#### Package 5: Mobile UI — Medications List, Manual Add/Edit & Prescription Review Screens (Wave 2 — Parallel)
- **Goal:** Implement the warm-folio Medications screens: `/medications` (today's doses with Taken/Skipped/Snooze/Undo, active courses, completed/stopped courses, permission off banner, `PersonSwitcher`, empty/loading states), `/medications/review` (post-scan review & confirm flow with per-card confirmation checkbox, low-confidence highlights, safety disclaimers), `/medications/[id]` (manual add `id="new"` and edit/stop/delete screen), and shared medication UI cards.
- **Exact files owned:**
  - `apps/mobile/app/medications/index.tsx` *(create)*
  - `apps/mobile/app/medications/[id].tsx` *(create)*
  - `apps/mobile/app/medications/review.tsx` *(create)*
  - `apps/mobile/src/medications/MedicationCard.tsx` *(create)*
- **Depends on:** Package 1 (`types.ts`, `api.ts`, `prefs.ts`) and Package 4's exported function signatures (`schedule.ts`, `extract.ts`, `notifications.ts`, `store.ts`).
- **Acceptance checks:**
  - `npm run typecheck --prefix apps/mobile`
  - `npm test --prefix apps/mobile`

#### Package 6: Mobile App Wiring — Navigation, Intake/Record Entry Points, Preferences & Offline Remy Help (Wave 2 — Parallel)
- **Goal:** Wire the new routes and foreground notification sync into `app/_layout.tsx`, add `'medications/review'` to `SHEET_ROUTES` in `src/ui/layout.tsx`, add the Medications & reminders card/row to Records home (`app/(tabs)/index.tsx`) and Profile (`app/(tabs)/profile.tsx`), add the lock-screen privacy toggle to `app/preferences.tsx`, add the **Review & set reminders** CTAs to `src/add/AddParts.tsx` (`Saved`) and `app/record/[id].tsx`, and add medication reminders help + missed-dose refusal patterns to `src/remy/answer.ts`.
- **Exact files owned:**
  - `apps/mobile/app/_layout.tsx` *(modify)*
  - `apps/mobile/src/ui/layout.tsx` *(modify)*
  - `apps/mobile/app/(tabs)/index.tsx` *(modify)*
  - `apps/mobile/app/(tabs)/profile.tsx` *(modify)*
  - `apps/mobile/app/preferences.tsx` *(modify)*
  - `apps/mobile/src/add/AddParts.tsx` *(modify)*
  - `apps/mobile/app/record/[id].tsx` *(modify)*
  - `apps/mobile/src/remy/answer.ts` *(modify)*
- **Depends on:** Package 1 (`types.ts`, `prefs.ts`) and Package 4 (`store.ts`, `notifications.ts`).
- **Acceptance checks:**
  - `npm run typecheck --prefix apps/mobile`
  - `npm test --prefix apps/mobile`

---

## 8. Open Questions (Decided in Section 9 / DD-59) & What Not to Build in v1

### Open Questions (Decided 2026-11-16)

1. **Medical ID & Doctor Share Sync — Decided:** v1 does **not** sync confirmed medications to Medical ID or doctor shares; the Medical ID medication list stays manually curated in Profile.
2. **Navigation Placement — Decided:** keep the existing 4-tab native bar (`Records`, `Share`, `Medical ID`, `Profile`) and place **Medications & reminders** on Records home, Profile, post-scan `Saved`, and `RecordDetail`.
3. **Default Meal Anchor Times — Decided:** **no suggested times.** When a prescription gives no explicit clock times, time chips stay empty and the schedule field is flagged until the user fills them in.

### What We Will NOT Build in v1 (Intentional Scope Guardrails)

- **No drug-interaction checker or clinical dosing calculator:** MedRec is a personal organizer, not a clinical decision support system; it never checks interactions, contraindications, or weight/renal dosing.
- **No pill-inventory / refill-countdown or pharmacy ordering:** No pill counting, refill alerts, or pharmacy integrations in v1.
- **No server-sent push notifications (APNs / FCM):** All reminders are scheduled on-device via `expo-notifications` so they work offline without needing a paid Apple Developer push certificate or FCM credentials.
- **No Apple Watch / WearOS companion or Live Activities:** Standard local notifications with interactive actions (`Mark taken`, `Snooze 15 min`, `Skip`) cover lock-screen interaction in v1.
- **No complex tapering or alternating-day calendars:** v1 supports `daily_times` (1–6 times/day), `interval_hours` (every N hours), and `as_needed` (PRN, no notifications), with optional `startDate` and `endDate` / `durationDays`. Complex tapers (e.g. Prednisone step-down) can be entered as separate sequential stages or tracked via the prescription instructions text.

---

## 9. Orchestrator review (2026-11-16) — binding for every builder

Plan approved with these decisions and corrections. Where they differ from sections 1–8, this section wins.

1. **Q1 Medical ID / Doctor Share:** v1 does **not** sync confirmed medications to Medical ID or shares. The Medical ID medication list stays manually curated in Profile. (Reversible later; avoids silently publishing clinical data on a public page.)
2. **Q2 Navigation:** keep the 4-tab `NativeTabs` bar (DD-56). Entry points as in 5.1.
3. **Q3 Meal anchor times:** **no suggested times.** When the prescription gives no clock time, time chips stay empty and the field is flagged; the user enters times themselves (safety rule 4.1: never invent).
4. **Course auto-completion on the server:** the server must not complete a course by the UTC date (a user west of UTC would lose the last evening dose). Server-side auto-complete (`GET /api/medications` and `cleanup()`) only when `end_date < current_date - 1` (one-day grace). The client is the authority for "today": `isCourseEnded(med, localTodayIso)` drives display and scheduling.
5. **Notification action buttons:** not in v1. Tapping a reminder opens `/medications` (scrolled to that slot if simple). Remove "interactive actions" from the not-built list's wording; no categories are registered in v1.
6. **Waves:** Package 1 is built first by one agent. Packages 2, 3, 4, 5, 6 then run in parallel. Packages 5 and 6 code against the Package 4 signatures in section 7.D; their final `typecheck` must be re-run after Package 4 is finished (the orchestrator tells them).
7. **Docs:** the DD-59 entry in `.brain/DECISIONS.md`, CHANGELOG and TODO updates are written once at the end by the Package 1 agent, from what was actually built. Builders do not edit `.brain/` files except ticking nothing; they report in their final message.
8. **Out of bounds for all packages:** no deploy, no `migrate:prod`, no package installs beyond Package 1's `expo-notifications`, no git writes.

## 10. Builder rules (every Wave 2 agent)

- Read this whole plan first: your package in section 7, the shared contracts in 7.A–7.D, and section 9, which is binding. Package 1 is already built and committed (`ee34158`): import from it, never edit it.
- Read `.brain/PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `NOTES.md` and the code next to your files; match the existing style (warm-folio tokens and UI primitives on mobile; Hono + `asUser` + forced RLS in the API).
- Edit ONLY the files your package owns (section 7 table). The other packages are being built in this repo at the same time; if you need a change in a file you do not own, describe it in your final message instead.
- Section 4 safety rules are non-negotiable. No git writes, no deploy, no `migrate:prod`, no package installs.
- Run your package's acceptance checks and report exact pass/fail counts (API tests need the local Postgres from NOTES.md / apps/README.md; if unavailable, say so and still typecheck).
- Finish with a message starting `PACKAGE <n> DONE`: files changed, checks with results, anything you could not do.
