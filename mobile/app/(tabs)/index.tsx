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
const GREEN_MID = '#159A83';
const GREEN_LIGHT = '#DDF5EE';
const BG = '#F4FAF9';
const INK = '#12343B';
const MUTED = '#64748B';

const TYPE_COLORS: Record<string, string> = {
  consultation: '#159A83',
  lab: '#1976D2',
  appointment: '#3BA7A0',
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
              <Text style={styles.headerTitle}>Hello, McLein 👋</Text>
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
                    <Image source={TYPE_ASSETS[item.type] || require('../../assets/icons/folder.png')} style={[styles.recordAsset, { tintColor: isSelected ? '#fff' : (TYPE_COLORS[item.type] || GREEN) }]} />
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

      {/* FAB — Share Selected while in selection mode, otherwise Add */}
      {selectionMode ? (
        <Pressable
          onPress={handleShareSelected}
          disabled={sharing || selectedIds.size === 0}
          style={[
            styles.shareSelectedBtn,
            (sharing || selectedIds.size === 0) && { opacity: 0.5 },
          ]}
        >
          {sharing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="qr-code-outline" size={20} color="#fff" />
              <Text style={styles.shareSelectedBtnText}>
                Share {selectedIds.size > 0 ? `${selectedIds.size} ` : ''}Selected
              </Text>
            </>
          )}
        </Pressable>
      ) : (
        <Pressable
          onPress={() => router.push('/record/add')}
          style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="add" size={30} color="#fff" />
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

  header: {
    paddingHorizontal: 28,
    paddingBottom: 12,
  },

  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 17,
  },

  bell: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  toolbarIcon: { width: 24, height: 24, resizeMode: 'contain' },

  headerTitle: {
    fontSize: 24,
    fontFamily: 'LexendDeca-Bold',
    color: INK,
  },

  headerSub: {
    fontSize: 9,
    color: MUTED,
    marginTop: 1,
  },

  notificationDot: {
    position: 'absolute',
    right: 1,
    top: 1,
    width: 6,
    height: 6,
    borderRadius: 3,
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
    color: GREEN_MID,
    fontWeight: '500',
  },

  selectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  selectionBannerText: {
    flex: 1,
    fontSize: 13,
    color: GREEN_DARK,
    fontWeight: '500',
  },

  selectAllText: {
    fontSize: 13,
    color: GREEN,
    fontWeight: '600',
  },

  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976D2',
    marginHorizontal: 28,
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 15,
  },

  aiIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiAsset: { width: 22, height: 22, resizeMode: 'contain', tintColor: '#fff' },

  aiTextBox: {
    flex: 1,
    gap: 3,
  },

  aiTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },

  aiSubtitle: {
    fontSize: 7.5,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 15,
  },

  recordsHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 13,
    fontFamily: 'LexendDeca-Bold',
    color: INK,
  },

  recordCount: { fontSize: 8, color: GREEN, marginTop: 1 },

  searchBox: { flexDirection: 'row', alignItems: 'center', width: 101, height: 25, borderRadius: 14, backgroundColor: '#fff', paddingHorizontal: 10 },
  searchInput: { flex: 1, padding: 0, fontSize: 8, color: INK },
  searchIcon: { width: 13, height: 13, resizeMode: 'contain' },
  chipRow: { paddingHorizontal: 28, paddingBottom: 8, gap: 7 },
  chip: { height: 23, borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D9E7E4' },
  chipActive: { backgroundColor: '#DDF5EE', borderColor: '#DDF5EE' },
  chipText: { fontSize: 8, color: MUTED },
  chipTextActive: { color: GREEN, fontWeight: '700' },

  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#fff',
  },

  sortBtnText: {
    fontSize: 10,
    color: GREEN_MID,
    fontWeight: '500',
  },

  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 9,
    marginHorizontal: 28,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 6.5,
    elevation: 2,
    overflow: 'hidden',
  },

  recordCardSelected: {
    borderWidth: 2,
    borderColor: GREEN,
  },

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

  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginTop: 8,
    marginLeft: 10,
    marginBottom: 2,
  },

  typeBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: GREEN,
  },

  recordBody: {
    paddingHorizontal: 10,
    paddingBottom: 8,
    gap: 5,
  },

  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  recordIconBox: {
    width: 37,
    height: 37,
    borderRadius: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },

  recordAsset: { width: 24, height: 24, resizeMode: 'contain' },

  recordContent: {
    flex: 1,
    gap: 5,
  },

  recordTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: INK,
    lineHeight: 14,
  },

  recordDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateAsset: { width: 11, height: 11, resizeMode: 'contain' },

  recordDateText: {
    fontSize: 8,
    color: GREEN_MID,
  },

  chevronCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  recordFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  footerAsset: { width: 11, height: 11, resizeMode: 'contain' },

  recordFooterText: {
    fontSize: 8,
    color: '#aaa',
  },

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
    color: GREEN_MID,
    textAlign: 'center',
  },

  modalOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 10,
  },

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
    backgroundColor: '#f0f9f5',
  },

  sortOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sortOptionIconActive: {
    backgroundColor: '#e8f5f0',
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

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 120,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GREEN_DARK,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },

  shareSelectedBtn: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: GREEN_DARK,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },

  shareSelectedBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
