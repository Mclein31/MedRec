import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { KEYS, secure } from '../lib/storage';
import {
  buildRollingNotificationPlan,
  computeSnoozeTrigger,
  formatNotificationCopy,
  needsTimezoneReschedule,
} from './schedule';
import type { Medication, MedicationLog, NotificationPermissionState, ScheduledSlot } from './types';

const CHANNEL_ID = 'medication-reminders';
const RENEWAL_KEY = '__renewal__';
const KIND_DOSE = 'medrec_medication_dose';
const KIND_RENEWAL = 'medrec_medication_renewal';
const KIND_SNOOZE = 'medrec_medication_snooze';

interface StoredLedgerEntry {
  id: string;
  digest: string;
}

interface NotifLedger {
  slots: Record<string, StoredLedgerEntry>;
  lastScheduledTimeZone: string;
  lastScheduledAt: string;
  showNames: boolean;
}

interface SnoozeEntry {
  snoozedUntil: string;
  notificationId: string | null;
}

type SnoozeMap = Record<string, SnoozeEntry>;

if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // Ignore when native module is unavailable in non-native environments.
  }
}

let syncChain: Promise<void> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = syncChain.then(fn, fn);
  syncChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function currentTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function mapPermission(status: Notifications.NotificationPermissionsStatus): NotificationPermissionState {
  if (
    status.granted ||
    status.status === Notifications.PermissionStatus.GRANTED ||
    status.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return 'granted';
  }
  if (
    status.status === Notifications.PermissionStatus.DENIED ||
    status.ios?.status === Notifications.IosAuthorizationStatus.DENIED
  ) {
    return 'denied';
  }
  return 'undetermined';
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Medication reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

async function readLedger(userId: string): Promise<NotifLedger | null> {
  try {
    const raw = await secure.get(KEYS.medsNotifMap(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NotifLedger>;
    if (!parsed || typeof parsed !== 'object' || !parsed.slots || typeof parsed.slots !== 'object') return null;
    return {
      slots: parsed.slots,
      lastScheduledTimeZone: typeof parsed.lastScheduledTimeZone === 'string' ? parsed.lastScheduledTimeZone : '',
      lastScheduledAt: typeof parsed.lastScheduledAt === 'string' ? parsed.lastScheduledAt : '',
      showNames: parsed.showNames === true,
    };
  } catch {
    return null;
  }
}

async function writeLedger(userId: string, ledger: NotifLedger): Promise<void> {
  await secure.set(KEYS.medsNotifMap(userId), JSON.stringify(ledger)).catch(() => undefined);
}

async function readSnoozeMap(userId: string): Promise<SnoozeMap> {
  try {
    const raw = await secure.get(KEYS.medsSnooze(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: SnoozeMap = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (val && typeof val === 'object' && typeof (val as SnoozeEntry).snoozedUntil === 'string') {
        const entry = val as SnoozeEntry;
        out[key] = {
          snoozedUntil: entry.snoozedUntil,
          notificationId: typeof entry.notificationId === 'string' ? entry.notificationId : null,
        };
      }
    }
    return out;
  } catch {
    return {};
  }
}

async function writeSnoozeMap(userId: string, map: SnoozeMap): Promise<void> {
  if (Object.keys(map).length === 0) {
    await secure.remove(KEYS.medsSnooze(userId)).catch(() => undefined);
  } else {
    await secure.set(KEYS.medsSnooze(userId), JSON.stringify(map)).catch(() => undefined);
  }
}

function personFirstName(people: { id: string; name: string }[], personId: string | null): string | null {
  if (!personId) return null;
  const match = people.find((p) => p.id === personId);
  const first = match?.name.trim().split(/\s+/)[0];
  return first || null;
}

function slotDigest(triggerAt: Date, title: string, body: string): string {
  return `${triggerAt.getTime()}|${title}|${body}`;
}

export async function getNotificationPermission(): Promise<NotificationPermissionState> {
  if (Platform.OS === 'web') return 'unsupported';
  try {
    const status = await Notifications.getPermissionsAsync();
    return mapPermission(status);
  } catch {
    return 'unsupported';
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (Platform.OS === 'web') return 'unsupported';
  try {
    const current = await Notifications.getPermissionsAsync();
    if (mapPermission(current) === 'granted') return 'granted';
    const next = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
    return mapPermission(next);
  } catch {
    return 'unsupported';
  }
}

export async function syncMedicationNotifications(
  userId: string,
  medications: Medication[],
  logs: MedicationLog[],
  people: { id: string; name: string }[],
  showNames: boolean,
): Promise<void> {
  if (Platform.OS === 'web') return;

  await enqueue(async () => {
    const permission = await getNotificationPermission();
    const prevLedger = await readLedger(userId);
    const existingScheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
    const osIds = new Set(existingScheduled.map((req) => req.identifier));

    const loggedSlotKeys = new Set(
      logs.map((l) => `${l.medicationId}:${l.scheduledDate}:${l.scheduledTime}`),
    );
    const activeReminderMedIds = new Set(
      medications
        .filter((m) => m.status === 'active' && m.remindersEnabled && m.scheduleKind !== 'as_needed')
        .map((m) => m.id),
    );

    if (permission !== 'granted') {
      const toCancel = new Set<string>();
      if (prevLedger) {
        for (const entry of Object.values(prevLedger.slots)) toCancel.add(entry.id);
      }
      for (const req of existingScheduled) {
        const kind = req.content?.data?.kind;
        if (kind === KIND_DOSE || kind === KIND_RENEWAL || kind === KIND_SNOOZE) {
          toCancel.add(req.identifier);
        }
      }
      await Promise.all(
        Array.from(toCancel).map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)),
      );
      await secure.remove(KEYS.medsNotifMap(userId)).catch(() => undefined);
      return;
    }

    await ensureChannel();

    const now = new Date();
    const tz = currentTimeZone();
    const plan = buildRollingNotificationPlan(medications, logs, now);

    // Build desired notifications keyed by slotKey (plus optional slot #48 renewal).
    const desired = new Map<
      string,
      { triggerAt: Date; title: string; body: string; data: Record<string, unknown>; digest: string }
    >();

    for (const slot of plan.slots) {
      const personName = personFirstName(people, slot.personId);
      const copy = formatNotificationCopy(slot, { showNames, personName });
      desired.set(slot.slotKey, {
        triggerAt: slot.triggerAt,
        title: copy.title,
        body: copy.body,
        data: {
          kind: KIND_DOSE,
          url: '/medications',
          slotKey: slot.slotKey,
          medicationId: slot.medicationId,
          scheduledDate: slot.scheduledDate,
          scheduledTime: slot.scheduledTime,
        },
        digest: slotDigest(slot.triggerAt, copy.title, copy.body),
      });
    }

    if (plan.truncated && plan.renewalTriggerAt) {
      const title = 'MedRec reminder';
      const body = 'Open MedRec to refresh your upcoming medication reminders.';
      desired.set(RENEWAL_KEY, {
        triggerAt: plan.renewalTriggerAt,
        title,
        body,
        data: {
          kind: KIND_RENEWAL,
          url: '/medications',
        },
        digest: slotDigest(plan.renewalTriggerAt, title, body),
      });
    }

    const tzChanged = needsTimezoneReschedule(prevLedger?.lastScheduledTimeZone, tz);
    const privacyChanged = prevLedger ? prevLedger.showNames !== showNames : true;
    const mustRebuildAll = !prevLedger || tzChanged || privacyChanged;

    const keptEntries: Record<string, StoredLedgerEntry> = {};
    const keptIds = new Set<string>();
    const toCancel = new Set<string>();

    if (prevLedger) {
      for (const [key, entry] of Object.entries(prevLedger.slots)) {
        const target = desired.get(key);
        if (!mustRebuildAll && target && target.digest === entry.digest && osIds.has(entry.id)) {
          keptEntries[key] = entry;
          keptIds.add(entry.id);
        } else if (osIds.has(entry.id)) {
          toCancel.add(entry.id);
        }
      }
    }

    // Prune any stale or orphaned dose/renewal notifications and stale snoozes.
    const snoozeMap = await readSnoozeMap(userId);
    const nextSnoozeMap: SnoozeMap = {};
    const liveSnoozeIds = new Set<string>();
    const nowMs = now.getTime();

    for (const [slotKey, entry] of Object.entries(snoozeMap)) {
      const medId = slotKey.split(':')[0] ?? '';
      const untilMs = Date.parse(entry.snoozedUntil);
      const stillValid =
        !Number.isNaN(untilMs) &&
        untilMs > nowMs &&
        !loggedSlotKeys.has(slotKey) &&
        activeReminderMedIds.has(medId);

      if (stillValid) {
        nextSnoozeMap[slotKey] = entry;
        if (entry.notificationId) liveSnoozeIds.add(entry.notificationId);
      } else if (entry.notificationId && osIds.has(entry.notificationId)) {
        toCancel.add(entry.notificationId);
      }
    }

    for (const req of existingScheduled) {
      const data = req.content?.data as Record<string, unknown> | undefined;
      const kind = data?.kind;
      if ((kind === KIND_DOSE || kind === KIND_RENEWAL) && !keptIds.has(req.identifier)) {
        toCancel.add(req.identifier);
      } else if (kind === KIND_SNOOZE && !liveSnoozeIds.has(req.identifier)) {
        toCancel.add(req.identifier);
      }
    }

    if (Object.keys(nextSnoozeMap).length !== Object.keys(snoozeMap).length) {
      await writeSnoozeMap(userId, nextSnoozeMap);
    }

    const needsSchedule = Array.from(desired.keys()).some((k) => !keptEntries[k]);
    if (toCancel.size === 0 && !needsSchedule && prevLedger && !mustRebuildAll) {
      return;
    }

    // Cancel stale notifications BEFORE scheduling new ones so we stay below iOS's 64 limit.
    if (toCancel.size > 0) {
      await Promise.all(
        Array.from(toCancel).map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)),
      );
    }

    const nextSlots: Record<string, StoredLedgerEntry> = { ...keptEntries };
    const channelProp = Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {};

    for (const [key, item] of desired.entries()) {
      if (nextSlots[key]) continue;
      if (item.triggerAt.getTime() <= Date.now()) continue;
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: item.title,
            body: item.body,
            sound: 'default',
            data: item.data,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: item.triggerAt,
            ...channelProp,
          },
        });
        nextSlots[key] = { id, digest: item.digest };
      } catch {
        // Continue scheduling remaining reminders if one fails.
      }
    }

    await writeLedger(userId, {
      slots: nextSlots,
      lastScheduledTimeZone: tz,
      lastScheduledAt: new Date().toISOString(),
      showNames,
    });
  });
}

