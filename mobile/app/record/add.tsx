import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { api } from '../../lib/api';
import { DocumentCamera } from '../../components/camera/DocumentCamera';
import { DocumentPreview } from '../../components/camera/DocumentPreview';
import { AttachedDocumentCard } from '../../components/camera/AttachedDocumentCard';

// Design Tokens matching MedRec standard palette
const TEAL = '#159A83';
const GREEN_LIGHT = '#DDF5EE';
const BLUE = '#1976D2';
const INK = '#12343B';
const BG = '#F4FAF9';
const BORDER = '#E5F0EE';
const MUTED = '#64748B';
const CARD_BG = '#FFFFFF';

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

type ViewMode = 'form' | 'camera' | 'preview';

export default function AddRecordScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('form');
  const [tempPhotoUri, setTempPhotoUri] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Form Fields
  const [type, setType] = useState('consultation');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleSave = async () => {
    if (!title.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Title required', 'Please enter a title for this health record.');
      return;
    }
    setSaving(true);
    try {
      await api.addRecord({ type, title: title.trim(), description: description.trim(), date });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Failed to save', err.message || 'Could not save record to database.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenGallery = async () => {
    try {
      Haptics.selectionAsync();
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        setTempPhotoUri(selectedUri);
        setViewMode('preview');
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err?.message || 'Could not open photo library.');
    }
  };

  const handleConfirmPhoto = (confirmedUri: string) => {
    setPhotoUri(confirmedUri);
    setTempPhotoUri(null);

    // Auto-suggest a default title if title is currently blank
    if (!title.trim()) {
      const todayFormatted = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      setTitle(`Scanned Document — ${todayFormatted}`);
    }

    setViewMode('form');
  };

  // ─── 1. CAMERA VIEWPORT ──────────────────────────────────────────────────
  if (viewMode === 'camera') {
    return (
      <DocumentCamera
        onCapture={(uri) => {
          setTempPhotoUri(uri);
          setViewMode('preview');
        }}
        onSelectFromGallery={(uri) => {
          setTempPhotoUri(uri);
          setViewMode('preview');
        }}
        onClose={() => {
          setTempPhotoUri(null);
          setViewMode('form');
        }}
      />
    );
  }

  // ─── 2. PHOTO PREVIEW & QUALITY CHECK ─────────────────────────────────────
  if (viewMode === 'preview' && (tempPhotoUri || photoUri)) {
    return (
      <DocumentPreview
        photoUri={tempPhotoUri || photoUri!}
        onConfirm={handleConfirmPhoto}
        onRetake={() => {
          setViewMode('camera');
        }}
        onCancel={() => {
          setTempPhotoUri(null);
          setViewMode('form');
        }}
      />
    );
  }

  // ─── 3. FORM SCREEN ───────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Drag Handle Affordance */}
      <View style={styles.handleContainer} pointerEvents="none">
        <View style={styles.handle} />
      </View>

      {/* Modal Header */}
      <View style={[styles.header, { paddingTop: 6 }]}>
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
          {/* Document Attachment State vs Scan Trigger Card */}
          {photoUri ? (
            <AttachedDocumentCard
              photoUri={photoUri}
              onPressInspect={() => {
                setTempPhotoUri(photoUri);
                setViewMode('preview');
              }}
              onPressRetake={() => {
                setViewMode('camera');
              }}
              onPressRemove={() => {
                setPhotoUri(null);
              }}
            />
          ) : (
            <View style={styles.scanHeroCard}>
              {/* Top Row: AI Icon + Title & Subtitle */}
              <View style={styles.scanHeroTopRow}>
                <View style={styles.scanIconBox}>
                  <Image
                    source={require('../../assets/icons/AI.png')}
                    style={styles.scanIcon}
                  />
                </View>
                <View style={styles.scanTextBox}>
                  <Text style={styles.scanTitle}>Scan Health Document</Text>
                  <Text style={styles.scanSub}>
                    Point camera at prescriptions, lab tests, or bills
                  </Text>
                </View>
              </View>

              {/* Action Buttons: Primary Camera CTA + Photo Library */}
              <View style={styles.scanActionsContainer}>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setViewMode('camera');
                  }}
                  style={({ pressed }) => [
                    styles.scanPrimaryBtn,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Scan health document with camera"
                >
                  <Ionicons name="camera-outline" size={17} color={BLUE} />
                  <Text style={styles.scanPrimaryBtnText}>SCAN WITH CAMERA</Text>
                </Pressable>

                <Pressable
                  onPress={handleOpenGallery}
                  style={({ pressed }) => [
                    styles.galleryHeroBtn,
                    pressed && styles.pressed,
                  ]}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Choose from photo library"
                >
                  <Ionicons name="images-outline" size={14} color="rgba(255, 255, 255, 0.9)" />
                  <Text style={styles.galleryHeroBtnText}>Or choose from Photo Library</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>record details</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Record Type Carousel */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>RECORD TYPE</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.typeCarousel}
              style={styles.carouselScrollView}
            >
              {RECORD_TYPES.map((t) => {
                const active = type === t.value;
                return (
                  <Pressable
                    key={t.value}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setType(t.value);
                    }}
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
            </ScrollView>
          </View>

          {/* Record Information Form Card */}
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

            {/* Date of Event */}
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

            {/* Clinical Notes / Details */}
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

          {/* Primary Save CTA */}
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  flexOne: {
    flex: 1,
  },

  /* ─────────────────────────────
     DRAG HANDLE
  ───────────────────────────── */
  handleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 2,
    backgroundColor: BG,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
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
     SCAN HERO CARD
  ───────────────────────────── */
  scanHeroCard: {
    backgroundColor: BLUE,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  scanHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scanIconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanIcon: {
    width: 34,
    height: 34,
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
  },
  scanTextBox: {
    flex: 1,
    gap: 2,
  },
  scanTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  scanSub: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 15,
  },
  scanActionsContainer: {
    gap: 8,
    marginTop: 2,
  },
  scanPrimaryBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  scanPrimaryBtnText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 12,
    color: '#111827',
    letterSpacing: 0.4,
  },
  galleryHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  galleryHeroBtnText: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.92)',
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
    fontFamily: 'LexendDeca-Medium',
    fontSize: 11,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  /* ─────────────────────────────
     RECORD TYPE CHIPS CAROUSEL
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
  carouselScrollView: {
    marginHorizontal: -20,
  },
  typeCarousel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 2,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
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
    fontSize: 12.5,
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
});