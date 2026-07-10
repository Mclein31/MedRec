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

type MedicalRecord = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  date: string;
};

export default function RecordsScreen() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

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
      setSummary(data.summary);
    } catch (err: any) {
      Alert.alert('AI summary failed', err.message);
    } finally {
      setSummarizing(false);
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Records</Text>
          <Text style={styles.headerSub}>{records.length} record{records.length !== 1 ? 's' : ''}</Text>
        </View>
        <Pressable onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color={GREEN_MID} />
        </Pressable>
      </View>

      {/* AI Summary button */}
      <Pressable
        onPress={handleSummarize}
        disabled={summarizing}
        style={({ pressed }) => [styles.summaryBtn, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="sparkles-outline" size={18} color="#fff" />
        <Text style={styles.summaryBtnText}>
          {summarizing ? 'Generating summary...' : 'Generate AI Health Summary'}
        </Text>
      </Pressable>

      {/* Summary output */}
      {summary && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryCardHeader}>
            <Ionicons name="sparkles" size={14} color={GREEN} />
            <Text style={styles.summaryCardLabel}>AI Summary</Text>
          </View>
          <Text style={styles.summaryCardText}>{summary}</Text>
        </View>
      )}

      {/* Records list */}
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color={GREEN_LIGHT} />
            <Text style={styles.emptyTitle}>No records yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to add your first record</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/record/${item.id}`)}
            style={({ pressed }) => [styles.recordCard, pressed && { opacity: 0.75 }]}
          >
            <View style={styles.recordIcon}>
              <Ionicons
                name={TYPE_ICONS[item.type] || 'document-outline'}
                size={20}
                color={GREEN}
              />
            </View>
            <View style={styles.recordContent}>
              <Text style={styles.recordTitle}>{item.title}</Text>
              <Text style={styles.recordMeta}>
                {item.type.charAt(0).toUpperCase() + item.type.slice(1)} · {item.date}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={GREEN_LIGHT} />
          </Pressable>
        )}
      />

      {/* FAB */}
      <Pressable
        onPress={() => router.push('/record/add')}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: GREEN_DARK,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: GREEN_MID,
    marginTop: 2,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: GREEN,
    marginHorizontal: 20,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
  },
  summaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  summaryCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
    padding: 14,
    gap: 6,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: GREEN,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryCardText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 10,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
    padding: 14,
    gap: 12,
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordContent: {
    flex: 1,
    gap: 3,
  },
  recordTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: GREEN_DARK,
  },
  recordMeta: {
    fontSize: 12,
    color: GREEN_MID,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: GREEN_DARK,
  },
  emptySubtitle: {
    fontSize: 14,
    color: GREEN_MID,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
