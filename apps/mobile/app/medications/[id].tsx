import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { formatDate, todayIso } from '../../src/format';
import { api, type Medication, type MedicationInput, type MedicationLog, type MedicationPatch } from '../../src/lib/api';
import { fieldError, messageFor } from '../../src/lib/errors';
import {
  formatTimestamp12,
  MedicationDisclaimer,
  MedicationFormFields,
  parseUserTime,
  validateMedicationForm,
  withPendingTime,
  type MedicationFormErrors,
  type MedicationFormValue,
} from '../../src/medications/MedicationCard';
import { getNotificationPermission, requestNotificationPermission } from '../../src/medications/notifications';
import { computeEndDate, formatTime12 } from '../../src/medications/schedule';
import { removeMedicationFromStore, upsertMedicationInStore } from '../../src/medications/store';
import { useActivePerson } from '../../src/people';
import { radius, space, useColors } from '../../src/theme';
import { Banner, Button, Icon, Tappable, TextLink, Txt } from '../../src/ui/core';
import { Screen, Section } from '../../src/ui/layout';
import { Remy } from '../../src/ui/Remy';

function emptyForm(): MedicationFormValue {
  return {
    name: '',
    strength: '',
    dose: '',
    scheduleKind: 'daily_times',
    times: [],
    intervalHours: null,
    mealTiming: 'anytime',
    startDate: todayIso(),
    durationDays: '',
    endDate: '',
    instructions: '',
    prescriber: '',
    prescribedDate: '',
    remindersEnabled: true,
  };
}

function toForm(med: Medication): MedicationFormValue {
  return {
    name: med.name,
    strength: med.strength ?? '',
    dose: med.dose ?? '',
    scheduleKind: med.scheduleKind,
    times: [...med.times],
    intervalHours: med.intervalHours,
    mealTiming: med.mealTiming ?? 'anytime',
    startDate: med.startDate,
    durationDays: med.durationDays ? String(med.durationDays) : '',
    endDate: med.endDate ?? '',
    instructions: med.instructions ?? '',
    prescriber: med.prescriber ?? '',
    prescribedDate: med.prescribedDate ?? '',
    remindersEnabled: med.remindersEnabled,
  };
}

