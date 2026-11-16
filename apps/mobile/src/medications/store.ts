import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { todayIso } from '../format';
import { api } from '../lib/api';
import { messageFor } from '../lib/errors';
import { ApiError } from '../lib/http';
import { KEYS, secure } from '../lib/storage';
import { usePeople } from '../people';
import { usePrefs } from '../prefs';
import {
  cancelAllMedicationNotifications,
  getNotificationPermission,
  scheduleSnoozeNotification,
  syncMedicationNotifications,
} from './notifications';
import { buildDaySchedule, computeSnoozeTrigger, isCourseEnded } from './schedule';
import type {
  DoseOutcome,
  Medication,
  MedicationInput,
  MedicationLog,
  NotificationPermissionState,
  ScheduledSlot,
} from './types';

interface MedsState {
  userId: string | null;
  medications: Medication[];
  logs: MedicationLog[];
  snoozes: Record<string, string>;
  loaded: boolean;
  loadedDate: string | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  permission: NotificationPermissionState;
}

interface MedsCachePayload {
  medications: Medication[];
  logs: MedicationLog[];
  cachedDate: string;
  savedAt: string;
}

interface OutboxItem {
  slotKey: string;
  op: 'log' | 'undo';
  medicationId: string;
  scheduledDate: string;
  scheduledTime: string;
  outcome?: DoseOutcome;
  actedAt: string;
}

const INITIAL_STATE: MedsState = {
  userId: null,
  medications: [],
  logs: [],
  snoozes: {},
  loaded: false,
  loadedDate: null,
  loading: false,
  refreshing: false,
  error: null,
  permission: 'undetermined',
};

let state: MedsState = INITIAL_STATE;
const listeners = new Set<() => void>();

