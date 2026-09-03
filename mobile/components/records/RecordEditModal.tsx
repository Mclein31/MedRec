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
import * as Haptics from 'expo-haptics';
import { api } from '../../lib/api';
import { DragHandle } from '../ui/DragHandle';
import { Colors, Radii, ResponsiveLimits } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { MedicalRecord } from '../../types/record';
import {
  RECORD_TYPE_OPTIONS,
  RECORD_TYPE_ASSETS,
  RECORD_TYPE_LABELS,
} from '../../constants/records';

const TEAL = Colors.teal;
const INK = Colors.ink;
const BG = Colors.bg;
const BORDER = Colors.border;
const MUTED = Colors.muted;
const CARD_BG = Colors.cardBg;

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

  const [title, setTitle] = useState('');
  const [type, setType] = useState('consultation');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setTitle(record.title || '');
      setType(record.type || 'consultation');
      setDate(record.date ? record.date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setDescription(record.description || '');
    }
  }, [record, visible]);

  const handleSetToday = () => {
    Haptics.selectionAsync();
    setDate(new Date().toISOString().split('T')[0]);
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
      const res = await api.updateRecord(record.id, {
        title: trimmedTitle,
        type,
        date: trimmedDate,
        description: description.trim() || null,
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
                  Update title, category, date, and clinical notes
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
            {/* 1. Record Title */}
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

            {/* 3. Date of Event */}
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

            {/* 4. Clinical Notes & Observations */}
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
