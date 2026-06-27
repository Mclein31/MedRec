import { View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { api } from '../../lib/api';

const RECORD_TYPES = [
  'consultation',
  'diagnosis',
  'lab',
  'prescription',
  'medication',
  'appointment',
  'other',
];

export default function AddRecordScreen() {
  const [type, setType] = useState(RECORD_TYPES[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title required');
      return;
    }
    setSaving(true);
    try {
      await api.addRecord({ type, title, description, date });
      router.back();
    } catch (err: any) {
      Alert.alert('Failed to save', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={{ fontWeight: 'bold' }}>Type</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {RECORD_TYPES.map((t) => (
          <Pressable
            key={t}
            onPress={() => setType(t)}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 16,
              backgroundColor: type === t ? '#007AFF' : '#eee',
            }}
          >
            <Text style={{ color: type === t ? 'white' : '#333' }}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ fontWeight: 'bold' }}>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={styles.input}
        placeholder="e.g. Blood test"
      />

      <Text style={{ fontWeight: 'bold' }}>Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        style={[styles.input, { height: 80 }]}
        multiline
        placeholder="Optional details"
      />

      <Text style={{ fontWeight: 'bold' }}>Date (YYYY-MM-DD)</Text>
      <TextInput value={date} onChangeText={setDate} style={styles.input} placeholder="2026-06-24" />

      <Pressable
        onPress={handleSave}
        disabled={saving}
        style={{ backgroundColor: '#007AFF', padding: 14, borderRadius: 8, marginTop: 12 }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {saving ? 'Saving...' : 'Save Record'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = {
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
};
