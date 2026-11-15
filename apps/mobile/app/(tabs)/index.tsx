import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
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
import { possessive, useActivePerson } from '../../src/people';
import { GOALS, orderCategories, pinnedCategories } from '../../src/personal';
import { useCalmMotion, usePrefs } from '../../src/prefs';
import { ease, Rise } from '../../src/ui/motion';
import { PersonSwitcher } from '../../src/ui/PersonSwitcher';
import { RecordRow } from '../../src/ui/RecordRow';
import { Sheet } from '../../src/ui/Sheet';

const SHORTCUT_ROUTE = { remy: '/remy', share: '/(tabs)/share', medical: '/(tabs)/medical' } as const;

export default function Records() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  // Rows already shown once never replay their entrance when virtualization remounts them.
  const seen = useRef(new Set<string>());
  const filterKey = useRef('|');
  const calm = useCalmMotion();
  // Setup answers: the first two picked record types get their own tab, and the goal adds one shortcut.
  const { personal } = usePrefs();
  const PINNED = pinnedCategories(personal.categories, CATEGORIES);
  const shortcut = personal.goal ? GOALS[personal.goal].shortcut : null;
  const [more, setMore] = useState<{ cursor: string | null; loading: boolean; error: string | null }>({ cursor: null, loading: false, error: null });

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Everything on this screen belongs to the person being viewed (DD-55).
  const { personId, person } = useActivePerson();
  const summary = useLoad(() => api.summary(personId), [personId]);
  const list = useLoad(async () => {
    const page = await api.records({ q: debounced, category: category ?? undefined, personId });
    // A new filter is new content: rows it brings back may enter again. Focus reloads keep the record.
    const key = `${personId ?? 'me'}|${debounced}|${category ?? ''}`;
    if (key !== filterKey.current) {
      filterKey.current = key;
      seen.current.clear();
    }
    setMore({ cursor: page.nextCursor, loading: false, error: null });
    return page.records;
  }, [debounced, category, personId]);

  const loadMore = async () => {
    if (!more.cursor || more.loading) return;
    setMore((m) => ({ ...m, loading: true, error: null }));
    try {
      const page = await api.records({ q: debounced, category: category ?? undefined, cursor: more.cursor, personId });
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
  const title = debounced ? 'Search records' : category ? `${CATEGORY_META[category]?.label}.` : `${possessive(person)} records.`;
  const listLabel = debounced ? 'Results' : category ? `${CATEGORY_META[category]?.short ?? 'Record'} history` : 'Recently added';
  const shown = category ? counts?.counts[category] : counts?.total;

  const header = (
    <View style={{ gap: space.lg, paddingBottom: space.xs }}>
      <BrandHeader />
      <PersonSwitcher />
      {firstLoad && !list.error && !summary.error ? (
        <OpeningRecords />
      ) : empty && !list.error ? (
        <Rise from={6}>
          <FirstRecord goal={person ? null : personal.goal} person={person?.name.split(' ')[0]} />
        </Rise>
      ) : (
        <Rise from={6} style={{ gap: space.lg }}>
          <Txt variant="display" accessibilityRole="header">{title}</Txt>
          <SearchField value={query} onChangeText={setQuery} placeholder="Find a record by name or date" />
          <TextTabs
            active={category ?? 'all'}
            onSelect={(k) => (k === 'more' ? setPicker(true) : setCategory(k === 'all' ? null : k))}
            items={[
              { key: 'all', label: 'All' },
              ...PINNED.map((k) => ({ key: k, label: CATEGORY_META[k]!.label })),
              { key: 'more', label: otherSelected ? CATEGORY_META[otherSelected]!.label : 'More', selected: !!otherSelected },
            ]}
          />
          {!filtering && (
            <>
              {shortcut && (
                <>
                  <Tappable onPress={() => router.push(SHORTCUT_ROUTE[shortcut.to])} accessibilityLabel={`${shortcut.title}, ${shortcut.subtitle}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt variant="headline">{shortcut.title}</Txt>
                      <Txt variant="caption" color={c.ink3}>{shortcut.subtitle}</Txt>
                    </View>
                    <Icon name="arrow-right" size={22} color={c.ink} />
                  </Tappable>
                  <Rule />
                </>
              )}
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
        </Rise>
      )}
      {(list.error || summary.error) && <Banner message={(list.error ?? summary.error)!} action={{ label: 'Retry', onPress: () => { void list.reload(); void summary.reload(); } }} />}
    </View>
  );

  const hideRows = firstLoad || empty;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Animated.FlatList<HealthRecord>
        data={hideRows ? [] : list.data ?? []}
        keyExtractor={(r) => r.id}
        renderItem={({ item, index }) => (
          <Enter index={index} animate={index < 6 && !seen.current.has(item.id)} onShown={() => seen.current.add(item.id)}>
            <RecordRow record={item} />
          </Enter>
        )}
        ItemSeparatorComponent={() => <Rule />}
        ListHeaderComponent={header}
        ListEmptyComponent={!hideRows && filtering && !list.loading && !list.error ? <NoMatch onClear={clear} /> : undefined}
        ListFooterComponent={
          more.cursor && !hideRows ? (
            <View style={{ paddingVertical: space.lg }}>
              {more.error ? <Banner message={more.error} action={{ label: 'Retry', onPress: loadMore }} /> : <ActivityIndicator color={c.ink3} />}
            </View>
          ) : list.data?.length ? (
            <Rule />
          ) : undefined
        }
        // Rows that stay glide into the space left by rows a filter removed (native only, DD-44).
        itemLayoutAnimation={Platform.OS !== 'web' && !calm ? LinearTransition.duration(220).easing(ease.inOut) : undefined}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={() => { void list.refresh(); void summary.refresh(); }} tintColor={c.ink3} />}
        contentContainerStyle={{ paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE, paddingHorizontal: GUTTER, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' }}
        keyboardShouldPersistTaps="handled"
      />
      <Sheet visible={picker} onClose={() => setPicker(false)} title="Record categories" message="Choose what you're looking for.">
        {[null, ...orderCategories(CATEGORIES, personal.categories)].map((k) => {
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
