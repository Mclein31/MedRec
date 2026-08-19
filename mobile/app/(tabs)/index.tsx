import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
  Animated,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const GREEN = '#159A83';
const GREEN_DARK = '#12343B';
const GREEN_LIGHT = '#DDF5EE';
const BG = '#F4FAF9';
const INK = '#12343B';
const MUTED = '#64748B'
const BORDER = '#E5F0EE';;

const TYPE_COLORS: Record<string, string> = {
  consultation: '#159A83',
  lab: '#159A83',
  appointment: '#159A83',
  diagnosis: '#159A83',
  prescription: '#159A83',
  medication: '#159A83',
  other: '#64748B',
};

const TYPE_ASSETS: Record<string, number> = {
  consultation: require('../../assets/icons/consultation.png'),
  diagnosis: require('../../assets/icons/diagnosis.png'),
  lab: require('../../assets/icons/lab.png'),
  prescription: require('../../assets/icons/prescription.png'),
  medication: require('../../assets/icons/prescription.png'),
  appointment: require('../../assets/icons/calendar.png'),
  other: require('../../assets/icons/folder.png'),
};

function timeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 24) return 'Today';
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

type MedicalRecord = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  date: string;
  created_at?: string;
};

export default function RecordsScreen() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [sortMode, setSortMode] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSortModal, setShowSortModal] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const sheetAnim = useState(new Animated.Value(0))[0];

  // Selection mode: long-press a record to enter it, then pick records
  // to share via QR without sharing everything.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);

  const router = useRouter();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();

  const handleMenuPress = () => {
    Alert.alert('Account', 'Would you like to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  };

  const loadRecords = async () => {
    try {
      const data = await api.getRecords();
      setRecords(data.records);
    } catch (err: any) {
      Alert.alert('Error loading records', err.message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadRecords().finally(() => setLoading(false));
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const data = await api.summarize();
      Alert.alert('AI Health Summary', data.summary);
    } catch (err: any) {
      Alert.alert('AI summary failed', err.message);
    } finally {
      setSummarizing(false);
    }
  };

  const enterSelectionMode = (id: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleShareSelected = async () => {
    if (selectedIds.size === 0) {
      Alert.alert('No records selected', 'Select at least one record to share.');
      return;
    }
    setSharing(true);
    try {
      const data = await api.createShare(60, Array.from(selectedIds));
      cancelSelection();
      // share.tsx reads these params on focus and shows the QR immediately
      router.push({
        pathname: '/(tabs)/share',
        params: { pendingToken: data.token, pendingExpiry: data.expiresAt },
      });
    } catch (err: any) {
      Alert.alert('Failed to create share', err.message);
    } finally {
      setSharing(false);
    }
  };

  const openSort = () => {
    setOverlayVisible(true);
    setShowSortModal(true);
    Animated.spring(sheetAnim, { toValue: 1, useNativeDriver: true, bounciness: 0 }).start();
  };

  const closeSort = () => {
    Animated.timing(sheetAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
      setShowSortModal(false);
      setOverlayVisible(false);
    });
  };

  const sortLabel: Record<string, string> = {
    recent: 'Most Recent', oldest: 'Oldest', appointment: 'Appointments',
    lab: 'Labs', consultation: 'Consultations', diagnosis: 'Diagnoses',
    prescription: 'Prescriptions', medication: 'Medications', other: 'Others',
  };

  const SORT_OPTIONS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'recent', label: 'Most Recent', icon: 'time-outline' },
    { key: 'oldest', label: 'Oldest', icon: 'calendar-outline' },
    { key: 'appointment', label: 'Appointments', icon: 'calendar-number-outline' },
    { key: 'lab', label: 'Labs', icon: 'flask-outline' },
    { key: 'consultation', label: 'Consultations', icon: 'people-outline' },
    { key: 'diagnosis', label: 'Diagnoses', icon: 'medkit-outline' },
    { key: 'prescription', label: 'Prescriptions', icon: 'document-text-outline' },
    { key: 'medication', label: 'Medications', icon: 'medical-outline' },
    { key: 'other', label: 'Others', icon: 'ellipsis-horizontal-outline' },
  ];

  const TYPE_FILTERS = ['appointment', 'lab', 'consultation', 'diagnosis', 'prescription', 'medication', 'other'];

  // Filter down to just the selected type (if a type filter is active),
  // then sort what's left by date.
  const sortedRecords = [...records]
    .filter((r) => (TYPE_FILTERS.includes(sortMode) ? r.type === sortMode : true))
    .filter((r) => r.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortMode === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
      // 'recent' and every type filter fall back to newest-first ordering
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={sortedRecords}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />
        }
        ListHeaderComponent={
          <>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
              <View style={styles.toolbar}>
                {selectionMode ? <Pressable onPress={cancelSelection} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Cancel</Text></Pressable> : <Pressable onPress={handleMenuPress}><Image source={require('../../assets/icons/burger-menu.png')} style={styles.toolbarIcon} /></Pressable>}
                <View style={styles.bell}><Image source={require('../../assets/icons/notification-bell.png')} style={styles.toolbarIcon} /><View style={styles.notificationDot} /></View>
              </View>
              <Text style={styles.headerTitle}>Hello, McLein 👋🏼</Text>
              <Text style={styles.headerSub}>{"Here" + "'" + "s your health overview"}</Text>
            </View>

            {/* Selection mode banner */}
            {selectionMode && (
              <View style={styles.selectionBanner}>
                <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                <Text style={styles.selectionBannerText}>
                  {selectedIds.size === 0
                    ? 'Tap records to select'
                    : `${selectedIds.size} record${selectedIds.size !== 1 ? 's' : ''} selected`}
                </Text>
                <Pressable onPress={() => setSelectedIds(new Set(records.map((r) => r.id)))}>
                  <Text style={styles.selectAllText}>Select all</Text>
                </Pressable>
              </View>
            )}

            {/* AI Summary Banner — hidden while selecting */}
            {!selectionMode && (
              <Pressable
                onPress={handleSummarize}
                disabled={summarizing}
                style={({ pressed }) => [styles.aiBanner, pressed && { opacity: 0.88 }]}
              >
                <View style={styles.aiIconBox}>
                  <Image source={require('../../assets/icons/AI.png')} style={styles.aiAsset} />
                </View>
                <View style={styles.aiTextBox}>
                  <Text style={styles.aiTitle}>
                    {summarizing ? 'Generating summary...' : 'Generate AI Health Summary'}
                  </Text>
                  <Text style={styles.aiSubtitle}>
                    Get insights and a summary of your health records
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
              </Pressable>
            )}

              <View style={styles.recordsHeading}>
              <Pressable onLongPress={openSort}><Text style={styles.sectionTitle}>My Records</Text><Text style={styles.recordCount}>{records.length} Record{records.length === 1 ? '' : 's'}</Text></Pressable>
              <View style={styles.searchBox}><TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search" placeholderTextColor={MUTED} style={styles.searchInput} /><Image source={require('../../assets/icons/search.png')} style={styles.searchIcon} /></View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {[
                ['recent', 'All'], ['consultation', 'Consultation'], ['lab', 'Labs'], ['appointment', 'Appointment'], ['diagnosis', 'Diagnoses'], ['prescription', 'Prescriptions'],
              ].map(([key, label]) => <Pressable key={key} onPress={() => setSortMode(key)} style={[styles.chip, sortMode === key && styles.chipActive]}><Text style={[styles.chipText, sortMode === key && styles.chipTextActive]}>{label}</Text></Pressable>)}
            </ScrollView>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name={TYPE_FILTERS.includes(sortMode) ? 'filter-outline' : 'document-text-outline'}
              size={52}
              color={GREEN_LIGHT}
            />
            <Text style={styles.emptyTitle}>
              {TYPE_FILTERS.includes(sortMode) ? `No ${sortLabel[sortMode].toLowerCase()}` : 'No records yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {TYPE_FILTERS.includes(sortMode)
                ? 'Try a different filter or add a new record'
                : 'Tap + to add your first record'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = selectedIds.has(item.id);
          return (
            <Pressable
              onPress={() => {
                if (selectionMode) {
                  toggleSelection(item.id);
                } else {
                  router.push(`/record/${item.id}`);
                }
              }}
              onLongPress={() => {
                if (!selectionMode) enterSelectionMode(item.id);
              }}
              style={({ pressed }) => [
                styles.recordCard,
                pressed && { opacity: 0.78 },
                isSelected && styles.recordCardSelected,
              ]}
            >
              {/* Selection checkbox */}
              {selectionMode && (
                <View style={styles.checkboxArea}>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </View>
              )}

              {/* Type badge */}
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Text>
              </View>

              <View style={styles.recordBody}>
                {/* Icon + content */}
                <View style={styles.recordRow}>
                  <View style={styles.recordIconBox}>
                    <Image source={TYPE_ASSETS[item.type] || require('../../assets/icons/folder.png')} style={[styles.recordAsset, { tintColor: TYPE_COLORS[item.type] || GREEN}]} />
                  </View>
                  <View style={styles.recordContent}>
                    <Text style={styles.recordTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.recordDateRow}>
                      <Image source={require('../../assets/icons/calendar.png')} style={styles.dateAsset} />
                      <Text style={styles.recordDateText}>{formatDate(item.date)}</Text>
                    </View>
                  </View>
                  {!selectionMode && (
                    <View style={styles.chevronCircle}>
                      <Ionicons name="chevron-forward" size={14} color={GREEN} />
                    </View>
                  )}
                </View>

                {/* Added ago footer */}
                <View style={styles.recordFooter}>
                  <Image source={require('../../assets/icons/open-folder.png')} style={styles.footerAsset} />
                  <Text style={styles.recordFooterText}>
                    Added {item.created_at ? timeAgo(item.created_at) : timeAgo(item.date)}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      {/* Floating Share Button */}
      {selectionMode && selectedIds.size > 0 && (
        <Pressable
          onPress={handleShareSelected}
          disabled={sharing}
          style={({ pressed }) => [
            styles.shareFloatingBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          {sharing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="share-outline" size={18} color="#fff" />
              <Text style={styles.shareFloatingText}>
                Share
              </Text>
            </>
          )}
        </Pressable>
      )}

      {/* Dark overlay — appears instantly, separate from sheet animation */}
      {overlayVisible && (
        <Pressable
          style={styles.modalOverlay}
          onPress={closeSort}
        />
      )}

      {/* Sort bottom sheet — slides up independently */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="none"
        onRequestClose={closeSort}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={closeSort} />
          <Animated.View
            style={[
              styles.modalSheet,
              {
                transform: [{
                  translateY: sheetAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0],
                  }),
                }],
              },
            ]}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Filter & Sort Records</Text>
            <Text style={styles.modalSubtitle}>Choose how you want to view your records.</Text>
            {SORT_OPTIONS.map((opt) => {
              const isActive = sortMode === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => { setSortMode(opt.key); closeSort(); }}
                  style={[styles.sortOption, isActive && styles.sortOptionActive]}
                >
                  <View style={[styles.sortOptionIcon, isActive && styles.sortOptionIconActive]}>
                    <Ionicons name={opt.icon} size={18} color={isActive ? GREEN : '#888'} />
                  </View>
                  <Text style={[styles.sortOptionLabel, isActive && styles.sortOptionLabelActive]}>
                    {opt.label}
                  </Text>
                  {isActive && <Ionicons name="checkmark-circle" size={22} color={GREEN} />}
                </Pressable>
              );
            })}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({

  // ─────────────────────────────
  // ROOT
  // ─────────────────────────────

  root: {
    flex: 1,
    backgroundColor: BG,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },

  listContainer: {
    paddingBottom: 126,
  },


  // ─────────────────────────────
  // HEADER
  // ─────────────────────────────

  header: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },

  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },

  toolbarIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },

  bell: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 28,
    fontFamily: 'LexendDeca-Bold',
    color: INK,
  },

  headerSub: {
    fontSize: 12,
    color: MUTED,
    marginTop: 3,
    lineHeight: 12,
  },

  notificationDot: {
    position: 'absolute',
    right: 1,
    top: 1,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: GREEN,
  },

  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
    backgroundColor: '#fff',
  },

  cancelBtnText: {
    fontSize: 14,
    color: GREEN,
    fontWeight: '500',
  },


  // ─────────────────────────────
  // SELECTION BANNER
  // ─────────────────────────────

  selectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 24,
    marginBottom: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  selectionBannerText: {
    flex: 1,
    fontSize: 14,
    color: GREEN_DARK,
    fontWeight: '500',
  },

  selectAllText: {
    fontSize: 13,
    color: GREEN,
    fontWeight: '600',
  },


  // ─────────────────────────────
  // AI SUMMARY
  // ─────────────────────────────

  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976D2',
    marginHorizontal: 24,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 18,
  },

  aiIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiAsset: {
    width: 35,
    height: 35,
    resizeMode: 'contain',
    tintColor: '#fff',
  },

  aiTextBox: {
    flex: 1,
    gap: 4,
  },

  aiTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 0,
  },

  aiSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 10,
    marginTop: 0, 
  },


  // ─────────────────────────────
  // RECORD HEADER
  // ─────────────────────────────

  recordsHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontFamily: 'LexendDeca-Bold',
    color: INK,
  },

  recordCount: {
    fontSize: 12,
    color: GREEN,
    marginTop: 2,
  },


  // ─────────────────────────────
  // SEARCH
  // ─────────────────────────────

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },

  searchInput: {
    flex: 1,
    padding: 0,
    fontSize: 12,
    color: INK,
  },

  searchIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },

  // ─────────────────────────────
  // FILTER CHIPS
  // ─────────────────────────────

  chipRow: {
    paddingHorizontal: 24,
    paddingBottom: 14,
    gap: 8,
  },

  chip: {
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D9E7E4',
  },

  chipActive: {
    backgroundColor: GREEN_LIGHT,
    borderColor: GREEN_LIGHT,
  },

  chipText: {
    fontSize: 12,
    color: MUTED,
  },

  chipTextActive: {
    color: GREEN,
    fontWeight: '700',
  },


  // ─────────────────────────────
  // SORT BUTTON
  // ─────────────────────────────

  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#fff',
  },

  sortBtnText: {
    fontSize: 12,
    color: GREEN,
    fontWeight: '500',
  },


  // ─────────────────────────────
  // RECORD CARD
  // ─────────────────────────────

  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 24,
    marginBottom: 12,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,

    overflow: 'hidden',

    borderWidth: 1,
    borderColor: BORDER,
  },

  recordCardSelected: {
    borderWidth: 2,
    borderColor: GREEN,
  },


  // ─────────────────────────────
  // CHECKBOX
  // ─────────────────────────────

  checkboxArea: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: GREEN_LIGHT,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxSelected: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },


  // ─────────────────────────────
  // RECORD TYPE BADGE
  // ─────────────────────────────

  typeBadge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    marginLeft: 14,
    marginBottom: 4,
  },

  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: GREEN,
  },


  // ─────────────────────────────
  // RECORD BODY
  // ─────────────────────────────

  recordBody: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
  },

  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
  },

  recordIconBox: {
    width: 44,
    height: 44,
    paddingHorizontal: 35, 
    alignItems: 'center',
    justifyContent: 'center',
  },

  recordAsset: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },

  recordContent: {
    flex: 1,
    gap: 5,
  },

  recordTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: INK,
    lineHeight: 18,
  },

  recordDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  dateAsset: {
    width: 12,
    height: 12,
    resizeMode: 'contain',
  },

  recordDateText: {
    fontSize: 10,
    color: MUTED,
  },


  // ─────────────────────────────
  // RECORD CHEVRON
  // ─────────────────────────────

  chevronCircle: {
    width: 45,
    height: 45,
    borderRadius: 16,
    borderColor: GREEN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },


  // ─────────────────────────────
  // RECORD FOOTER
  // ─────────────────────────────

  recordFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },

  footerAsset: {
    width: 12,
    height: 12,
    resizeMode: 'contain',
  },

  recordFooterText: {
    fontSize: 10,
    color: '#999',
  },


  // ─────────────────────────────
  // EMPTY STATE
  // ─────────────────────────────

  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
    paddingHorizontal: 40,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: GREEN_DARK,
  },

  emptySubtitle: {
    fontSize: 14,
    color: GREEN,
    textAlign: 'center',
  },

  // ─────────────────────────────
  // MODAL OVERLAY
  // ─────────────────────────────

  modalOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 10,
  },

  // ─────────────────────────────
  // MODAL SHARE SELECTION
  // ─────────────────────────────
    shareFloatingBtn: {
    position: 'absolute',
    bottom: 90, // sits above your navbar
    alignSelf: 'center',

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 8,

    backgroundColor: GREEN,
    paddingHorizontal: 28,
    paddingVertical: 14,

    borderRadius: 30,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,

    zIndex: 20,
  },

  shareFloatingText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },


  // ─────────────────────────────
  // SORT BOTTOM SHEET
  // ─────────────────────────────

  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 48,
  },

  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },

  modalSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },


  // ─────────────────────────────
  // SORT OPTIONS
  // ─────────────────────────────

  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 2,
  },

  sortOptionActive: {
    backgroundColor: '#F0F9F5',
  },

  sortOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sortOptionIconActive: {
    backgroundColor: '#E8F5F0',
  },

  sortOptionLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },

  sortOptionLabelActive: {
    color: GREEN,
    fontWeight: '600',
  },
});