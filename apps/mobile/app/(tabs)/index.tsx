import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type HealthRecord } from '../../src/lib/api';
import { messageFor } from '../../src/lib/errors';
import { FirstRecord, NoMatch, OpeningRecords } from '../../src/screens/RecordsStates';
import { CATEGORIES, CATEGORY_META, GUTTER, MAX_CONTENT_WIDTH, space, useColors } from '../../src/theme';
import { useLoad } from '../../src/useLoad';
import { BrandHeader } from '../../src/ui/brand';
import { Banner, Icon, Tappable, Txt } from '../../src/ui/core';
import { SearchField, TextTabs } from '../../src/ui/form';
import { Enter, Rule, TAB_BAR_CLEARANCE } from '../../src/ui/layout';
import { RecordRow } from '../../src/ui/RecordRow';
import { Sheet } from '../../src/ui/Sheet';

const PINNED = ['lab', 'prescription'];

export default function Records() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [more, setMore] = useState<{ cursor: string | null; loading: boolean; error: string | null }>({ cursor: null, loading: false, error: null });

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const summary = useLoad(() => api.summary(), []);
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

  const counts = summary.data;
  const firstLoad = (summary.loading && !counts) || (list.loading && !list.data);
  const empty = !!counts && counts.total === 0;
  const filtering = !!debounced || !!category;
  const otherSelected = category && !PINNED.includes(category) ? category : null;
  const clear = () => {
    setQuery('');
    setCategory(null);
  };
  const title = debounced ? 'Search records' : category ? `${CATEGORY_META[category]?.label}.` : 'Your records.';
  const listLabel = debounced ? 'Results' : category ? `${CATEGORY_META[category]?.short ?? 'Record'} history` : 'Recently added';
  const shown = category ? counts?.counts[category] : counts?.total;

  const header = (
    <View style={{ gap: space.lg, paddingBottom: space.xs }}>
      <BrandHeader />
      {firstLoad && !list.error && !summary.error ? (
        <OpeningRecords />
      ) : empty && !list.error ? (
        <FirstRecord />
      ) : (
        <>
          <Txt variant="display" accessibilityRole="header">{title}</Txt>
          <SearchField value={query} onChangeText={setQuery} placeholder="Find a record by name or date" />
          <TextTabs
            active={category ?? 'all'}
            onSelect={(k) => (k === 'more' ? setPicker(true) : setCategory(k === 'all' ? null : k))}
            items={[
              { key: 'all', label: 'All' },
              { key: 'lab', label: 'Lab results' },
              { key: 'prescription', label: 'Prescriptions' },
              { key: 'more', label: otherSelected ? CATEGORY_META[otherSelected]!.label : 'More', selected: !!otherSelected },
            ]}
          />
          {!filtering && (
            <>
              <Tappable onPress={() => router.push('/summary')} accessibilityLabel="Your health summary" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="headline">Your health summary</Txt>
                  <Txt variant="caption" color={c.ink3}>Review your saved health details</Txt>
                </View>
                <Icon name="arrow-right" size={22} color={c.ink} />
              </Tappable>
              <Rule />
            </>
          )}
          {!!list.data?.length && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Txt variant="headline" style={{ fontSize: 18 }} accessibilityRole="header">{listLabel}</Txt>
              {shown !== undefined && !debounced && <Txt variant="caption" color={c.ink3}>{shown} {shown === 1 ? 'record' : 'records'}</Txt>}
            </View>
          )}
        </>
      )}
      {(list.error || summary.error) && <Banner message={(list.error ?? summary.error)!} action={{ label: 'Retry', onPress: () => { void list.reload(); void summary.reload(); } }} />}
    </View>
  );

  const hideRows = firstLoad || empty;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList<HealthRecord>
        data={hideRows ? [] : list.data ?? []}
        keyExtractor={(r) => r.id}
        renderItem={({ item, index }) => (
          <Enter index={index}>
            <RecordRow record={item} />
          </Enter>
        )}
        ItemSeparatorComponent={() => <Rule />}
        ListHeaderComponent={header}
        ListEmptyComponent={!hideRows && filtering && !list.loading && !list.error ? <NoMatch onClear={clear} /> : null}
        ListFooterComponent={
          more.cursor && !hideRows ? (
            <View style={{ paddingVertical: space.lg }}>
              {more.error ? <Banner message={more.error} action={{ label: 'Retry', onPress: loadMore }} /> : <ActivityIndicator color={c.ink3} />}
            </View>
          ) : list.data?.length ? (
            <Rule />
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={() => { void list.refresh(); void summary.refresh(); }} tintColor={c.ink3} />}
        contentContainerStyle={{ paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE, paddingHorizontal: GUTTER, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' }}
        keyboardShouldPersistTaps="handled"
      />
      <Sheet visible={picker} onClose={() => setPicker(false)} title="Record categories" message="Choose what you're looking for.">
        {[null, ...CATEGORIES].map((k) => {
          const n = k ? counts?.counts[k] ?? 0 : counts?.total ?? 0;
          const on = category === k;
          return (
            <Tappable
              key={k ?? 'all'}
              onPress={() => {
                setCategory(k);
                setPicker(false);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${k ? CATEGORY_META[k]!.label : 'All records'}, ${n}`}
              style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: space.md }}
            >
              <Txt variant="headline" style={{ flex: 1 }}>{k ? CATEGORY_META[k]!.label : 'All records'}</Txt>
              <Txt variant="caption" color={c.ink3}>{n}</Txt>
              {on && <Icon name="check" size={20} color={c.ink} />}
            </Tappable>
          );
        })}
      </Sheet>
    </View>
  );
}