export async function scheduleSnoozeNotification(
  userId: string,
  slot: ScheduledSlot,
  opts: { showNames: boolean; personName?: string | null; minutes?: number },
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  return enqueue(async () => {
    const permission = await getNotificationPermission();
    if (permission !== 'granted') return null;

    await ensureChannel();

    const snoozeMap = await readSnoozeMap(userId);
    const existing = snoozeMap[slot.slotKey];
    if (existing?.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(existing.notificationId).catch(() => undefined);
    }

    const triggerAt = computeSnoozeTrigger(new Date(), opts.minutes ?? 15);
    const copy = formatNotificationCopy(slot, {
      showNames: opts.showNames,
      personName: opts.personName,
    });

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: copy.title,
        body: copy.body,
        sound: 'default',
        data: {
          kind: KIND_SNOOZE,
          url: '/medications',
          slotKey: slot.slotKey,
          medicationId: slot.medicationId,
          scheduledDate: slot.scheduledDate,
          scheduledTime: slot.scheduledTime,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerAt,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });

    snoozeMap[slot.slotKey] = {
      snoozedUntil: triggerAt.toISOString(),
      notificationId: id,
    };
    await writeSnoozeMap(userId, snoozeMap);
    return id;
  });
}

export async function cancelAllMedicationNotifications(userId?: string | null): Promise<void> {
  await enqueue(async () => {
    if (Platform.OS !== 'web') {
      const idsToCancel = new Set<string>();

      if (userId) {
        const ledger = await readLedger(userId);
        if (ledger) {
          for (const entry of Object.values(ledger.slots)) idsToCancel.add(entry.id);
        }
        const snoozeMap = await readSnoozeMap(userId);
        for (const entry of Object.values(snoozeMap)) {
          if (entry.notificationId) idsToCancel.add(entry.notificationId);
        }
      }

      const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
      for (const req of scheduled) {
        const kind = req.content?.data?.kind;
        if (kind === KIND_DOSE || kind === KIND_RENEWAL || kind === KIND_SNOOZE) {
          idsToCancel.add(req.identifier);
        }
      }

      await Promise.all(
        Array.from(idsToCancel).map((id) =>
          Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined),
        ),
      );
    }

    if (userId) {
      await secure.remove(KEYS.medsNotifMap(userId)).catch(() => undefined);
      await secure.remove(KEYS.medsSnooze(userId)).catch(() => undefined);
    }
  });
}
