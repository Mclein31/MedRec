import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { formatDate } from '../../src/format';
import { api, type ShareScope } from '../../src/lib/api';
import { messageFor } from '../../src/lib/errors';
import { CATEGORIES, CATEGORY_META, space, useColors } from '../../src/theme';
import { useLoad } from '../../src/useLoad';
import { Banner, Button, Eyebrow, Txt } from '../../src/ui/core';
import { Chip, Choice, Field } from '../../src/ui/form';
import { Screen } from '../../src/ui/layout';

const DURATIONS = [
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hour' },
];

type Mode = 'all' | 'categories' | 'records';
const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const plural = (n: number) => `${n} ${n === 1 ? 'record' : 'records'}`;

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
  const { data, error: loadError, reload } = useLoad(() => Promise.all([api.summary(), api.records({ limit: 100 })]), []);
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
      const { share } = await api.createShare(scope, minutes, label.trim() || undefined);
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
    <Screen tabBar={false} nav={{ title: 'Create a share link' }} title="Choose what to share." footer={<Button label="Create share link" onPress={create} loading={busy} />}>
      {(error || loadError) && <Banner message={(error ?? loadError)!} action={loadError ? { label: 'Retry', onPress: reload } : undefined} />}

      <View style={{ gap: space.md }}>
        <Eyebrow>01  What can they see?</Eyebrow>
        <Choice title="All records" subtitle={summary ? `${plural(summary.total)} + health details` : 'Every record + health details'} selected={mode === 'all'} onPress={() => setMode('all')} />
        <Choice title="Some types" subtitle={categories.length ? categories.map((k) => CATEGORY_META[k]?.label).join(', ') : 'For example, only lab results · view only'} selected={mode === 'categories'} onPress={() => setMode('categories')} />
        {mode === 'categories' && (
          <View style={{ gap: space.sm, paddingLeft: space.lg }}>
            {available.map((k) => (
              <Choice key={k} multi title={CATEGORY_META[k]!.label} subtitle={`${plural(summary?.counts[k] ?? 0)} · view only`} selected={categories.includes(k)} onPress={() => setCategories((l) => toggle(l, k))} />
            ))}
          </View>
        )}
        <Choice title="Specific records" subtitle={selected.length ? `${plural(selected.length)} chosen · view only` : 'Pick them one by one'} selected={mode === 'records'} onPress={() => setMode('records')} />
        {mode === 'records' && page && (
          <View style={{ gap: space.sm, paddingLeft: space.lg }}>
            {page.records.map((r) => (
              <Choice key={r.id} multi title={r.title} subtitle={`${CATEGORY_META[r.category]?.short} · ${formatDate(r.eventDate)}`} selected={selected.includes(r.id)} onPress={() => setSelected((l) => toggle(l, r.id))} />
            ))}
          </View>
        )}
      </View>

      <View style={{ gap: space.md }}>
        <Eyebrow>02  How long?</Eyebrow>
        <View style={{ flexDirection: 'row', gap: space.sm }} accessibilityRole="radiogroup">
          {DURATIONS.map((d) => (
            <View key={d.minutes} style={{ flex: 1 }}>
              <Chip label={d.label} selected={minutes === d.minutes} onPress={() => setMinutes(d.minutes)} />
            </View>
          ))}
        </View>
        <Txt variant="caption" color={c.ink3}>Access ends automatically. You can stop it earlier, too.</Txt>
      </View>

      <Field label="Label (optional)" value={label} onChangeText={setLabel} placeholder="e.g. Dr. Rivera" maxLength={80} hint="Anyone with this link can view the selected records until access ends." />
    </Screen>
  );
}
