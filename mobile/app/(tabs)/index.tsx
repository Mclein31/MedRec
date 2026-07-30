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
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const GREEN = '#1D9E75';
const GREEN_DARK = '#085041';
const GREEN_MID = '#0F6E56';
const GREEN_LIGHT = '#9FE1CB';
const BG = '#f0f7f4';

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  consultation: 'people-outline',
  diagnosis: 'medkit-outline',
  lab: 'flask-outline',
  prescription: 'document-text-outline',
  medication: 'medical-outline',
  appointment: 'calendar-outline',
  other: 'ellipsis-horizontal-outline',
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
  const [showSortModal, setShowSortModal] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const sheetAnim = useState(new Animated.Value(0))[0];

  const router = useRouter();
  const { logout } = useAuth();

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

  const sortedRecords = [...records].sort((a, b) => {
    if (sortMode === 'recent') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortMode === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (TYPE_FILTERS.includes(sortMode)) {
      if (a.type === sortMode && b.type !== sortMode) return -1;
      if (b.type === sortMode && a.type !== sortMode) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    return 0;
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
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>My Records</Text>
                <Text style={styles.headerSub}>
                  {records.length} record{records.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <Pressable onPress={logout} style={styles.logoutBtn}>
                <Ionicons name="log-out-outline" size={20} color={GREEN_MID} />
              </Pressable>
            </View>

            {/* AI Summary Banner */}
            <Pressable
              onPress={handleSummarize}
              disabled={summarizing}
              style={({ pressed }) => [styles.aiBanner, pressed && { opacity: 0.88 }]}
            >
              <View style={styles.aiIconBox}>
                <Ionicons name="sparkles" size={22} color="#fff" />
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

            {/* Section header */}
            {records.length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Records</Text>
                <Pressable onPress={openSort} style={({ pressed }) => [styles.sortBtn, pressed && { opacity: 0.7 }]}>
                  <Ionicons name="swap-vertical-outline" size={14} color={GREEN_MID} />
                  <Text style={styles.sortBtnText}>{sortLabel[sortMode]}</Text>
                  <Ionicons name="chevron-down" size={13} color={GREEN_MID} />
                </Pressable>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={52} color={GREEN_LIGHT} />
            <Text style={styles.emptyTitle}>No records yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to add your first record</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/record/${item.id}`)}
            style={({ pressed }) => [styles.recordCard, pressed && { opacity: 0.78 }]}
          >
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
                  <Ionicons
                    name={TYPE_ICONS[item.type] || 'document-outline'}
                    size={24}
                    color={GREEN}
                  />
                </View>
                <View style={styles.recordContent}>
                  <Text style={styles.recordTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.recordDateRow}>
                    <Ionicons name="calendar-outline" size={12} color={GREEN_MID} />
                    <Text style={styles.recordDateText}>{formatDate(item.date)}</Text>
                  </View>
                </View>
                <View style={styles.chevronCircle}>
                  <Ionicons name="chevron-forward" size={14} color={GREEN} />
                </View>
              </View>

              {/* Added ago footer */}
              <View style={styles.recordFooter}>
                <Ionicons name="folder-open-outline" size={12} color="#aaa" />
                <Text style={styles.recordFooterText}>
                  Added {item.created_at ? timeAgo(item.created_at) : timeAgo(item.date)}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
      />

      {/* FAB */}
      <Pressable
        onPress={() => router.push('/record/add')}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>

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
    paddingBottom: 120,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 20,
  },

  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: GREEN_DARK,
    letterSpacing: -0.5,
  },

  headerSub: {
    fontSize: 14,
    color: GREEN_MID,
    marginTop: 2,
  },

  logoutBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GREEN,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    marginBottom: 24,
  },

  aiIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiTextBox: {
    flex: 1,
    gap: 3,
  },

  aiTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  aiSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 15,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: GREEN_DARK,
  },

  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#fff',
  },

  sortBtnText: {
    fontSize: 12,
    color: GREEN_MID,
    fontWeight: '500',
  },

  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },

  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    margin: 14,
    marginBottom: 4,
  },

  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: GREEN,
  },

  recordBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },

  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  recordIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },

  recordContent: {
    flex: 1,
    gap: 5,
  },

  recordTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: GREEN_DARK,
    lineHeight: 22,
  },

  recordDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  recordDateText: {
    fontSize: 12,
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

  recordFooterText: {
    fontSize: 12,
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
});