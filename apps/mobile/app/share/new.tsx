import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { formatDate } from '../../src/format';
import { api, type HealthRecord, type ShareScope } from '../../src/lib/api';
import { messageFor } from '../../src/lib/errors';
import { useActivePerson } from '../../src/people';
import { CATEGORIES, CATEGORY_META, motion, radius, space, useColors } from '../../src/theme';
import { useLoad } from '../../src/useLoad';
import { Banner, Button, Eyebrow, Icon, Tappable, Txt } from '../../src/ui/core';
import { Choice, Field, SearchField } from '../../src/ui/form';
import { DurationSlider } from '../../src/ui/DurationSlider';
import { Screen } from '../../src/ui/layout';
import { Rise } from '../../src/ui/motion';

type Mode = 'all' | 'categories' | 'records';
const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const plural = (n: number) => `${n} ${n === 1 ? 'record' : 'records'}`;

const PREVIEW = 6;

/** Compact multi-select for a long list: search, a running count, and one grouped list that expands on request. */
function RecordPicker({ records, selected, onToggle, onClear }: { records: HealthRecord[]; selected: string[]; onToggle: (id: string) => void; onClear: () => void }) {
  const c = useColors();
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);
  const needle = q.trim().toLowerCase();
  const matches = needle ? records.filter((r) => `${r.title} ${CATEGORY_META[r.category]?.short ?? ''}`.toLowerCase().includes(needle)) : records;
  const shown = all || needle ? matches : matches.slice(0, PREVIEW);
  return (
    <View style={{ gap: space.md }}>
      {records.length > PREVIEW && <SearchField value={q} onChangeText={setQ} placeholder="Find a record to share" label="Search records to share" />}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 }}>
        <Txt variant="caption" color={c.ink3} accessibilityLiveRegion="polite">{selected.length ? `${plural(selected.length)} chosen` : `${records.length} to choose from`}</Txt>
        {selected.length > 0 && (
          <Tappable onPress={onClear} accessibilityLabel="Clear chosen records" hitSlop={10}>
            <Txt variant="label" color={c.ink2} style={{ textDecorationLine: 'underline' }}>Clear</Txt>
          </Tappable>
        )}
      </View>
      <View style={{ backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
        {shown.map((r, i) => {
          const on = selected.includes(r.id);
          return (
            <Tappable
              key={r.id}
              onPress={() => onToggle(r.id)}
              haptic
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${r.title}, ${CATEGORY_META[r.category]?.short}, ${formatDate(r.eventDate)}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 60, paddingHorizontal: space.lg, paddingVertical: space.sm, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}
            >
              <Icon name={on ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={on ? c.accent : c.ink3} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="headline" numberOfLines={1}>{r.title}</Txt>
                <Txt variant="caption" color={c.ink3} numberOfLines={1}>{CATEGORY_META[r.category]?.short} · {formatDate(r.eventDate)}</Txt>
              </View>
            </Tappable>
          );
        })}
        {!shown.length && <Txt color={c.ink3} style={{ padding: space.lg }}>No records match "{q.trim()}".</Txt>}
      </View>
      {!all && !needle && matches.length > PREVIEW && (
        <Button kind="ghost" label={`Show all ${matches.length} records`} onPress={() => setAll(true)} style={{ minHeight: 44 }} />
      )}
    </View>
  );
}

export default function NewShare() {
  const c = useColors();
  const { recordId } = useLocalSearchParams<{ recordId?: string }>();
  const [mode, setMode] = useState<Mode>(recordId ? 'records' : 'all');
  const [categories, setCategories] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>(recordId ? [recordId] : []);
  const [minutes, setMinutes] = useState(15);
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  // A share covers one person's records: whoever is being viewed when it's created (DD-55).
  const { personId, person } = useActivePerson();
  const first = person?.name.split(' ')[0];
  const { data, error: loadError, reload } = useLoad(() => Promise.all([api.summary(personId), api.records({ limit: 100, personId })]), [personId]);
  const [summary, page] = data ?? [null, null];

  const create = async () => {
    if (inFlight.current) return;
    let scope: ShareScope;
    if (mode === 'categories') {
      if (!categories.length) return setError('Choose at least one type of record.');
      scope = { scope: 'categories', categories };
    } else if (mode === 'records') {
      if (!selected.length) return setError('Choose at least one record.');
      scope = { scope: 'records', recordIds: selected };
    } else scope = { scope: 'all' };
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const { share } = await api.createShare(scope, minutes, label.trim() || undefined, personId);
      router.replace({ pathname: '/share/[id]', params: { id: share.id } });
    } catch (err) {
      setError(messageFor(err));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const available = CATEGORIES.filter((k) => (summary?.counts[k] ?? 0) > 0);

  return (
    <Screen tabBar={false} nav={{ title: 'Create a share link' }} title={first ? `Choose what to share of ${first}'s records.` : 'Choose what to share.'} footer={<Button label="Create share link" onPress={create} loading={busy} />}>
      {(error || loadError) && <Banner message={(error ?? loadError)!} action={loadError ? { label: 'Retry', onPress: reload } : undefined} />}

      <View style={{ gap: space.md }}>
        <Eyebrow>01  What can they see?</Eyebrow>
        <Choice title="All records" subtitle={summary ? `${plural(summary.total)} + health details` : 'Every record + health details'} selected={mode === 'all'} onPress={() => setMode('all')} />
        <Choice title="Some types" subtitle={categories.length ? categories.map((k) => CATEGORY_META[k]?.label).join(', ') : 'For example, only lab results · view only'} selected={mode === 'categories'} onPress={() => setMode('categories')} />
        {mode === 'categories' && (
          <Rise from={-6} duration={motion.routine} style={{ gap: space.sm }}>
            {available.map((k) => (
              <Choice key={k} multi title={CATEGORY_META[k]!.label} subtitle={`${plural(summary?.counts[k] ?? 0)} · view only`} selected={categories.includes(k)} onPress={() => setCategories((l) => toggle(l, k))} />
            ))}
          </Rise>
        )}
        <Choice title="Specific records" subtitle={selected.length ? `${plural(selected.length)} chosen · view only` : 'Pick them one by one'} selected={mode === 'records'} onPress={() => setMode('records')} />
        {mode === 'records' && page && (
          <Rise from={-6} duration={motion.routine}>
            <RecordPicker records={page.records} selected={selected} onToggle={(id) => setSelected((l) => toggle(l, id))} onClear={() => setSelected([])} />
          </Rise>
        )}
      </View>

      <View style={{ gap: space.md }}>
        <Eyebrow>02  How long?</Eyebrow>
        <DurationSlider minutes={minutes} onChange={setMinutes} />
        <Txt variant="caption" color={c.ink3}>Access ends automatically. You can stop it earlier, too.</Txt>
      </View>

      <Field label="Label (optional)" value={label} onChangeText={setLabel} placeholder="e.g. Dr. Rivera" maxLength={80} hint="Anyone with this link can view the selected records until access ends." />
    </Screen>
  );
}
