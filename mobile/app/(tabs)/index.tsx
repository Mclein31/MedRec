import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { StatusBar } from 'expo-status-bar'

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
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);

  const router = useRouter();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();

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
    setSelectedIds(prev => {
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
      router.push({ pathname: '/(tabs)/share', params: { pendingToken: data.token, pendingExpiry: data.expiresAt } });
      cancelSelection();
    } catch (err: any) {
      Alert.alert('Failed to create share', err.message);
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />
        }
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
              <View>
                <Text style={styles.headerTitle}>My Records</Text>
                <Text style={styles.headerSub}>
                  {records.length} record{records.length !== 1 ? 's' : ''}
                </Text>
              </View>
              {selectionMode ? (
                <Pressable onPress={cancelSelection} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
              ) : (
                <Pressable onPress={logout} style={styles.logoutBtn}>
                  <Ionicons name="log-out-outline" size={20} color={GREEN_MID} />
                </Pressable>
              )}
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
                <Pressable onPress={() => setSelectedIds(new Set(records.map(r => r.id)))}>
                  <Text style={styles.selectAllText}>Select all</Text>
                </Pressable>
              </View>
            )}

            {/* AI Summary Banner — hidden in selection mode */}
            {!selectionMode && (
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
            )}

            {/* Section header */}
            {records.length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Records</Text>
                {!selectionMode && (
                  <View style={styles.sortBtn}>
                    <Ionicons name="swap-vertical-outline" size={14} color={GREEN_MID} />
                    <Text style={styles.sortBtnText}>Most Recent</Text>
                    <Ionicons name="chevron-down" size={13} color={GREEN_MID} />
                  </View>
                )}
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
                <View style={styles.recordRow}>
                  <View style={styles.recordIconBox}>
                    <Ionicons
                      name={TYPE_ICONS[item.type] || 'document-outline'}
                      size={24}
                      color={isSelected ? '#fff' : GREEN}
                    />
                  </View>
                  <View style={styles.recordContent}>
                    <Text style={styles.recordTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.recordDateRow}>
                      <Ionicons name="calendar-outline" size={12} color={GREEN_MID} />
                      <Text style={styles.recordDateText}>{formatDate(item.date)}</Text>
                    </View>
                  </View>
                  {!selectionMode && (
                    <View style={styles.chevronCircle}>
                      <Ionicons name="chevron-forward" size={14} color={GREEN} />
                    </View>
                  )}
                </View>

                <View style={styles.recordFooter}>
                  <Ionicons name="folder-open-outline" size={12} color="#aaa" />
                  <Text style={styles.recordFooterText}>
                    Added {item.created_at ? timeAgo(item.created_at) : timeAgo(item.date)}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      {/* FAB — Share Selected or Add */}
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

      {sharing && (
        <View style={styles.sharingOverlay}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.sharingText}>Creating share QR...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  listContainer: { paddingBottom: 140 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 30, fontWeight: '800', color: GREEN_DARK, letterSpacing: -0.5 },
  headerSub: { fontSize: 14, color: GREEN_MID, marginTop: 2 },
  logoutBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#fff', borderWidth: 1, borderColor: GREEN_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtn: {
    paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 20, borderWidth: 1, borderColor: GREEN_LIGHT,
    backgroundColor: '#fff',
  },
  cancelBtnText: { fontSize: 14, color: GREEN_MID, fontWeight: '500' },
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
  selectionBannerText: { flex: 1, fontSize: 13, color: GREEN_DARK, fontWeight: '500' },
  selectAllText: { fontSize: 13, color: GREEN, fontWeight: '600' },
  aiBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: GREEN,
    marginHorizontal: 20, borderRadius: 16, padding: 16, gap: 14, marginBottom: 24,
  },
  aiIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  aiTextBox: { flex: 1, gap: 3 },
  aiTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  aiSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 16 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: GREEN_DARK },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: GREEN_LIGHT, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#fff',
  },
  sortBtnText: { fontSize: 12, color: GREEN_MID, fontWeight: '500' },
  recordCard: {
    backgroundColor: '#fff', borderRadius: 16,
    marginHorizontal: 20, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, overflow: 'hidden',
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
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: GREEN_LIGHT,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  typeBadge: {
    alignSelf: 'flex-start', backgroundColor: '#e8f5e9',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
    margin: 14, marginBottom: 4,
  },
  typeBadgeText: { fontSize: 12, fontWeight: '600', color: GREEN },
  recordBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recordIconBox: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: BG, alignItems: 'center', justifyContent: 'center',
  },
  recordContent: { flex: 1, gap: 6 },
  recordTitle: { fontSize: 16, fontWeight: '700', color: GREEN_DARK, lineHeight: 22 },
  recordDateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  recordDateText: { fontSize: 12, color: GREEN_MID },
  chevronCircle: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1, borderColor: GREEN_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  recordFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f5f5f5',
  },
  recordFooterText: { fontSize: 12, color: '#aaa' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: GREEN_DARK },
  emptySubtitle: { fontSize: 14, color: GREEN_MID, textAlign: 'center' },
  fab: {
    position: 'absolute', right: 20, bottom: 120,
    width: 60, height: 60, borderRadius: 30, backgroundColor: GREEN,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: GREEN_DARK, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  shareSelectedBtn: {
    position: 'absolute', bottom: 120, left: 20, right: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: GREEN, borderRadius: 16, paddingVertical: 16,
    shadowColor: GREEN_DARK, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  shareSelectedBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  sharingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  sharingText: { marginTop: 12, fontSize: 15, fontWeight: '600', color: '#fff' },
});
