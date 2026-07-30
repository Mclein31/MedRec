import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
  Image,
} from 'react-native';
import { useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
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

type Screen = 'form' | 'camera' | 'preview';

export default function AddRecordScreen() {
  const [screen, setScreen] = useState<Screen>('form');
  const [type, setType] = useState('consultation');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

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

  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Camera access needed', 'Please allow camera access to scan documents.');
        return;
      }
    }
    setScreen('camera');
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: false });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
        setScreen('preview');
      }
    } catch (err) {
      Alert.alert('Failed to take photo', 'Please try again.');
    }
  };

  const handleUsePhoto = () => {
    //dpa tapos, need pa AI key
    Alert.alert(
      'Photo captured',
      'AI document scanning will be available once OpenAI billing is set up. You can fill in the fields manually for now.',
      [{ text: 'Fill in manually', onPress: () => setScreen('form') }]
    );
  };

  const handleRetake = () => {
    setPhotoUri(null);
    setScreen('camera');
  };

  // ─── Camera screen ────────────────────────────────────────────────────────
  if (screen === 'camera') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
          {/* Viewfinder overlay */}
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraHint}>
              Point at a document — prescription, lab result, etc.
            </Text>
            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <View style={styles.cameraActions}>
              <Pressable onPress={() => setScreen('form')} style={styles.cameraCancel}>
                <Text style={styles.cameraCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={takePicture} style={styles.captureBtn}>
                <View style={styles.captureInner} />
              </Pressable>
              <View style={{ width: 80 }} />
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  // ─── Preview screen ───────────────────────────────────────────────────────
  if (screen === 'preview' && photoUri) {
    return (
      <View style={styles.previewRoot}>
        <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="contain" />
        <View style={styles.previewActions}>
          <Text style={styles.previewLabel}>Use this photo?</Text>
          <Text style={styles.previewSub}>
            AI will extract the record details automatically once billing is enabled.
          </Text>
          <Pressable
            onPress={handleUsePhoto}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="checkmark-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Use Photo</Text>
          </Pressable>
          <Pressable
            onPress={handleRetake}
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="camera-outline" size={18} color={GREEN_MID} />
            <Text style={styles.secondaryBtnText}>Retake</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── Form screen ──────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Scan document button */}
        <Pressable
          onPress={openCamera}
          style={({ pressed }) => [styles.scanBtn, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.scanBtnIcon}>
            <Ionicons name="camera-outline" size={22} color={GREEN} />
          </View>
          <View style={styles.scanBtnText}>
            <Text style={styles.scanBtnTitle}>Scan Document</Text>
            <Text style={styles.scanBtnSub}>Take a photo to auto-fill this form</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={GREEN_LIGHT} />
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or fill in manually</Text>
          <View style={styles.dividerLine} />
        </View>

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
                  size={14}
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
          style={({ pressed }) => [styles.primaryBtn, { marginTop: 12 }, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="checkmark-outline" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>
            {saving ? 'Saving...' : 'Save Record'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const CORNER_SIZE = 22;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { padding: 20, paddingTop: 24, gap: 10 },

  // Scan button
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: GREEN_LIGHT,
    padding: 14, marginBottom: 4,
  },
  scanBtnIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: BG, alignItems: 'center', justifyContent: 'center',
  },
  scanBtnText: { flex: 1, gap: 2 },
  scanBtnTitle: { fontSize: 15, fontWeight: '600', color: GREEN_DARK },
  scanBtnSub: { fontSize: 12, color: GREEN_MID },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: GREEN_LIGHT },
  dividerText: { fontSize: 12, color: GREEN_MID },

  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: GREEN_MID,
    letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 8, marginBottom: 2,
  },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: GREEN_LIGHT,
  },
  typeChipActive: { backgroundColor: GREEN, borderColor: GREEN },
  typeChipText: { fontSize: 13, fontWeight: '500', color: GREEN_MID },
  typeChipTextActive: { color: '#fff' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: GREEN_LIGHT,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, gap: 10,
  },
  textAreaRow: { alignItems: 'flex-start', paddingTop: 13 },
  input: { flex: 1, fontSize: 15, color: '#222', padding: 0 },
  textArea: { minHeight: 90 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: GREEN, borderRadius: 12, paddingVertical: 16,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // Camera screen
  cameraOverlay: {
    flex: 1, alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 60,
  },
  cameraHint: {
    fontSize: 15, color: 'rgba(255,255,255,0.85)',
    textAlign: 'center', paddingHorizontal: 40, lineHeight: 20,
  },
  viewfinder: { width: 280, height: 380, position: 'relative' },
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: GREEN },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderBottomRightRadius: 4 },
  cameraActions: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', width: '100%', paddingHorizontal: 30,
  },
  cameraCancel: { width: 80, alignItems: 'flex-start' },
  cameraCancelText: { fontSize: 16, color: '#fff', fontWeight: '500' },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  captureInner: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff',
  },

  // Preview screen
  previewRoot: { flex: 1, backgroundColor: '#000' },
  previewImage: { flex: 1 },
  previewActions: {
    backgroundColor: '#fff', padding: 24, gap: 10,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  previewLabel: { fontSize: 18, fontWeight: '700', color: GREEN_DARK },
  previewSub: { fontSize: 13, color: '#888', lineHeight: 18, marginBottom: 4 },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1, borderColor: GREEN_LIGHT,
    borderRadius: 12, paddingVertical: 14,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '500', color: GREEN_MID },
});