import { View, Text, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../lib/api';

type MedicalRecord = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  date: string;
};

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    api
      .getRecord(id)
      .then((data) => setRecord(data.record))
      .finally(() => setLoading(false));
  }, [id]);

  const handleExplain = async () => {
    if (!record) return;
    setExplaining(true);
    try {
      const data = await api.explain(`${record.title}: ${record.description || ''}`);
      setExplanation(data.explanation);
    } catch (err: any) {
      Alert.alert('Explain failed', err.message);
    } finally {
      setExplaining(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete record?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteRecord(id);
            router.back();
          } catch (err: any) {
            Alert.alert('Delete failed', err.message);
          }
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;
  if (!record) return <Text style={{ margin: 20 }}>Record not found.</Text>;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{record.title}</Text>
      <Text style={{ color: '#888' }}>
        {record.type} · {record.date}
      </Text>
      {record.description && <Text style={{ marginTop: 8 }}>{record.description}</Text>}

      <Pressable
        onPress={handleExplain}
        disabled={explaining}
        style={{ backgroundColor: '#34C759', padding: 12, borderRadius: 8, marginTop: 16 }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {explaining ? 'Explaining...' : 'Explain This Record'}
        </Text>
      </Pressable>

      {explanation && (
        <View style={{ backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8 }}>
          <Text>{explanation}</Text>
        </View>
      )}

      <Pressable
        onPress={handleDelete}
        style={{ backgroundColor: '#FF3B30', padding: 12, borderRadius: 8, marginTop: 16 }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          Delete Record
        </Text>
      </Pressable>
    </ScrollView>
  );
}
