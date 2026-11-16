import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { formatDate, todayIso } from '../../src/format';
import { api, type HealthRecord } from '../../src/lib/api';
import { messageFor } from '../../src/lib/errors';
import { draftToMedicationInput, prepareReviewDrafts, validateReviewDraft } from '../../src/medications/extract';
import {
  MedicationDisclaimer,
  MedicationFormFields,
  validateMedicationForm,
  withPendingTime,
  type MedicationFormErrors,
  type MedicationFormValue,
} from '../../src/medications/MedicationCard';
import { getNotificationPermission, requestNotificationPermission } from '../../src/medications/notifications';
import { formatScheduleSummary } from '../../src/medications/schedule';
import { saveConfirmedMedications } from '../../src/medications/store';
import type { MedicationReviewDraft } from '../../src/medications/types';
import { setActivePerson, useActivePerson } from '../../src/people';
import { radius, space, useColors } from '../../src/theme';
import { Banner, Button, Eyebrow, Icon, Tappable, Txt } from '../../src/ui/core';
import { Choice } from '../../src/ui/form';
import { Empty, Rule, Screen } from '../../src/ui/layout';
import { Remy } from '../../src/ui/Remy';

function checkDraft(
  draft: MedicationReviewDraft,
  opts?: { anchorInput?: string; timeDraft?: string },
): MedicationFormErrors {
  const formErrors = validateMedicationForm(draft, opts);
  const extractErrors = validateReviewDraft(draft);
  if (formErrors.intervalHours && extractErrors.times === 'Choose how many hours between doses (1 to 24).') {
    delete extractErrors.times;
  }
  return { ...formErrors, ...extractErrors };
}

