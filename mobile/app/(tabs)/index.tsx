import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

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

  // useFocusEffect re-fetches every time this tab becomes active again -
  // e.g. after adding a record and navigating back here.
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: 'bold' }}>My Records</Text>
        <Pressable onPress={logout}>
          <Text style={{ color: '#FF3B30' }}>Log Out</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={handleSummarize}
        disabled={summarizing}
        style={{ backgroundColor: '#34C759', padding: 12, borderRadius: 8, marginBottom: 12 }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {summarizing ? 'Summarizing...' : 'Generate AI Health Summary'}
        </Text>
      </Pressable>

      {summary && (
        <View style={{ backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          <Text>{summary}</Text>
        </View>
      )}

      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 40, color: '#888' }}>
            No records yet. Tap + to add one.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/record/${item.id}`)}
            style={{ padding: 14, borderBottomWidth: 1, borderColor: '#eee' }}
          >
            <Text style={{ fontWeight: 'bold' }}>{item.title}</Text>
            <Text style={{ color: '#888' }}>
              {item.type} · {item.date}
            </Text>
          </Pressable>
        )}
      />

      <Pressable
        onPress={() => router.push('/record/add')}
        style={{
          position: 'absolute',
          right: 20,
          bottom: 20,
          backgroundColor: '#007AFF',
          width: 56,
          height: 56,
          borderRadius: 28,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'white', fontSize: 28 }}>+</Text>
      </Pressable>
    </View>
  );
}
