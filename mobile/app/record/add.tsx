import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';

const GREEN = '#1D9E75';
const GREEN_DARK = '#085041';
const GREEN_MID = '#0F6E56';
const GREEN_LIGHT = '#9FE1CB';
const BG = '#f0f7f4';

const RECORD_TYPES = [
  { value: 'consultation', label: 'Consultation', icon: 'people-outline' },
  { value: 'diagnosis', label: 'Diagnosis', icon: 'medkit-outline' },
  { value: 'lab', label: 'Lab', icon: 'flask-outline' },
  { value: 'prescription', label: 'Prescription', icon: 'document-text-outline' },
  { value: 'medication', label: 'Medication', icon: 'medical-outline' },
  { value: 'appointment', label: 'Appointment', icon: 'calendar-outline' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
] as const;

export default function AddRecordScreen() {
  const [type, setType] = useState('consultation');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a title for this record.');
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
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type picker */}
        <Text style={styles.sectionLabel}>Type</Text>
        <View style={styles.typeGrid}>
          {RECORD_TYPES.map((t) => {
            const active = type === t.value;
            return (
              <Pressable
                key={t.value}
                onPress={() => setType(t.value)}
                style={[styles.typeChip, active && styles.typeChipActive]}
              >
                <Ionicons
                  name={t.icon as any}
                  size={16}
                  color={active ? '#fff' : GREEN_MID}
                />
                <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Title */}
        <Text style={styles.sectionLabel}>Title</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Blood test results"
            placeholderTextColor="#aaa"
          />
        </View>

        {/* Description */}
        <Text style={styles.sectionLabel}>Description</Text>
        <View style={[styles.inputRow, styles.textAreaRow]}>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Optional notes or details"
            placeholderTextColor="#aaa"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Date */}
        <Text style={styles.sectionLabel}>Date</Text>
        <View style={styles.inputRow}>
          <Ionicons name="calendar-outline" size={18} color={GREEN} />
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#aaa"
          />
        </View>

        {/* Save */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="checkmark-outline" size={18} color="#fff" />
          <Text style={styles.saveBtnText}>
            {saving ? 'Saving...' : 'Save Record'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    padding: 20,
    paddingTop: 24,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: GREEN_MID,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 2,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
  },
  typeChipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: GREEN_MID,
  },
  typeChipTextActive: {
    color: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  textAreaRow: {
    alignItems: 'flex-start',
    paddingTop: 13,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#222',
    padding: 0,
  },
  textArea: {
    minHeight: 90,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 12,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
