import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
  Image,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { api } from '../../lib/api';

// Design Tokens matching MedRec standard palette
const TEAL = '#159A83';
const INK = '#12343B';
const GREEN_LIGHT = '#DDF5EE';
const BG = '#F4FAF9';
const BORDER = '#E5F0EE';
const MUTED = '#64748B';
const CARD_BG = '#FFFFFF';

const BLUE = '#1976D2';

const TYPE_ASSETS: Record<string, any> = {
  consultation: require('../../assets/icons/consultation.png'),
  diagnosis: require('../../assets/icons/diagnosis.png'),
  lab: require('../../assets/icons/lab.png'),
  prescription: require('../../assets/icons/prescription.png'),
  medication: require('../../assets/icons/prescription.png'),
  appointment: require('../../assets/icons/calendar.png'),
  other: require('../../assets/icons/folder.png'),
};

const RECORD_TYPES = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'diagnosis', label: 'Diagnosis' },
  { value: 'lab', label: 'Lab' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'medication', label: 'Medication' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'other', label: 'Other' },
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
  const insets = useSafeAreaInsets();

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
        Alert.alert(
          'Camera access needed',
          'Please allow camera access to scan documents.'
        );
        return;
      }
    }
    setScreen('camera');
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
        setScreen('preview');
      }
    } catch {
      Alert.alert('Failed to take photo', 'Please try again.');
    }
  };

  const handleUsePhoto = () => {
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
      <View style={styles.cameraRoot}>
        <StatusBar style="light" />
        <CameraView ref={cameraRef} style={styles.cameraView} facing="back">
          {/* Viewfinder overlay */}
          <View style={[styles.cameraOverlay, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.cameraHint}>
              Point at a document — prescription, lab result, or medical invoice
            </Text>
            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <View style={styles.cameraActions}>
              <Pressable
                onPress={() => setScreen('form')}
                style={styles.cameraCancel}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Cancel camera scan"
              >
                <Text style={styles.cameraCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={takePicture}
                style={({ pressed }) => [styles.captureBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Capture document photo"
              >
                <View style={styles.captureInner} />
              </Pressable>
              <View style={styles.cameraSpacer} />
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
        <StatusBar style="light" />
        <Image
          source={{ uri: photoUri }}
          style={styles.previewImage}
          resizeMode="contain"
        />
        <View
          style={[
            styles.previewActions,
            { paddingBottom: insets.bottom + 24 },
          ]}
        >
          <Text style={styles.previewLabel}>Use this document?</Text>
          <Text style={styles.previewSub}>
            AI will extract the record details automatically once billing is enabled.
          </Text>
          <Pressable
            onPress={handleUsePhoto}
            style={({ pressed }) => [
              styles.previewPrimaryBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Use captured photo"
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.previewPrimaryBtnText}>Use Photo</Text>
          </Pressable>
          <Pressable
            onPress={handleRetake}
            style={({ pressed }) => [
              styles.previewSecondaryBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Retake photo"
          >
            <Ionicons name="camera-outline" size={18} color={INK} />
            <Text style={styles.previewSecondaryBtnText}>Retake Photo</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── Form screen ──────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* ─────────────────────────────
          MODAL HEADER
      ───────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.headerDismissBtn,
            pressed && styles.pressed,
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Cancel and dismiss"
        >
          <Ionicons name="close" size={20} color={INK} />
        </Pressable>

        <Text style={styles.headerTitle} numberOfLines={1}>
          Add Health Record
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 1. DOCUMENT AI / SCAN DOCUMENT FEATURE CARD */}
          <Pressable
            onPress={openCamera}
            style={({ pressed }) => [
              styles.scanCard,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Scan health document with camera"
          >
            <View style={styles.scanIconBox}>
              <Image
                source={require('../../assets/icons/AI.png')}
                style={styles.scanIcon}
              />
            </View>
            <View style={styles.scanTextBox}>
              <Text style={styles.scanTitle}>Scan Health Document</Text>
              <Text style={styles.scanSub}>
                Take a photo to auto-fill details with AI
              </Text>
            </View>
            <View style={styles.scanChevronBox}>
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </View>
          </Pressable>

          {/* Divider Row */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or fill in manually</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 2. RECORD TYPE SELECTION */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>RECORD TYPE</Text>
            <View style={styles.typeGrid}>
              {RECORD_TYPES.map((t) => {
                const active = type === t.value;
                return (
                  <Pressable
                    key={t.value}
                    onPress={() => setType(t.value)}
                    style={({ pressed }) => [
                      styles.typeChip,
                      active && styles.typeChipActive,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Select record type ${t.label}`}
                    accessibilityState={{ selected: active }}
                  >
                    <Image
                      source={TYPE_ASSETS[t.value]}
                      style={[
                        styles.typeChipIcon,
                        { tintColor: active ? TEAL : MUTED },
                      ]}
                    />
                    <Text
                      style={[
                        styles.typeChipText,
                        active && styles.typeChipTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 3. RECORD INFORMATION CARD */}
          <View style={styles.formCard}>
            {/* Title Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>RECORD TITLE *</Text>
              <View style={styles.inputContainer}>
                <Image
                  source={require('../../assets/icons/folder.png')}
                  style={styles.fieldLeadingIcon}
                />
                <TextInput
                  style={styles.textInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Annual Blood Work & Lipid Panel"
                  placeholderTextColor={MUTED}
                  accessibilityLabel="Record title input"
                />
              </View>
            </View>

            {/* Date Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>DATE OF EVENT</Text>
              <View style={styles.inputContainer}>
                <Image
                  source={require('../../assets/icons/calendar.png')}
                  style={styles.fieldLeadingIcon}
                />
                <TextInput
                  style={styles.textInput}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={MUTED}
                  accessibilityLabel="Date input"
                />
              </View>
            </View>

            {/* Description Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>CLINICAL NOTES / DETAILS</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add doctor notes, dosage, follow-up instructions, or observations..."
                  placeholderTextColor={MUTED}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  accessibilityLabel="Description notes input"
                />
              </View>
            </View>
          </View>

          {/* 4. PRIMARY SAVE CTA */}
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && styles.pressed,
              saving && styles.disabledBtn,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Save medical record"
          >
            {saving ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Saving Record...</Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.saveBtnText}>Save Record</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  flexOne: {
    flex: 1,
  },

  /* ─────────────────────────────
     HEADER
  ───────────────────────────── */
  header: {
    backgroundColor: BG,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  headerDismissBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  headerTitle: {
    flex: 1,
    fontFamily: 'LexendDeca-Bold',
    fontSize: 17,
    color: INK,
    textAlign: 'center',
    marginHorizontal: 8,
  },

  headerSpacer: {
    width: 36,
  },

  pressed: {
    opacity: 0.75,
  },

  disabledBtn: {
    opacity: 0.6,
  },

  /* ─────────────────────────────
     SCROLL CONTENT
  ───────────────────────────── */
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },

  /* ─────────────────────────────
     SCAN DOCUMENT CARD
  ───────────────────────────── */
  scanCard: {
    backgroundColor: BLUE,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },

  scanIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scanIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
  },

  scanTextBox: {
    flex: 1,
    gap: 2,
  },

  scanTitle: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },

  scanSub: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
  },

  scanChevronBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ─────────────────────────────
     DIVIDER ROW
  ───────────────────────────── */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 2,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },

  dividerText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: MUTED,
  },

  /* ─────────────────────────────
     RECORD TYPE CHIPS
  ───────────────────────────── */
  section: {
    gap: 8,
  },

  sectionLabel: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11,
    color: MUTED,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },

  typeChipActive: {
    backgroundColor: GREEN_LIGHT,
    borderColor: TEAL,
  },

  typeChipIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
  },

  typeChipText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: INK,
  },

  typeChipTextActive: {
    fontFamily: 'LexendDeca-SemiBold',
    color: TEAL,
  },

  /* ─────────────────────────────
     FORM CARD & INPUTS
  ───────────────────────────── */
  formCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  fieldGroup: {
    gap: 6,
  },

  fieldLabel: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11,
    color: MUTED,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FCFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EBF4F1',
    paddingHorizontal: 14,
    minHeight: 48,
  },

  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 12,
    minHeight: 110,
  },

  fieldLeadingIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
    tintColor: TEAL,
  },

  textInput: {
    flex: 1,
    fontFamily: 'LexendDeca-Regular',
    fontSize: 14,
    color: INK,
    padding: 0,
  },

  textArea: {
    minHeight: 85,
    textAlignVertical: 'top',
  },

  /* ─────────────────────────────
     SAVE CTA BUTTON
  ───────────────────────────── */
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TEAL,
    borderRadius: 16,
    height: 54,
    marginTop: 4,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },

  saveBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },

  /* ─────────────────────────────
     CAMERA SCREEN
  ───────────────────────────── */
  cameraRoot: {
    flex: 1,
    backgroundColor: '#000000',
  },

  cameraView: {
    flex: 1,
  },

  cameraOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },

  cameraHint: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },

  viewfinder: {
    width: 280,
    height: 380,
    position: 'relative',
  },

  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: TEAL,
  },

  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 6,
  },

  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 6,
  },

  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 6,
  },

  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 6,
  },

  cameraActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
  },

  cameraCancel: {
    width: 70,
    alignItems: 'flex-start',
  },

  cameraCancelText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },

  captureBtn: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
  },

  cameraSpacer: {
    width: 70,
  },

  /* ─────────────────────────────
     PREVIEW SCREEN
  ───────────────────────────── */
  previewRoot: {
    flex: 1,
    backgroundColor: '#000000',
  },

  previewImage: {
    flex: 1,
  },

  previewActions: {
    backgroundColor: CARD_BG,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  previewLabel: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 18,
    color: INK,
  },

  previewSub: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: MUTED,
    lineHeight: 19,
    marginBottom: 4,
  },

  previewPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TEAL,
    borderRadius: 14,
    height: 50,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },

  previewPrimaryBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },

  previewSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F8FCFB',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    height: 50,
  },

  previewSecondaryBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 15,
    color: INK,
  },
});