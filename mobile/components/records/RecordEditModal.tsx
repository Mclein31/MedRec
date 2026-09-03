import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { api } from '../../lib/api';
import { DocumentCamera } from '../camera/DocumentCamera';
import { DocumentPreview } from '../camera/DocumentPreview';
import { AttachedDocumentCard } from '../camera/AttachedDocumentCard';
import { DragHandle } from '../ui/DragHandle';
import { Colors, Radii, ResponsiveLimits } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { MedicalRecord } from '../../types/record';
import {
  RECORD_TYPE_OPTIONS,
  RECORD_TYPE_ASSETS,
} from '../../constants/records';

const TEAL = Colors.teal;
const BLUE = Colors.blue;
const INK = Colors.ink;
const BG = Colors.bg;
const BORDER = Colors.border;
const MUTED = Colors.muted;
const CARD_BG = Colors.cardBg;

type ViewMode = 'form' | 'camera' | 'preview';

interface RecordEditModalProps {
  visible: boolean;
  record: MedicalRecord | null;
  onClose: () => void;
  onSaved: (updatedRecord: MedicalRecord) => void;
}

export const RecordEditModal: React.FC<RecordEditModalProps> = ({
  visible,
  record,
  onClose,
  onSaved,
}) => {
  const { isTablet, insets, scaleFont } = useResponsive();

  const [viewMode, setViewMode] = useState<ViewMode>('form');
  const [tempPhotoUri, setTempPhotoUri] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [type, setType] = useState('consultation');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record && visible) {
      setTitle(record.title || '');
      setType(record.type || 'consultation');
      setDate(record.date ? record.date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setDescription(record.description || '');
      const existingAttachment = record.attachment_url || record.attachmentUrl || null;
      setPhotoUri(existingAttachment);
      setTempPhotoUri(null);
      setViewMode('form');
    }
  }, [record, visible]);

  const handleSetToday = () => {
    Haptics.selectionAsync();
    setDate(new Date().toISOString().split('T')[0]);
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
    setViewMode('form');
  };

  const handleSave = async () => {
    if (!record) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Title Required', 'Please enter a title for this medical record.');
      return;
    }

    const trimmedDate = date.trim();
    if (!trimmedDate || !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      Alert.alert('Valid Date Required', 'Please enter a valid date in YYYY-MM-DD format.');
      return;
    }

    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      let finalAttachmentUrl: string | null | undefined = undefined;

      if (photoUri && (photoUri.startsWith('file://') || photoUri.startsWith('content://'))) {
        // Upload new image binary to Cloudflare R2
        try {
          const uploadInfo = await api.getStorageUploadUrl({
            bucket: 'medical-records',
            fileName: 'document_scan.jpg',
            fileType: 'image/jpeg',
          });
          if (uploadInfo?.uploadUrl) {
            await api.uploadFileToSignedUrl(uploadInfo.uploadUrl, photoUri, 'image/jpeg');
            finalAttachmentUrl = uploadInfo.path;
          } else {
            throw new Error('Could not get a secure upload URL from the server.');
          }
        } catch (uploadErr: any) {
          Alert.alert(
            'Upload Failed',
            'Could not securely upload the document to cloud storage. Please try again.\n\n' +
              (uploadErr?.message || 'Unknown error'),
          );
          setSaving(false);
          return;
        }
      } else if (!photoUri && (record.attachment_url || record.attachmentUrl)) {
        // User explicitly removed the existing attachment
        finalAttachmentUrl = null;
      }

      const res = await api.updateRecord(record.id, {
        title: trimmedTitle,
        type,
        date: trimmedDate,
        description: description.trim() || null,
        attachmentUrl: finalAttachmentUrl,
      });

      if (res && res.record) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSaved(res.record);
        onClose();
      }
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Unable to update record metadata.');
    } finally {
      setSaving(false);
    }
  };

  if (!record) return null;

  // ─── CAMERA VIEWPORT OVERLAY ──────────────────────────────────────────────
  if (viewMode === 'camera') {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setViewMode('form')}
      >
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
      </Modal>
    );
  }

  // ─── PHOTO PREVIEW & QUALITY CHECK ─────────────────────────────────────────
  if (viewMode === 'preview' && (tempPhotoUri || photoUri)) {
    return (
      <Modal
        visible={visible}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setViewMode('form')}
      >
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
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={isTablet ? 'overFullScreen' : 'pageSheet'}
      transparent={isTablet}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.modalRoot,
          isTablet && styles.modalRootTablet,
        ]}
      >
        {isTablet && (
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[
            styles.container,
            isTablet && styles.containerTablet,
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            {!isTablet && <DragHandle />}

            <View style={styles.headerRow}>
              <View style={styles.headerTitleGroup}>
                <Text
                  style={[
                    styles.headerTitle,
                    { fontSize: scaleFont(18, 16, 20) },
                  ]}
                  maxFontSizeMultiplier={1.35}
                >
                  Edit Record Details
                </Text>
                <Text style={styles.headerSubtitle} maxFontSizeMultiplier={1.35}>
                  Update document scan, title, category, date, and notes
                </Text>
              </View>

              <Pressable
                onPress={onClose}
                style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close edit modal"
              >
                <Ionicons name="close" size={18} color={INK} />
              </Pressable>
            </View>
          </View>

          {/* Form Scroll Content */}
          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={[
              styles.formContent,
              { paddingBottom: Math.max(insets.bottom, 20) + 30 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Document Attachment / Scan Hero Card (Matching Add Record UI) */}
            {photoUri ? (
              <AttachedDocumentCard
                photoUri={photoUri}
                accentColor={BLUE}
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
                    <Text
                      style={[
                        styles.scanTitle,
                        { fontSize: scaleFont(16, 14.5, 18) },
                      ]}
                      maxFontSizeMultiplier={1.35}
                    >
                      Scan Health Document
                    </Text>
                    <Text
                      style={[
                        styles.scanSub,
                        { fontSize: scaleFont(11, 10.5, 12.5) },
                      ]}
                      maxFontSizeMultiplier={1.35}
                    >
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
                    hitSlop={8}
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

            {/* 2. Category Carousel (Matching Add New Records Tab) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CATEGORY *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryCarousel}
                style={styles.categoryScroll}
              >
                {RECORD_TYPE_OPTIONS.map((opt) => {
                  const isSelected = type === opt.value;
                  const asset = RECORD_TYPE_ASSETS[opt.value] || RECORD_TYPE_ASSETS.other;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setType(opt.value);
                      }}
                      style={({ pressed }) => [
                        styles.categoryChip,
                        isSelected && styles.categoryChipSelected,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Select category ${opt.label}`}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Image
                        source={asset}
                        style={[
                          styles.categoryIcon,
                          { tintColor: isSelected ? TEAL : MUTED },
                        ]}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          isSelected && styles.categoryChipTextSelected,
                        ]}
                        maxFontSizeMultiplier={1.35}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* 3. Record Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>RECORD TITLE *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Cardiology Consult, Complete Blood Count"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            {/* 4. Date of Event */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRowBetween}>
                <Text style={styles.inputLabel}>DATE OF EVENT (YYYY-MM-DD) *</Text>
                <Pressable onPress={handleSetToday} hitSlop={6}>
                  <Text style={styles.quickTodayLink}>Set Today</Text>
                </Pressable>
              </View>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
                keyboardType="numbers-and-punctuation"
                returnKeyType="next"
              />
            </View>

            {/* 5. Clinical Notes & Observations */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CLINICAL NOTES &amp; OBSERVATIONS</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Add doctor notes, test findings, prescriptions, or summary..."
                placeholderTextColor="#94A3B8"
                style={[styles.textInput, styles.textArea]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && styles.pressed,
                saving && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Save record changes"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: BG,
  },
  modalRootTablet: {
    backgroundColor: Colors.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  containerTablet: {
    flex: 0,
    width: '100%',
    maxWidth: ResponsiveLimits.maxModalWidth,
    maxHeight: '88%',
    borderRadius: Radii.sheet,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  header: {
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F5F4',
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  headerTitleGroup: {
    gap: 2,
  },
  headerTitle: {
    fontFamily: 'LexendDeca-Bold',
    color: INK,
  },
  headerSubtitle: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11.5,
    color: MUTED,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4FAF9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: 18,
    gap: 16,
  },

  /* Scan Hero Card (Matching Add Record) */
  scanHeroCard: {
    backgroundColor: BLUE,
    borderRadius: Radii.card,
    padding: 16,
    gap: 12,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
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
    color: '#FFFFFF',
  },
  scanSub: {
    fontFamily: 'LexendDeca-Regular',
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
    height: 42,
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
    minHeight: 32,
  },
  galleryHeroBtnText: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.92)',
  },

  /* Divider Row */
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

  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.6,
  },
  labelRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickTodayLink: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11.5,
    color: TEAL,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'LexendDeca-Regular',
    fontSize: 14,
    color: INK,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  categoryScroll: {
    marginHorizontal: -18,
  },
  categoryCarousel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    minHeight: 38,
  },
  categoryChipSelected: {
    backgroundColor: Colors.tealLight,
    borderColor: TEAL,
  },
  categoryIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
  },
  categoryChipText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12.5,
    color: INK,
  },
  categoryChipTextSelected: {
    fontFamily: 'LexendDeca-SemiBold',
    color: TEAL,
  },
  saveBtn: {
    backgroundColor: TEAL,
    borderRadius: Radii.button,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.7,
  },
});

export default RecordEditModal;
