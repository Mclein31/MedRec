import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { formatDate } from '../../src/format';
import { api, type ShareScope } from '../../src/lib/api';
import { messageFor } from '../../src/lib/errors';
import { CATEGORIES, CATEGORY_META, space, useColors } from '../../src/theme';
import { useLoad } from '../../src/useLoad';
import { Banner, Button, Icon, Tappable, Txt } from '../../src/ui/core';
import { Chip, Field } from '../../src/ui/form';
import { Group, Screen, Section } from '../../src/ui/layout';

const DURATIONS = [
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hour' },
  { minutes: 1440, label: '1 day' },
  { minutes: 10080, label: '7 days' },
];

type Mode = 'all' | 'categories' | 'records';

function Choice({ title, subtitle, selected, onPress }: { title: string; subtitle: string; selected: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Tappable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={title} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg }}>
      <Icon name={selected ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={selected ? c.accent : c.ink3} />
      <View style={{ flex: 1 }}>
        <Txt variant="headline">{title}</Txt>
        <Txt variant="caption" color={c.ink3}>{subtitle}</Txt>
      </View>
    </Tappable>
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
  const { data } = useLoad(() => Promise.all([api.summary(), api.records({ limit: 100 })]), []);
  const [summary, page] = data ?? [null, null];

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

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
      await api.createShare(scope, minutes, label.trim() || undefined);
      router.dismissTo('/(tabs)/share');
    } catch (err) {
      setError(messageFor(err));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const available = CATEGORIES.filter((k) => (summary?.counts[k] ?? 0) > 0);

  return (
    <Screen
      title="New share link"
      tabBar={false}
      right={
        <Tappable onPress={() => router.back()} accessibilityLabel="Close" hitSlop={10} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={24} color={c.ink} />
        </Tappable>
      }
    >
      {error && <Banner message={error} />}
      <Section title="What to share">
        <Group>
          <Choice title="Everything" subtitle={summary ? `All ${summary.total} records and your key health facts` : 'All records and your key health facts'} selected={mode === 'all'} onPress={() => setMode('all')} />
          <Choice title="Some types" subtitle="For example, only lab results" selected={mode === 'categories'} onPress={() => setMode('categories')} />
          <Choice title="Specific records" subtitle={selected.length ? `${selected.length} chosen` : 'Pick them one by one'} selected={mode === 'records'} onPress={() => setMode('records')} />
        </Group>
        {mode === 'categories' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {available.map((k) => (
              <Chip key={k} label={CATEGORY_META[k]!.label} count={summary?.counts[k]} selected={categories.includes(k)} onPress={() => setCategories((l) => toggle(l, k))} />
            ))}
          </View>
        )}
        {mode === 'records' && page && (
          <Group>
            {page.records.map((r) => (
              <Tappable key={r.id} onPress={() => setSelected((l) => toggle(l, r.id))} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(r.id) }} accessibilityLabel={r.title} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md }}>
                <Icon name={selected.includes(r.id) ? 'checkbox-marked' : 'checkbox-blank-outline'} size={22} color={selected.includes(r.id) ? c.accent : c.ink3} />
                <View style={{ flex: 1 }}>
                  <Txt variant="headline" numberOfLines={1}>{r.title}</Txt>
                  <Txt variant="caption" color={c.ink3}>{CATEGORY_META[r.category]?.label} · {formatDate(r.eventDate)}</Txt>
                </View>
              </Tappable>
            ))}
          </Group>
        )}
      </Section>

      <Section title="How long">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {DURATIONS.map((d) => (
            <Chip key={d.minutes} label={d.label} selected={minutes === d.minutes} onPress={() => setMinutes(d.minutes)} />
          ))}
        </View>
        <Txt variant="caption" color={c.ink3}>The link stops working after this. You can turn it off sooner.</Txt>
      </Section>

      <Field label="Who is it for?" value={label} onChangeText={setLabel} placeholder="Optional, e.g. Dr. Santos" maxLength={80} />
      <Button label="Create link and QR code" icon="qrcode" onPress={create} loading={busy} />
    </Screen>
  );
}
