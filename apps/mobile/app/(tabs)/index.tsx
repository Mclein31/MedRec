import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/auth';
import { formatDate } from '../../src/format';
import { api, type HealthRecord } from '../../src/lib/api';
import { messageFor } from '../../src/lib/errors';
import { CATEGORIES, CATEGORY_META, GUTTER, MAX_CONTENT_WIDTH, space, useColors } from '../../src/theme';
import { useLoad } from '../../src/useLoad';
import { Bell } from '../../src/ui/Bell';
import { Banner, Button, Icon, Tappable, Txt } from '../../src/ui/core';
import { Chip, Field } from '../../src/ui/form';
import { Empty, Enter, TAB_BAR_CLEARANCE } from '../../src/ui/layout';
import { RecordRow } from '../../src/ui/RecordRow';

export default function Records() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { state } = useAuth();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [more, setMore] = useState<{ cursor: string | null; loading: boolean; error: string | null }>({ cursor: null, loading: false, error: null });

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const summary = useLoad(() => Promise.all([api.summary(), api.activity()]), []);
  const list = useLoad(async () => {
    const page = await api.records({ q: debounced, category: category ?? undefined });
    setMore({ cursor: page.nextCursor, loading: false, error: null });
    return page.records;
  }, [debounced, category]);

  const loadMore = async () => {
    if (!more.cursor || more.loading) return;
    setMore((m) => ({ ...m, loading: true, error: null }));
    try {
      const page = await api.records({ q: debounced, category: category ?? undefined, cursor: more.cursor });
      list.setData((prev) => [...(prev ?? []), ...page.records.filter((r) => !prev?.some((p) => p.id === r.id))]);
      setMore({ cursor: page.nextCursor, loading: false, error: null });
    } catch (err) {
      setMore((m) => ({ ...m, loading: false, error: messageFor(err) }));
    }
  };

  const [counts, activity] = summary.data ?? [null, null];
  const firstName = state.status === 'signedIn' ? state.user.name.split(' ')[0] : '';
  const filtering = !!debounced || !!category;
  const chips = useMemo(() => CATEGORIES.filter((k) => (counts?.counts[k] ?? 0) > 0), [counts]);

  const header = (
    <View style={{ gap: space.xl, paddingBottom: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant="caption" color={c.ink3}>{firstName ? `Hi, ${firstName}` : 'Your vault'}</Txt>
          <Txt variant="display" accessibilityRole="header">Records</Txt>
          {counts && counts.total > 0 && (
            <Txt color={c.ink3}>
              {counts.total} {counts.total === 1 ? 'record' : 'records'}
              {counts.latest ? ` · latest ${formatDate(counts.latest)}` : ''}
            </Txt>
          )}
        </View>
        <Bell unread={activity?.unread ?? 0} />
      </View>

      {counts && counts.total > 0 && (
        <>
          <Field label="Search" value={query} onChangeText={setQuery} placeholder="Test, doctor, clinic or note" returnKeyType="search" autoCorrect={false} clearButtonMode="while-editing" />
          {chips.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} style={{ marginHorizontal: -GUTTER }}>
              <View style={{ width: GUTTER - space.sm }} />
              <Chip label="All" selected={!category} onPress={() => setCategory(null)} count={counts.total} />
              {chips.map((k) => (
                <Chip key={k} label={CATEGORY_META[k]!.label} selected={category === k} onPress={() => setCategory(category === k ? null : k)} count={counts.counts[k]} />
              ))}
              <View style={{ width: GUTTER - space.sm }} />
            </ScrollView>
          )}
          <Tappable onPress={() => router.push('/summary')} accessibilityLabel="Health summary" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs }}>
            <Icon name="text-box-search-outline" size={22} color={c.accent} />
            <View style={{ flex: 1 }}>
              <Txt variant="headline">Health summary</Txt>
              <Txt variant="caption" color={c.ink3}>A plain-language overview of your records</Txt>
            </View>
            <Icon name="chevron-right" color={c.ink3} />
          </Tappable>
        </>
      )}
      {(list.error || summary.error) && <Banner message={list.error ?? summary.error!} action={{ label: 'Retry', onPress: () => { void list.reload(); void summary.reload(); } }} />}
    </View>
  );

  const empty = list.loading ? (
    <ActivityIndicator style={{ marginTop: space.xxxl }} color={c.ink3} />
  ) : filtering ? (
    <Empty icon="magnify" title="No matching records" message="Try another word, or clear the category filter." />
  ) : list.error ? null : (
    <Empty
      icon="file-document-plus-outline"
      title="Add your first record"
      message="Photograph a lab result, prescription or discharge summary. MedRec reads it and fills in the details for you to check."
      action={<Button label="Scan a document" icon="camera-outline" onPress={() => router.push('/add')} style={{ alignSelf: 'stretch', marginTop: space.sm }} />}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList<HealthRecord>
        data={list.data ?? []}
        keyExtractor={(r) => r.id}
        renderItem={({ item, index }) => (
          <Enter index={index}>
            <RecordRow record={item} />
          </Enter>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: c.line, marginLeft: 52 }} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={
          more.cursor ? (
            <View style={{ paddingVertical: space.lg }}>
              {more.error ? <Banner message={more.error} action={{ label: 'Retry', onPress: loadMore }} /> : <ActivityIndicator color={c.ink3} />}
            </View>
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={() => { void list.refresh(); void summary.refresh(); }} tintColor={c.ink3} />}
        contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE, paddingHorizontal: GUTTER, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' }}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}