function setState(patch: Partial<MedsState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

let loadSeq = 0;
let inFlightLoad: Promise<void> | null = null;
let flushChain: Promise<void> = Promise.resolve();
let outboxLock: Promise<void> = Promise.resolve();
let latestPeople: { id: string; name: string }[] = [];

function withOutboxLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = outboxLock.then(fn, fn);
  outboxLock = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function slotKeyFor(medicationId: string, scheduledDate: string, scheduledTime: string): string {
  return `${medicationId}:${scheduledDate}:${scheduledTime}`;
}

async function readShowNamesPref(): Promise<boolean> {
  try {
    const raw = await secure.get(KEYS.prefs);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { showMedicationNamesOnLockScreen?: unknown };
    return parsed.showMedicationNamesOnLockScreen === true;
  } catch {
    return false;
  }
}

async function readCache(userId: string): Promise<MedsCachePayload | null> {
  try {
    const raw = await secure.get(KEYS.medsCache(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MedsCachePayload>;
    if (!Array.isArray(parsed.medications) || !Array.isArray(parsed.logs)) return null;
    return {
      medications: parsed.medications,
      logs: parsed.logs,
      cachedDate: typeof parsed.cachedDate === 'string' ? parsed.cachedDate : '',
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
    };
  } catch {
    return null;
  }
}

async function writeCache(userId: string, medications: Medication[], logs: MedicationLog[]): Promise<void> {
  const payload: MedsCachePayload = {
    medications,
    logs,
    cachedDate: todayIso(),
    savedAt: new Date().toISOString(),
  };
  await secure.set(KEYS.medsCache(userId), JSON.stringify(payload)).catch(() => undefined);
}

async function readOutbox(userId: string): Promise<OutboxItem[]> {
  try {
    const raw = await secure.get(KEYS.medsOutbox(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OutboxItem[]) : [];
  } catch {
    return [];
  }
}

async function writeOutbox(userId: string, items: OutboxItem[]): Promise<void> {
  if (items.length === 0) {
    await secure.remove(KEYS.medsOutbox(userId)).catch(() => undefined);
  } else {
    await secure.set(KEYS.medsOutbox(userId), JSON.stringify(items)).catch(() => undefined);
  }
}

async function readActiveSnoozes(userId: string): Promise<Record<string, string>> {
  try {
    const raw = await secure.get(KEYS.medsSnooze(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, { snoozedUntil?: string; notificationId?: string | null }>;
    if (!parsed || typeof parsed !== 'object') return {};
    const nowMs = Date.now();
    const out: Record<string, string> = {};
    for (const [key, entry] of Object.entries(parsed)) {
      if (entry && typeof entry.snoozedUntil === 'string' && Date.parse(entry.snoozedUntil) > nowMs) {
        out[key] = entry.snoozedUntil;
      }
    }
    return out;
  } catch {
    return {};
  }
}

async function persistSnoozes(userId: string, snoozes: Record<string, string>): Promise<void> {
  try {
    const raw = await secure.get(KEYS.medsSnooze(userId));
    const existing = raw ? (JSON.parse(raw) as Record<string, { snoozedUntil?: string; notificationId?: string | null }>) : {};
    const next: Record<string, { snoozedUntil: string; notificationId: string | null }> = {};
    for (const [key, until] of Object.entries(snoozes)) {
      next[key] = {
        snoozedUntil: until,
        notificationId: existing?.[key]?.notificationId ?? null,
      };
    }
    if (Object.keys(next).length === 0) {
      await secure.remove(KEYS.medsSnooze(userId)).catch(() => undefined);
    } else {
      await secure.set(KEYS.medsSnooze(userId), JSON.stringify(next)).catch(() => undefined);
    }
  } catch {
    // ignore storage errors
  }
}

function applyOutboxToLogs(logs: MedicationLog[], outbox: OutboxItem[]): MedicationLog[] {
  if (outbox.length === 0) return logs;
  const byKey = new Map<string, MedicationLog>();
  for (const log of logs) {
    byKey.set(slotKeyFor(log.medicationId, log.scheduledDate, log.scheduledTime), log);
  }
  for (const item of outbox) {
    if (item.op === 'undo') {
      byKey.delete(item.slotKey);
    } else if (item.op === 'log' && item.outcome) {
      const existing = byKey.get(item.slotKey);
      byKey.set(item.slotKey, {
        id: existing?.id ?? `local-${item.slotKey}`,
        medicationId: item.medicationId,
        scheduledDate: item.scheduledDate,
        scheduledTime: item.scheduledTime,
        outcome: item.outcome,
        actedAt: item.actedAt,
        notes: existing?.notes ?? null,
      });
    }
  }
  return Array.from(byKey.values());
}

async function resolvePeopleForNotifications(medications: Medication[]): Promise<{ id: string; name: string }[]> {
  const needsPersonName = medications.some(
    (m) =>
      m.personId !== null &&
      m.status === 'active' &&
      m.remindersEnabled &&
      !latestPeople.some((p) => p.id === m.personId),
  );
  if (needsPersonName) {
    try {
      const { people } = await api.people();
      latestPeople = people.map((p) => ({ id: p.id, name: p.name }));
    } catch {
      // Keep whatever names are already known if offline.
    }
  }
  return latestPeople;
}

async function syncNotificationsFromState(userId: string): Promise<void> {
  if (state.userId !== userId) return;
  const snapshotMeds = state.medications;
  const snapshotLogs = state.logs;
  const [showNames, people, permission] = await Promise.all([
    readShowNamesPref(),
    resolvePeopleForNotifications(snapshotMeds),
    getNotificationPermission(),
  ]);
  if (state.userId !== userId) return;
  if (state.permission !== permission) {
    setState({ permission });
  }
  await syncMedicationNotifications(userId, snapshotMeds, snapshotLogs, people, showNames);
}

function isRetryableNetworkFailure(err: unknown): boolean {
  if (err instanceof ApiError) {
    return err.status === 0 || err.status >= 500;
  }
  return true;
}

async function enqueueOutboxAndFlush(userId: string, item: OutboxItem): Promise<void> {
  await withOutboxLock(async () => {
    const current = await readOutbox(userId);
    const filtered = current.filter((x) => x.slotKey !== item.slotKey);
    filtered.push(item);
    await writeOutbox(userId, filtered);
  });
  await flushOutbox(userId);
}

async function flushOutbox(userId: string): Promise<void> {
  flushChain = flushChain.then(
    async () => {
      if (state.userId !== userId) return;
      const queue = await withOutboxLock(() => readOutbox(userId));
      if (queue.length === 0) return;

      const remaining: OutboxItem[] = [];
      let logsChanged = false;
      let nextLogs = [...state.logs];

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i]!;
        if (state.userId !== userId) return;

        try {
          if (item.op === 'log' && item.outcome) {
            const { log } = await api.logMedicationDose(item.medicationId, {
              scheduledDate: item.scheduledDate,
              scheduledTime: item.scheduledTime,
              outcome: item.outcome,
              actedAt: item.actedAt,
            });
            nextLogs = nextLogs.filter(
              (l) => slotKeyFor(l.medicationId, l.scheduledDate, l.scheduledTime) !== item.slotKey,
            );
            nextLogs.push(log);
            logsChanged = true;
          } else if (item.op === 'undo') {
            await api.undoMedicationDose(item.medicationId, item.scheduledDate, item.scheduledTime);
            nextLogs = nextLogs.filter(
              (l) => slotKeyFor(l.medicationId, l.scheduledDate, l.scheduledTime) !== item.slotKey,
            );
            logsChanged = true;
          }
        } catch (err) {
          if (isRetryableNetworkFailure(err)) {
            remaining.push(...queue.slice(i));
            break;
          }
          // Non-retryable 4xx (e.g., medication deleted remotely): drop item from outbox.
        }
      }

      const mergedQueue = await withOutboxLock(async () => {
        const latestQueue = await readOutbox(userId);
        const processedByKey = new Map(queue.map((q) => [q.slotKey, q.actedAt]));
        const newlyQueued = latestQueue.filter((q) => {
          const prevActedAt = processedByKey.get(q.slotKey);
          return !prevActedAt || q.actedAt !== prevActedAt;
        });
        const deduped = new Map<string, OutboxItem>();
        for (const item of remaining) deduped.set(item.slotKey, item);
        for (const item of newlyQueued) deduped.set(item.slotKey, item);
        const merged = Array.from(deduped.values());
        await writeOutbox(userId, merged);
        return merged;
      });

      if (state.userId === userId && logsChanged) {
        const syncedLogs = applyOutboxToLogs(nextLogs, mergedQueue);
        setState({ logs: syncedLogs });
        await writeCache(userId, state.medications, syncedLogs);
      }
    },
    () => undefined,
  );
  await flushChain;
}

async function runLoadAccountMedications(userId: string, mode: 'load' | 'refresh'): Promise<void> {
  const seq = ++loadSeq;
  const switchingUser = state.userId !== userId;

  if (switchingUser) {
    setState({
      ...INITIAL_STATE,
      userId,
      loading: true,
    });

    const [cached, outbox, snoozes, permission] = await Promise.all([
      readCache(userId),
      readOutbox(userId),
      readActiveSnoozes(userId),
      getNotificationPermission(),
    ]);

    if (state.userId !== userId || seq !== loadSeq) return;

    if (cached) {
      setState({
        medications: cached.medications,
        logs: applyOutboxToLogs(cached.logs, outbox),
        snoozes,
        permission,
        loaded: true,
        loadedDate: cached.cachedDate || null,
        loading: false,
      });
    } else {
      setState({ snoozes, permission });
    }
  } else {
    setState(mode === 'refresh' ? { refreshing: true } : { loading: !state.loaded });
  }

  const work = (async () => {
    try {
      await flushOutbox(userId);
      if (state.userId !== userId || seq !== loadSeq) return;

      const today = todayIso();
      const [res, outbox, snoozes, permission] = await Promise.all([
        api.medications({ includeAllPersons: true, date: today }),
        readOutbox(userId),
        readActiveSnoozes(userId),
        getNotificationPermission(),
      ]);

      if (state.userId !== userId || seq !== loadSeq) return;

      const mergedLogs = applyOutboxToLogs(res.logs, outbox);
      setState({
        medications: res.medications,
        logs: mergedLogs,
        snoozes,
        permission,
        loaded: true,
        loadedDate: today,
        loading: false,
        refreshing: false,
        error: null,
      });

      await writeCache(userId, res.medications, mergedLogs);
      await syncNotificationsFromState(userId);
    } catch (err) {
      if (state.userId !== userId || seq !== loadSeq) return;
      const permission = await getNotificationPermission();
      if (state.userId !== userId || seq !== loadSeq) return;
      setState({
        permission,
        loaded: true,
        loading: false,
        refreshing: false,
        error: messageFor(err),
      });
      await syncNotificationsFromState(userId);
    }
  })();

  inFlightLoad = work;
  try {
    await work;
  } finally {
    if (inFlightLoad === work) inFlightLoad = null;
  }
}

export function loadAccountMedications(userId: string): Promise<void> {
  return runLoadAccountMedications(userId, 'load');
}

export function resetMedications(): void {
  const prevUserId = state.userId;
  loadSeq++;
  inFlightLoad = null;
  latestPeople = [];
  setState(INITIAL_STATE);

  if (prevUserId) {
    void cancelAllMedicationNotifications(prevUserId);
    void secure.remove(KEYS.medsCache(prevUserId)).catch(() => undefined);
    void secure.remove(KEYS.medsOutbox(prevUserId)).catch(() => undefined);
  }
}

export async function recordDoseOutcome(
  medicationId: string,
  scheduledDate: string,
  scheduledTime: string,
  outcome: DoseOutcome,
): Promise<void> {
  const userId = state.userId;
  const key = slotKeyFor(medicationId, scheduledDate, scheduledTime);
  const actedAt = new Date().toISOString();

  const existing = state.logs.find(
    (l) => slotKeyFor(l.medicationId, l.scheduledDate, l.scheduledTime) === key,
  );
  const nextLog: MedicationLog = {
    id: existing?.id ?? `local-${key}`,
    medicationId,
    scheduledDate,
    scheduledTime,
    outcome,
    actedAt,
    notes: existing?.notes ?? null,
  };

  const nextLogs = [
    ...state.logs.filter((l) => slotKeyFor(l.medicationId, l.scheduledDate, l.scheduledTime) !== key),
    nextLog,
  ];
  const nextSnoozes = { ...state.snoozes };
  delete nextSnoozes[key];

  setState({ logs: nextLogs, snoozes: nextSnoozes });

  if (userId) {
    await Promise.all([
      writeCache(userId, state.medications, nextLogs),
      persistSnoozes(userId, nextSnoozes),
    ]);
    await syncNotificationsFromState(userId);
    await enqueueOutboxAndFlush(userId, {
      slotKey: key,
      op: 'log',
      medicationId,
      scheduledDate,
      scheduledTime,
      outcome,
      actedAt,
    });
  } else {
    await api.logMedicationDose(medicationId, {
      scheduledDate,
      scheduledTime,
      outcome,
      actedAt,
    });
  }
}

export async function undoDoseOutcome(
  medicationId: string,
  scheduledDate: string,
  scheduledTime: string,
): Promise<void> {
  const userId = state.userId;
  const key = slotKeyFor(medicationId, scheduledDate, scheduledTime);
  const actedAt = new Date().toISOString();

  const nextLogs = state.logs.filter(
    (l) => slotKeyFor(l.medicationId, l.scheduledDate, l.scheduledTime) !== key,
  );
  setState({ logs: nextLogs });

  if (userId) {
    await writeCache(userId, state.medications, nextLogs);
    await syncNotificationsFromState(userId);
    await enqueueOutboxAndFlush(userId, {
      slotKey: key,
      op: 'undo',
      medicationId,
      scheduledDate,
      scheduledTime,
      actedAt,
    });
  } else {
    await api.undoMedicationDose(medicationId, scheduledDate, scheduledTime);
  }
}

export async function snoozeDoseSlot(slot: ScheduledSlot, minutes = 15): Promise<void> {
  const userId = state.userId;
  const fallbackUntil = computeSnoozeTrigger(new Date(), minutes).toISOString();
  let snoozedUntil = fallbackUntil;

  if (userId) {
    const [showNames, people] = await Promise.all([
      readShowNamesPref(),
      resolvePeopleForNotifications(state.medications),
    ]);
    const person = slot.personId ? people.find((p) => p.id === slot.personId) : null;
    const personName = person?.name.trim().split(/\s+/)[0] ?? null;

    const notifId = await scheduleSnoozeNotification(userId, slot, {
      showNames,
      personName,
      minutes,
    });

    if (notifId) {
      const saved = await readActiveSnoozes(userId);
      snoozedUntil = saved[slot.slotKey] ?? fallbackUntil;
    } else {
      await persistSnoozes(userId, { ...state.snoozes, [slot.slotKey]: fallbackUntil });
    }
  }

  setState({ snoozes: { ...state.snoozes, [slot.slotKey]: snoozedUntil } });
}

export async function saveConfirmedMedications(input: {
  personId?: string | null;
  sourceRecordId?: string | null;
  items: MedicationInput[];
}): Promise<Medication[]> {
  const { medications: created } = await api.createMedicationsBatch(input);
  const userId = state.userId;

  const createdIds = new Set(created.map((m) => m.id));
  const nextMedications = [...created, ...state.medications.filter((m) => !createdIds.has(m.id))];
  const permission = await getNotificationPermission();
  setState({ medications: nextMedications, loaded: true, permission, error: null });

  if (userId) {
    await writeCache(userId, nextMedications, state.logs);
    await syncNotificationsFromState(userId);
  }

  return created;
}

export function upsertMedicationInStore(med: Medication): void {
  const exists = state.medications.some((m) => m.id === med.id);
  const nextMedications = exists
    ? state.medications.map((m) => (m.id === med.id ? med : m))
    : [med, ...state.medications];

  let nextSnoozes = state.snoozes;
  if (med.status !== 'active' || !med.remindersEnabled || med.scheduleKind === 'as_needed') {
    const prefix = `${med.id}:`;
    const filtered: Record<string, string> = {};
    for (const [k, v] of Object.entries(state.snoozes)) {
      if (!k.startsWith(prefix)) filtered[k] = v;
    }
    nextSnoozes = filtered;
  }

  setState({ medications: nextMedications, snoozes: nextSnoozes, loaded: true });

  const userId = state.userId;
  if (userId) {
    void Promise.all([
      writeCache(userId, nextMedications, state.logs),
      persistSnoozes(userId, nextSnoozes),
    ]).then(() => syncNotificationsFromState(userId));
  }
}

export function removeMedicationFromStore(id: string): void {
  const prefix = `${id}:`;
  const nextMedications = state.medications.filter((m) => m.id !== id);
  const nextLogs = state.logs.filter((l) => l.medicationId !== id);
  const nextSnoozes: Record<string, string> = {};
  for (const [k, v] of Object.entries(state.snoozes)) {
    if (!k.startsWith(prefix)) nextSnoozes[k] = v;
  }

  setState({ medications: nextMedications, logs: nextLogs, snoozes: nextSnoozes });

  const userId = state.userId;
  if (userId) {
    void Promise.all([
      writeCache(userId, nextMedications, nextLogs),
      persistSnoozes(userId, nextSnoozes),
    ]).then(() => syncNotificationsFromState(userId));
  }
}

export function useMedications(personId?: string | null) {
  const snap = useSyncExternalStore(subscribe, getSnapshot);
  const { people } = usePeople();
  const { showMedicationNamesOnLockScreen } = usePrefs();
  const targetPersonId = personId ?? null;
  const today = todayIso();

  const peopleSig = useMemo(() => people.map((p) => `${p.id}:${p.name}`).join('|'), [people]);
  const lastSyncRef = useRef<{ userId: string; showNames: boolean; peopleSig: string } | null>(null);

  useEffect(() => {
    latestPeople = people.map((p) => ({ id: p.id, name: p.name }));
  }, [people]);

  useEffect(() => {
    if (!snap.userId || !snap.loaded) {
      lastSyncRef.current = null;
      return;
    }
    const prev = lastSyncRef.current;
    if (!prev) {
      lastSyncRef.current = {
        userId: snap.userId,
        showNames: showMedicationNamesOnLockScreen,
        peopleSig,
      };
      return;
    }
    if (
      prev.userId !== snap.userId ||
      prev.showNames !== showMedicationNamesOnLockScreen ||
      prev.peopleSig !== peopleSig
    ) {
      lastSyncRef.current = {
        userId: snap.userId,
        showNames: showMedicationNamesOnLockScreen,
        peopleSig,
      };
      void syncNotificationsFromState(snap.userId);
    }
  }, [snap.userId, snap.loaded, showMedicationNamesOnLockScreen, peopleSig]);

  useEffect(() => {
    if (snap.userId && snap.loaded && snap.loadedDate && snap.loadedDate !== today && !inFlightLoad) {
      void loadAccountMedications(snap.userId);
    }
  }, [snap.userId, snap.loaded, snap.loadedDate, today]);

  const medications = useMemo(
    () => snap.medications.filter((m) => (m.personId ?? null) === targetPersonId),
    [snap.medications, targetPersonId],
  );

  const active = useMemo(
    () => medications.filter((m) => m.status === 'active' && !isCourseEnded(m, today)),
    [medications, today],
  );

  const past = useMemo(
    () => medications.filter((m) => m.status !== 'active' || isCourseEnded(m, today)),
    [medications, today],
  );

  const todaySlots = useMemo(
    () => buildDaySchedule(medications, snap.logs, snap.snoozes, today),
    [medications, snap.logs, snap.snoozes, today],
  );

  const reload = useMemo(
    () => () => (state.userId ? runLoadAccountMedications(state.userId, 'load') : Promise.resolve()),
    [],
  );

  const refresh = useMemo(
    () => () => (state.userId ? runLoadAccountMedications(state.userId, 'refresh') : Promise.resolve()),
    [],
  );

  return {
    medications,
    active,
    past,
    todaySlots,
    loading: snap.loading,
    refreshing: snap.refreshing,
    error: snap.error,
    permission: snap.permission,
    reload,
    refresh,
  };
}