/** Manual add (`id === 'new'`) or edit/stop/delete an existing medication. */
export default function MedicationDetailScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { personId, person } = useActivePerson();
  const firstName = person ? person.name.split(' ')[0] : null;

  const [med, setMed] = useState<Medication | null>(null);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [form, setForm] = useState<MedicationFormValue | null>(() => (isNew ? emptyForm() : null));
  const [anchorText, setAnchorText] = useState('');
  const [timeDraft, setTimeDraft] = useState('');
  const [errors, setErrors] = useState<MedicationFormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'stop' | 'resume' | 'delete' | null>(null);
  const original = useRef(JSON.stringify(emptyForm()));
  const originalAnchor = useRef('');
  const inFlight = useRef(false);

  const load = () => {
    if (isNew) {
      const fresh = emptyForm();
      original.current = JSON.stringify(fresh);
      originalAnchor.current = '';
      setForm(fresh);
      setAnchorText('');
      setTimeDraft('');
      return;
    }
    setError(null);
    api
      .medication(id)
      .then((res) => {
        const nextForm = toForm(res.medication);
        const nextAnchor = res.medication.scheduleKind === 'interval_hours' ? (res.medication.times[0] ?? '') : '';
        original.current = JSON.stringify(nextForm);
        originalAnchor.current = nextAnchor;
        setMed(res.medication);
        setLogs(res.logs);
        setForm(nextForm);
        setAnchorText(nextAnchor);
        setTimeDraft('');
      })
      .catch((err) => setError(messageFor(err)));
  };

  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty =
    !!form &&
    (JSON.stringify(form) !== original.current ||
      anchorText !== originalAnchor.current ||
      timeDraft.trim().length > 0);

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/medications' as Href));

  const close = () => {
    if (!dirty) return leave();
    if (Platform.OS === 'web') {
      return globalThis.confirm?.('Discard your changes?') === false ? undefined : leave();
    }
    Alert.alert('Discard your changes?', "What you've changed here won't be saved.", [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: leave },
    ]);
  };

  const save = async () => {
    if (!form || inFlight.current) return;

    let nextForm = form;
    if (form.scheduleKind === 'daily_times' && timeDraft.trim()) {
      const merged = withPendingTime(form.times, timeDraft);
      if (merged.invalid) {
        setErrors({ times: 'Use a time like 08:00, 14:30, or 8:00 PM.' });
        setError('Check the highlighted fields.');
        return;
      }
      nextForm = { ...form, times: merged.times };
      setForm(nextForm);
      setTimeDraft('');
    }

    const found = validateMedicationForm(nextForm, {
      anchorInput: nextForm.scheduleKind === 'interval_hours' ? anchorText : undefined,
    });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setError('Check the highlighted fields.');
      return;
    }

    const durRaw = nextForm.durationDays.trim();
    const durationDays = durRaw ? Number(durRaw) : null;
    const endDate =
      nextForm.endDate.trim() ||
      (durationDays ? computeEndDate(nextForm.startDate, durationDays) : null);

    let times: string[] = [];
    if (nextForm.scheduleKind === 'daily_times') {
      times = [...nextForm.times].sort();
    } else if (nextForm.scheduleKind === 'interval_hours') {
      const parsedAnchor = parseUserTime(anchorText) ?? nextForm.times[0];
      if (parsedAnchor) times = [parsedAnchor];
    }

    const remindersEnabled = nextForm.scheduleKind === 'as_needed' ? false : nextForm.remindersEnabled;
    const basePayload = {
      name: nextForm.name.trim(),
      strength: nextForm.strength.trim() || null,
      dose: nextForm.dose.trim() || null,
      instructions: nextForm.instructions.trim() || null,
      prescriber: nextForm.prescriber.trim() || null,
      prescribedDate: nextForm.prescribedDate.trim() || null,
      scheduleKind: nextForm.scheduleKind,
      times,
      intervalHours: nextForm.scheduleKind === 'interval_hours' ? nextForm.intervalHours : null,
      mealTiming: nextForm.mealTiming,
      startDate: nextForm.startDate,
      endDate,
      durationDays,
      remindersEnabled,
    };

    inFlight.current = true;
    setBusy('save');
    setError(null);
    try {
      let saved: Medication;
      if (isNew) {
        const input: MedicationInput = { ...basePayload, personId };
        saved = (await api.createMedication(input)).medication;
      } else {
        const patch: MedicationPatch = {
          ...basePayload,
          ...(med?.status === 'completed' && (!endDate || endDate >= todayIso()) ? { status: 'active' } : {}),
        };
        saved = (await api.updateMedication(id, patch)).medication;
      }

      const wantsReminders = saved.remindersEnabled && saved.scheduleKind !== 'as_needed' && saved.status === 'active';
      const turnedOn = isNew || !med?.remindersEnabled || med?.status !== 'active';
      if (wantsReminders && turnedOn) {
        const perm = await getNotificationPermission();
        if (perm === 'undetermined') await requestNotificationPermission().catch(() => undefined);
      }

      upsertMedicationInStore(saved);
      original.current = JSON.stringify(toForm(saved));
      originalAnchor.current = saved.scheduleKind === 'interval_hours' ? (saved.times[0] ?? '') : '';
      leave();
    } catch (err) {
      const fields = ['name', 'times', 'intervalHours', 'startDate', 'durationDays', 'endDate', 'prescribedDate'] as const;
      const hit = fields.find((f) => fieldError(err, f));
      if (hit) setErrors({ [hit]: fieldError(err, hit)! });
      setError(messageFor(err));
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  };

  const stopCourse = () => {
    if (!med || inFlight.current) return;
    const go = async () => {
      inFlight.current = true;
      setBusy('stop');
      setError(null);
      try {
        const { medication } = await api.updateMedication(med.id, { status: 'stopped' });
        upsertMedicationInStore(medication);
        leave();
      } catch (err) {
        setError(messageFor(err));
      } finally {
        inFlight.current = false;
        setBusy(null);
      }
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(`Stop ${med.name}? Upcoming reminders will be cancelled.`)) void go();
      return;
    }
    Alert.alert(`Stop ${med.name}?`, 'Upcoming reminders will be cancelled. You can still view or resume it under Completed & stopped.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop medication', style: 'destructive', onPress: () => void go() },
    ]);
  };

  const resumeCourse = async () => {
    if (!med || inFlight.current) return;
    inFlight.current = true;
    setBusy('resume');
    setError(null);
    try {
      const { medication } = await api.updateMedication(med.id, { status: 'active' });
      if (medication.remindersEnabled && medication.scheduleKind !== 'as_needed') {
        const perm = await getNotificationPermission();
        if (perm === 'undetermined') await requestNotificationPermission().catch(() => undefined);
      }
      upsertMedicationInStore(medication);
      leave();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  };

  const deleteCourse = () => {
    if (!med || inFlight.current) return;
    const go = async () => {
      inFlight.current = true;
      setBusy('delete');
      setError(null);
      try {
        await api.deleteMedication(med.id);
        removeMedicationFromStore(med.id);
        leave();
      } catch (err) {
        setError(messageFor(err));
      } finally {
        inFlight.current = false;
        setBusy(null);
      }
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(`Delete ${med.name}? This removes the medication and its dose history.`)) void go();
      return;
    }
    Alert.alert(`Delete ${med.name}?`, 'This removes the medication, its reminders and its dose history. Your prescription record stays untouched.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void go() },
    ]);
  };

  const recentLogs = [...logs]
    .sort((a, b) => `${b.scheduledDate} ${b.scheduledTime}`.localeCompare(`${a.scheduledDate} ${a.scheduledTime}`))
    .slice(0, 7);

  return (
    <Screen
      tabBar={false}
      nav={{ title: isNew ? 'Add medication' : 'Edit medication', back: 'close', onBack: close }}
      title={isNew ? (firstName ? `Add medication for ${firstName}` : 'Add medication') : med?.name || 'Medication'}
      subtitle={
        isNew
          ? firstName
            ? `Keep ${firstName}'s schedule and reminders up to date.`
            : 'Add a medication manually and choose when you want reminders.'
          : undefined
      }
      footer={
        form ? (
          <Button
            label={busy === 'save' ? 'Saving…' : isNew ? 'Save medication' : 'Save changes'}
            onPress={() => void save()}
            loading={busy === 'save'}
            disabled={!!busy && busy !== 'save'}
          />
        ) : undefined
      }
    >
      {!form && !error && <Remy pose="reading" motion="read" size={120} style={{ alignSelf: 'center' }} />}
      {!!error && <Banner message={error} action={!form ? { label: 'Retry', onPress: load } : undefined} />}

      {form && (
        <>
          {!isNew && med?.status === 'stopped' && (
            <Banner
              tone="info"
              message={`This medication was stopped${med.stoppedAt ? ` on ${formatDate(med.stoppedAt.slice(0, 10), { year: true })}` : ''}.`}
            />
          )}
          {!isNew && med?.status === 'completed' && (
            <Banner
              tone="info"
              message={`This course ended${med.endDate ? ` on ${formatDate(med.endDate, { year: true })}` : ''}.`}
            />
          )}
          {!isNew && med?.sourceRecordId && (
            <TextLink
              label="View source prescription"
              onPress={() => router.push({ pathname: '/record/[id]', params: { id: med.sourceRecordId! } })}
            />
          )}

          <MedicationFormFields
            value={form}
            onChange={(next) => {
              setError(null);
              setForm(next);
            }}
            errors={errors}
            anchorText={anchorText}
            onAnchorTextChange={setAnchorText}
            timeDraft={timeDraft}
            onTimeDraftChange={setTimeDraft}
          />

          {!isNew && recentLogs.length > 0 && (
            <Section title="Recent doses">
              <View style={{ backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
                {recentLogs.map((log, i) => (
                  <View
                    key={log.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: space.md,
                      paddingHorizontal: space.lg,
                      paddingVertical: space.md,
                      borderTopWidth: i > 0 ? 1 : 0,
                      borderTopColor: c.line,
                    }}
                  >
                    <Txt variant="label">
                      {formatDate(log.scheduledDate)} · {formatTime12(log.scheduledTime)}
                    </Txt>
                    <Txt variant="caption" color={log.outcome === 'taken' ? c.ink2 : c.ink3}>
                      {log.outcome === 'taken'
                        ? `Taken${log.actedAt ? ` at ${formatTimestamp12(log.actedAt)}` : ''}`
                        : 'Skipped'}
                    </Txt>
                  </View>
                ))}
              </View>
            </Section>
          )}

          {!isNew && med && (
            <View style={{ gap: space.md }}>
              {med.status === 'active' && (
                <Button
                  kind="secondary"
                  icon="stop-circle-outline"
                  label={busy === 'stop' ? 'Stopping…' : 'Stop this medication'}
                  onPress={stopCourse}
                  loading={busy === 'stop'}
                  disabled={!!busy && busy !== 'stop'}
                />
              )}
              {med.status === 'stopped' && (
                <Button
                  kind="secondary"
                  icon="play-circle-outline"
                  label={busy === 'resume' ? 'Resuming…' : 'Resume this medication'}
                  onPress={() => void resumeCourse()}
                  loading={busy === 'resume'}
                  disabled={!!busy && busy !== 'resume'}
                />
              )}
              <Tappable
                onPress={deleteCourse}
                disabled={!!busy}
                dimmed={!!busy}
                accessibilityLabel={`Delete ${med.name}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44, alignSelf: 'flex-start' }}
              >
                <Icon name="trash-can-outline" size={20} color={c.danger} />
                <Txt variant="label" color={c.danger}>Delete medication</Txt>
              </Tappable>
            </View>
          )}

          <MedicationDisclaimer />
        </>
      )}
    </Screen>
  );
}