export default function MedicationReviewScreen() {
  const c = useColors();
  const { recordId } = useLocalSearchParams<{ recordId?: string }>();
  const { personId: activePersonId, people } = useActivePerson();

  const [record, setRecord] = useState<HealthRecord | null>(null);
  const [loading, setLoading] = useState(Boolean(recordId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<MedicationReviewDraft[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [anchorTexts, setAnchorTexts] = useState<Record<string, string>>({});
  const [timeDrafts, setTimeDrafts] = useState<Record<string, string>>({});
  const [draftErrors, setDraftErrors] = useState<Record<string, MedicationFormErrors>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const original = useRef('[]');
  const inFlight = useRef(false);

  const load = () => {
    if (!recordId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    api
      .record(recordId)
      .then((res) => {
        const rec = res.record;
        setRecord(rec);
        const prepared = prepareReviewDrafts(rec.ai?.medications ?? [], {
          provider: rec.provider,
          eventDate: rec.eventDate,
          today: todayIso(),
        });
        original.current = JSON.stringify(prepared);
        setDrafts(prepared);
        const initExpanded: Record<string, boolean> = {};
        const initAnchors: Record<string, string> = {};
        prepared.forEach((d, idx) => {
          initExpanded[d.key] = d.needsAttention || prepared.length <= 2 || idx === 0;
          if (d.scheduleKind === 'interval_hours') initAnchors[d.key] = d.times[0] ?? '';
        });
        setExpanded(initExpanded);
        setAnchorTexts(initAnchors);
        setTimeDrafts({});
        setDraftErrors({});
      })
      .catch((err) => setLoadError(messageFor(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [recordId]); // eslint-disable-line react-hooks/exhaustive-deps

  const targetPersonId = record?.personId ?? activePersonId ?? null;
  const targetPerson = useMemo(
    () => (targetPersonId ? people.find((p) => p.id === targetPersonId) ?? null : null),
    [people, targetPersonId],
  );
  const firstName = targetPerson ? targetPerson.name.split(' ')[0] : null;
  const confirmedCount = drafts.filter((d) => d.confirmed).length;
  const dirty = drafts.length > 0 && JSON.stringify(drafts) !== original.current;

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/medications' as Href));

  const close = () => {
    if (!dirty) return leave();
    if (Platform.OS === 'web') {
      return globalThis.confirm?.('Discard your medication review?') === false ? undefined : leave();
    }
    Alert.alert('Discard your review?', 'Confirmed changes will not be saved.', [
      { text: 'Keep reviewing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: leave },
    ]);
  };

  const updateDraft = (key: string, nextForm: MedicationFormValue) => {
    setNotice(null);
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.key !== key) return d;
        const next: MedicationReviewDraft = { ...d, ...nextForm };
        const errs = checkDraft(next, {
          anchorInput: next.scheduleKind === 'interval_hours' ? anchorTexts[key] : undefined,
        });
        if (next.confirmed && Object.keys(errs).length > 0) {
          next.confirmed = false;
        }
        setDraftErrors((prevErrs) => ({ ...prevErrs, [key]: errs }));
        return next;
      }),
    );
  };

  const toggleConfirm = (key: string) => {
    const target = drafts.find((d) => d.key === key);
    if (!target) return;
    setNotice(null);

    if (target.confirmed) {
      setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, confirmed: false } : d)));
      return;
    }

    let candidate = target;
    const pendingRaw = timeDrafts[key] ?? '';
    if (target.scheduleKind === 'daily_times' && pendingRaw.trim()) {
      const merged = withPendingTime(target.times, pendingRaw);
      if (merged.invalid) {
        setExpanded((prev) => ({ ...prev, [key]: true }));
        setDraftErrors((prev) => ({
          ...prev,
          [key]: { ...prev[key], times: 'Use a time like 08:00, 14:30, or 8:00 PM.' },
        }));
        setNotice('Complete the highlighted fields before confirming.');
        return;
      }
      candidate = { ...target, times: merged.times };
    }

    const errs = checkDraft(candidate, {
      anchorInput: candidate.scheduleKind === 'interval_hours' ? anchorTexts[key] : undefined,
    });
    if (Object.keys(errs).length > 0) {
      setExpanded((prev) => ({ ...prev, [key]: true }));
      setDraftErrors((prev) => ({ ...prev, [key]: errs }));
      setNotice('Complete the highlighted fields before confirming, or set the schedule to As needed / Reminders off.');
      return;
    }

    setTimeDrafts((prev) => ({ ...prev, [key]: '' }));
    setDraftErrors((prev) => ({ ...prev, [key]: {} }));
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...candidate, confirmed: true } : d)));
  };

  const save = async () => {
    if (inFlight.current || !record) return;
    const chosen = drafts.filter((d) => d.confirmed);
    if (!chosen.length) return;

    // Final validation pass across all confirmed medications.
    let hasInvalid = false;
    const nextDrafts = drafts.map((d) => {
      if (!d.confirmed) return d;
      const errs = checkDraft(d, {
        anchorInput: d.scheduleKind === 'interval_hours' ? anchorTexts[d.key] : undefined,
        timeDraft: d.scheduleKind === 'daily_times' ? timeDrafts[d.key] : undefined,
      });
      if (Object.keys(errs).length > 0) {
        hasInvalid = true;
        setExpanded((prev) => ({ ...prev, [d.key]: true }));
        setDraftErrors((prev) => ({ ...prev, [d.key]: errs }));
        return { ...d, confirmed: false };
      }
      return d;
    });

    if (hasInvalid) {
      setDrafts(nextDrafts);
      setNotice('Check the highlighted fields before saving.');
      return;
    }

    inFlight.current = true;
    setSaving(true);
    setNotice(null);
    try {
      const items = chosen.map((d) =>
        draftToMedicationInput(d, { personId: targetPersonId, sourceRecordId: record.id }),
      );
      if (items.some((it) => it.remindersEnabled !== false && it.scheduleKind !== 'as_needed')) {
        const perm = await getNotificationPermission();
        if (perm === 'undetermined') await requestNotificationPermission().catch(() => undefined);
      }
      await saveConfirmedMedications({
        personId: targetPersonId,
        sourceRecordId: record.id,
        items,
      });
      if (targetPersonId !== activePersonId) await setActivePerson(targetPersonId);
      router.replace('/medications' as Href);
    } catch (err) {
      setNotice(messageFor(err));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <Screen
      tabBar={false}
      nav={{ title: 'Review medications', back: 'close', onBack: close }}
      title="Check your prescription"
      subtitle={
        record
          ? `From “${record.title}”${firstName ? ` · for ${firstName}` : ''}. Confirm each medication you want on your list.`
          : 'Confirm each medication against your prescription before setting reminders.'
      }
      footer={
        drafts.length > 0 ? (
          <View style={{ gap: space.sm }}>
            <MedicationDisclaimer />
            <Button
              label={
                saving
                  ? 'Saving…'
                  : confirmedCount === 0
                    ? 'Confirm at least one medication'
                    : `Save confirmed medications (${confirmedCount})`
              }
              onPress={() => void save()}
              loading={saving}
              disabled={confirmedCount === 0 || saving}
            />
          </View>
        ) : undefined
      }
    >
      {loadError && <Banner message={loadError} action={{ label: 'Retry', onPress: load }} />}
      {notice && <Banner tone="warn" message={notice} />}

      {loading ? (
        <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xxl }} accessibilityLiveRegion="polite">
          <Remy pose="reading" motion="read" size={140} ground />
          <Txt variant="headline">Preparing medications to review…</Txt>
          <Txt variant="caption" color={c.ink3}>Loading what was read from your prescription.</Txt>
        </View>
      ) : !loadError && drafts.length === 0 ? (
        <Empty
          pose="curious"
          motion="peek"
          title="No medications to review"
          message="This record does not have extracted prescription medications yet. You can add a medication manually instead."
          action={
            <View style={{ gap: space.md, alignSelf: 'stretch', paddingTop: space.sm }}>
              <Button label="Add a medication manually" onPress={() => router.replace('/medications/new' as Href)} />
              <Button kind="secondary" label="Go back" onPress={leave} />
            </View>
          }
        />
      ) : (
        <View style={{ gap: space.lg }}>
          {drafts.length > 1 && confirmedCount < drafts.length && (
            <Txt variant="caption" color={c.ink3}>
              Unchecked medications will be skipped and will not start reminders.
            </Txt>
          )}

          {drafts.map((draft) => {
            const isExpanded = !!expanded[draft.key];
            const showWarningBadge =
              draft.needsAttention || draft.confidence === 'low' || draft.lowConfidenceFields.length > 0;
            const summaryLine = [
              draft.dose || null,
              draft.rawFrequency || formatScheduleSummary(draft),
              `Starts ${formatDate(draft.startDate)}`,
            ]
              .filter(Boolean)
              .join(' · ');

            return (
              <View
                key={draft.key}
                style={{
                  backgroundColor: c.surface,
                  borderRadius: radius.lg,
                  borderWidth: draft.confirmed ? 1.5 : 1,
                  borderColor: draft.confirmed ? c.accent : showWarningBadge ? c.warn : c.line,
                  padding: space.lg,
                  gap: space.md,
                }}
              >
                <Eyebrow color={c.ink2}>READ FROM YOUR PRESCRIPTION — PLEASE CHECK</Eyebrow>

                {showWarningBadge && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      alignSelf: 'flex-start',
                      backgroundColor: c.warnSoft,
                      borderRadius: radius.pill,
                      paddingHorizontal: space.md,
                      paddingVertical: 4,
                    }}
                  >
                    <Icon name="alert-circle-outline" size={14} color={c.warn} />
                    <Txt variant="caption" color={c.warn}>
                      Check carefully against your prescription
                    </Txt>
                  </View>
                )}

                <Tappable
                  onPress={() => setExpanded((prev) => ({ ...prev, [draft.key]: !prev[draft.key] }))}
                  accessibilityLabel={`${draft.name || 'Medication'}, ${isExpanded ? 'hide details' : 'edit details'}`}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, minHeight: 44 }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="title" numberOfLines={2}>
                      {draft.name.trim() || 'Unnamed medication'}
                      {draft.strength.trim() ? ` ${draft.strength.trim()}` : ''}
                    </Txt>
                    {!!summaryLine && (
                      <Txt variant="caption" color={c.ink3} numberOfLines={2}>
                        {summaryLine}
                      </Txt>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Txt variant="label" color={c.ink2}>
                      {isExpanded ? 'Hide' : 'Edit'}
                    </Txt>
                    <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={c.ink2} />
                  </View>
                </Tappable>

                {isExpanded && (
                  <>
                    <Rule />
                    <MedicationFormFields
                      value={draft}
                      onChange={(nextForm) => updateDraft(draft.key, nextForm)}
                      errors={draftErrors[draft.key]}
                      flaggedFields={draft.lowConfidenceFields}
                      rawFrequency={draft.rawFrequency || undefined}
                      anchorText={anchorTexts[draft.key]}
                      onAnchorTextChange={(text) =>
                        setAnchorTexts((prev) => ({ ...prev, [draft.key]: text }))
                      }
                      timeDraft={timeDrafts[draft.key]}
                      onTimeDraftChange={(text) =>
                        setTimeDrafts((prev) => ({ ...prev, [draft.key]: text }))
                      }
                    />
                  </>
                )}

                <Rule />

                <Choice
                  multi
                  title={`Confirm details are accurate for ${draft.name.trim() || 'this medication'}`}
                  subtitle={
                    draft.confirmed
                      ? 'Confirmed — ready to save'
                      : 'Check dose, timing and dates against your prescription'
                  }
                  selected={draft.confirmed}
                  onPress={() => toggleConfirm(draft.key)}
                />
              </View>
            );
          })}

          <MedicationDisclaimer />
        </View>
      )}
    </Screen>
  );
}
