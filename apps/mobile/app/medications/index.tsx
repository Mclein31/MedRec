import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppState, Linking, Platform, View } from 'react-native';
import { todayIso } from '../../src/format';
import { messageFor } from '../../src/lib/errors';
import { DoseSlotCard, MedicationCard, MedicationDisclaimer } from '../../src/medications/MedicationCard';
import { requestNotificationPermission } from '../../src/medications/notifications';
import { recordDoseOutcome, snoozeDoseSlot, undoDoseOutcome, useMedications } from '../../src/medications/store';
import type { ScheduledSlot } from '../../src/medications/types';
import { useActivePerson } from '../../src/people';
import { radius, space, useColors } from '../../src/theme';
import { Banner, Button, Icon, Tappable, Txt } from '../../src/ui/core';
import { Empty, Enter, Screen, Section } from '../../src/ui/layout';
import { Rise } from '../../src/ui/motion';
import { PersonSwitcher } from '../../src/ui/PersonSwitcher';
import { Remy } from '../../src/ui/Remy';

export default function MedicationsScreen() {
  const c = useColors();
  const { slotKey } = useLocalSearchParams<{ slotKey?: string }>();
  const { personId, person } = useActivePerson();
  const first = person ? person.name.split(' ')[0] : null;
  const { medications, active, past, todaySlots, loading, refreshing, error, permission, reload, refresh } = useMedications(personId);

  const [actionError, setActionError] = useState<string | null>(null);
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // App-level _layout.tsx reloads medications & permissions on foreground; keep local due-now clock fresh too.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') setNowMs(Date.now());
    });
    return () => sub.remove();
  }, []);

  const today = todayIso();
  const slots = useMemo(
    () => [...todaySlots].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)),
    [todaySlots],
  );
  const loggedCount = slots.filter((s) => s.outcome !== null).length;
  const hasReminderCourses = active.some((m) => m.remindersEnabled && m.scheduleKind !== 'as_needed');
  const pastExpanded = showPast || active.length === 0;

  const runSlotAction = async (slot: ScheduledSlot, fn: () => Promise<void>) => {
    if (busySlot) return;
    setBusySlot(slot.slotKey);
    setActionError(null);
    try {
      await fn();
      setNowMs(Date.now());
    } catch (err) {
      setActionError(messageFor(err));
    } finally {
      setBusySlot(null);
    }
  };

  const enableReminders = async () => {
    setActionError(null);
    try {
      await requestNotificationPermission();
      await reload();
    } catch (err) {
      setActionError(messageFor(err));
    }
  };

  const showLoading = loading && medications.length === 0 && !error;
  const showAllEmpty = !loading && !error && active.length === 0 && past.length === 0;

  return (
    <Screen
      tabBar={false}
      nav={{
        title: 'Medications',
        actions: [{ label: 'Add medication', sf: 'plus', icon: 'plus', onPress: () => router.push('/medications/new' as Href) }],
      }}
      title={first ? `${first}'s medications` : 'Medications'}
      subtitle={first ? `Confirmed courses and daily doses for ${first}.` : 'Confirmed courses and daily reminders.'}
      refreshing={refreshing}
      onRefresh={() => {
        setNowMs(Date.now());
        void refresh();
      }}
      footer={medications.length > 0 ? <Button label="Add medication" icon="plus" onPress={() => router.push('/medications/new' as Href)} /> : undefined}
    >
      <PersonSwitcher />

      {!showLoading && permission === 'denied' && (
        <Banner
          tone="warn"
          message="Notifications are turned off for MedRec. Turn them on in Settings to get lock-screen reminders when a dose is due."
          action={{ label: 'Settings', onPress: () => void Linking.openSettings() }}
        />
      )}
      {!showLoading && permission !== 'denied' && (Platform.OS === 'web' || permission === 'unsupported') && (
        <Banner
          tone="warn"
          message="Browser preview shows your schedule and logs doses, but lock-screen reminders require the iPhone or Android app."
        />
      )}
      {!showLoading && permission === 'undetermined' && hasReminderCourses && (
        <Banner
          tone="info"
          message="Allow notifications to get lock-screen reminders when a dose is due."
          action={{ label: 'Turn on', onPress: () => void enableReminders() }}
        />
      )}

      {(error || actionError) && (
        <Banner
          message={(actionError ?? error)!}
          action={error ? { label: 'Retry', onPress: () => void reload() } : undefined}
        />
      )}

      {showLoading ? (
        <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xxl }} accessibilityLiveRegion="polite">
          <Remy pose="reading" motion="read" size={140} ground />
          <Txt variant="headline">Loading {first ? `${first}'s` : 'your'} medications…</Txt>
          <Txt variant="caption" color={c.ink3}>Checking today&apos;s doses and active courses.</Txt>
        </View>
      ) : showAllEmpty ? (
        <Rise from={6}>
          <Empty
            pose="curious"
            motion="peek"
            title="No active medications"
            message="Scan a prescription or add a medication yourself to get reminders when a dose is due."
            action={
              <View style={{ gap: space.md, alignSelf: 'stretch', paddingTop: space.sm }}>
                <Button
                  icon={Platform.OS === 'web' ? 'plus' : 'camera-outline'}
                  label="Scan a prescription"
                  onPress={() => router.push(Platform.OS === 'web' ? '/add' : { pathname: '/add', params: { source: 'camera' } })}
                />
                <Button
                  kind="secondary"
                  icon="pencil-outline"
                  label="Add a medication manually"
                  onPress={() => router.push('/medications/new' as Href)}
                />
              </View>
            }
          />
        </Rise>
      ) : (
        <View style={{ gap: space.xxl }}>
          {(active.length > 0 || slots.length > 0) && (
            <Section title="Today's doses">
              {slots.length > 0 ? (
                <View style={{ gap: space.md }}>
                  <Txt variant="caption" color={c.ink3} accessibilityLiveRegion="polite">
                    {loggedCount} of {slots.length} {slots.length === 1 ? 'dose' : 'doses'} logged today
                  </Txt>
                  {slots.map((slot, i) => (
                    <Enter key={slot.slotKey} index={i}>
                      <DoseSlotCard
                        slot={slot}
                        nowMs={nowMs}
                        highlighted={slotKey === slot.slotKey}
                        busy={busySlot === slot.slotKey}
                        onTaken={() =>
                          void runSlotAction(slot, () =>
                            recordDoseOutcome(slot.medicationId, slot.scheduledDate, slot.scheduledTime, 'taken'),
                          )
                        }
                        onSnooze={() => void runSlotAction(slot, () => snoozeDoseSlot(slot, 15))}
                        onSkip={() =>
                          void runSlotAction(slot, () =>
                            recordDoseOutcome(slot.medicationId, slot.scheduledDate, slot.scheduledTime, 'skipped'),
                          )
                        }
                        onUndo={() =>
                          void runSlotAction(slot, () =>
                            undoDoseOutcome(slot.medicationId, slot.scheduledDate, slot.scheduledTime),
                          )
                        }
                        onOpenMedication={() =>
                          router.push({ pathname: '/medications/[id]', params: { id: slot.medicationId } } as unknown as Href)
                        }
                      />
                    </Enter>
                  ))}
                </View>
              ) : (
                <View style={{ backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, padding: space.lg }}>
                  <Txt variant="body" color={c.ink3}>
                    No scheduled dose times for today.
                  </Txt>
                </View>
              )}
            </Section>
          )}

          {active.length > 0 ? (
            <Section title="Active courses" action={{ label: 'Add', onPress: () => router.push('/medications/new' as Href) }}>
              <View style={{ gap: space.md }}>
                {active.map((med, i) => (
                  <Enter key={med.id} index={i}>
                    <MedicationCard
                      medication={med}
                      today={today}
                      onPress={() => router.push({ pathname: '/medications/[id]', params: { id: med.id } } as unknown as Href)}
                      onOpenRecord={(recordId) => router.push({ pathname: '/record/[id]', params: { id: recordId } })}
                    />
                  </Enter>
                ))}
              </View>
            </Section>
          ) : (
            <Empty
              pose="curious"
              motion="peek"
              title="No active medications"
              message="Scan a prescription or add a medication yourself to get reminders when a dose is due."
              action={
                <View style={{ gap: space.md, alignSelf: 'stretch', paddingTop: space.sm }}>
                  <Button
                    icon={Platform.OS === 'web' ? 'plus' : 'camera-outline'}
                    label="Scan a prescription"
                    onPress={() => router.push(Platform.OS === 'web' ? '/add' : { pathname: '/add', params: { source: 'camera' } })}
                  />
                  <Button
                    kind="secondary"
                    icon="pencil-outline"
                    label="Add a medication manually"
                    onPress={() => router.push('/medications/new' as Href)}
                  />
                </View>
              }
            />
          )}

          {past.length > 0 && (
            <View style={{ gap: space.md }}>
              <Tappable
                onPress={() => setShowPast((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={`Completed and stopped courses, ${past.length}`}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}
              >
                <Txt variant="headline" style={{ fontSize: 18, lineHeight: 24 }} accessibilityRole="header">
                  Completed &amp; stopped ({past.length})
                </Txt>
                <Icon name={pastExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={c.ink2} />
              </Tappable>
              {pastExpanded && (
                <View style={{ gap: space.md }}>
                  {past.map((med) => (
                    <MedicationCard
                      key={med.id}
                      medication={med}
                      today={today}
                      onPress={() => router.push({ pathname: '/medications/[id]', params: { id: med.id } } as unknown as Href)}
                      onOpenRecord={(recordId) => router.push({ pathname: '/record/[id]', params: { id: recordId } })}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {!showLoading && <MedicationDisclaimer />}
    </Screen>
  );
}
