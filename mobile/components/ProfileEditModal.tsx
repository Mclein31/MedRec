import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Animated,
  Easing,
} from 'react-native';
import { PrivateModal as Modal } from './security/PrivateModal';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { DragHandle } from './ui/DragHandle';
import { Colors, Radii, ResponsiveLimits } from '../constants/theme';
import { useResponsive } from '../hooks/useResponsive';

const TEAL = Colors.teal;
const INK = Colors.ink;
const GREEN_LIGHT = Colors.tealLight;
const BG = Colors.bg;
const BORDER = Colors.border;
const MUTED = Colors.muted;
const CARD_BG = Colors.cardBg;

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'];
const SEX_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'undisclosed' },
];
const RELATIONSHIP_OPTIONS = [
  'Spouse',
  'Parent',
  'Child',
  'Sibling',
  'Partner',
  'Friend',
  'Guardian',
  'Doctor',
  'Other',
];

export type ProfileData = {
  name?: string;
  dateOfBirth?: string | null;
  biologicalSex?: string | null;
  height?: string | null;
  weight?: string | null;
  bloodType?: string | null;
  allergies?: string | null;
  medicalConditions?: string | null;
  medicationsSummary?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactPhone?: string | null;
  phone?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  organDonor?: boolean;
};

type Props = {
  visible: boolean;
  mode: 'demographics' | 'medical';
  initialData: ProfileData;
  userName: string;
  onClose: () => void;
  onSuccess?: (updated: any) => void;
  onSaved?: (updated: any) => void;
};

export default function ProfileEditModal({
  visible,
  mode,
  initialData,
  userName,
  onClose,
  onSuccess,
  onSaved,
}: Props) {
  const { isTablet, insets, height: windowHeight, scaleFont } = useResponsive();
  const [saving, setSaving] = useState(false);

  const [modalVisible, setModalVisible] = useState(visible);
  const backdropFadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(windowHeight || 800)).current;
  const scaleAnim = useRef(new Animated.Value(0.93)).current;
  const translateYAnim = useRef(new Animated.Value(16)).current;
  const modalOpacityAnim = useRef(new Animated.Value(0)).current;

  const isClosingRef = useRef(false);
  const prevVisibleRef = useRef(visible);
  const animTokenRef = useRef(0);

  // Demographics state
  const [name, setName] = useState(userName || '');
  const [dateOfBirth, setDateOfBirth] = useState(initialData.dateOfBirth || '');
  const [biologicalSex, setBiologicalSex] = useState(initialData.biologicalSex || 'undisclosed');
  const [height, setHeight] = useState(initialData.height || '');
  const [weight, setWeight] = useState(initialData.weight || '');
  const [phone, setPhone] = useState(initialData.phone || '');
  const [address, setAddress] = useState(initialData.address || '');

  // Medical ID state
  const [bloodType, setBloodType] = useState(initialData.bloodType || 'unknown');
  const [allergies, setAllergies] = useState(initialData.allergies || '');
  const [medicalConditions, setMedicalConditions] = useState(initialData.medicalConditions || '');
  const [medicationsSummary, setMedicationsSummary] = useState(initialData.medicationsSummary || '');
  const [emergencyContactName, setEmergencyContactName] = useState(
    initialData.emergencyContactName || ''
  );
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState(
    initialData.emergencyContactRelationship || ''
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    initialData.emergencyContactPhone || ''
  );
  const [organDonor, setOrganDonor] = useState(Boolean(initialData.organDonor));

  const stopAllAnimations = () => {
    backdropFadeAnim.stopAnimation();
    slideAnim.stopAnimation();
    scaleAnim.stopAnimation();
    translateYAnim.stopAnimation();
    modalOpacityAnim.stopAnimation();
  };

  const handleClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    const currentToken = ++animTokenRef.current;
    stopAllAnimations();

    // Independent Layer 1: Background Dimming Fade Out
    Animated.timing(backdropFadeAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start();

    // Independent Layer 2: Modal Dismissal
    if (isTablet) {
      Animated.parallel([
        Animated.timing(modalOpacityAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 14,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && animTokenRef.current === currentToken) {
          setModalVisible(false);
          onClose();
        }
      });
    } else {
      Animated.parallel([
        Animated.timing(modalOpacityAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: windowHeight || 800,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && animTokenRef.current === currentToken) {
          setModalVisible(false);
          onClose();
        }
      });
    }
  };

  const handleSave = async () => {
    if (mode === 'demographics' && !name.trim()) {
      Alert.alert('Required field', 'Please enter your legal name.');
      return;
    }

    if (dateOfBirth && dateOfBirth.trim() !== '') {
      const regex = /^\d{4}-\d{2}-\d{2}$/;
      if (!regex.test(dateOfBirth.trim())) {
        Alert.alert(
          'Invalid Date',
          'Please enter Date of Birth in YYYY-MM-DD format (e.g. 1995-10-24).'
        );
        return;
      }
      const parsed = new Date(dateOfBirth.trim());
      if (isNaN(parsed.getTime()) || parsed > new Date()) {
        Alert.alert('Invalid Date', 'Please enter a valid past birth date.');
        return;
      }
    }

    setSaving(true);
    try {
      let payload: Record<string, any> = {};

      if (mode === 'demographics') {
        payload = {
          name: name.trim(),
          dateOfBirth: dateOfBirth.trim() || null,
          biologicalSex: biologicalSex || null,
          height: height.trim() || null,
          weight: weight.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
        };
      } else {
        payload = {
          bloodType: bloodType === 'unknown' ? null : bloodType,
          allergies: allergies.trim() || null,
          medicalConditions: medicalConditions.trim() || null,
          medicationsSummary: medicationsSummary.trim() || null,
          emergencyContactName: emergencyContactName.trim() || null,
          emergencyContactRelationship: emergencyContactRelationship.trim() || null,
          emergencyContactPhone: emergencyContactPhone.trim() || null,
          organDonor: Boolean(organDonor),
        };
      }

      const updated = await api.updateProfile(payload);
      onSuccess?.(updated);
      onSaved?.(updated);
      handleClose();
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not update profile details.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (visible && !wasVisible) {
      isClosingRef.current = false;
      const currentToken = ++animTokenRef.current;
      stopAllAnimations();

      setModalVisible(true);
      backdropFadeAnim.setValue(0);
      slideAnim.setValue(windowHeight || 800);
      scaleAnim.setValue(0.93);
      translateYAnim.setValue(16);
      modalOpacityAnim.setValue(0);

      // Independent Layer 1: Background Dimming
      Animated.timing(backdropFadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();

      // Independent Layer 2: Modal Entrance
      if (isTablet) {
        Animated.parallel([
          Animated.timing(modalOpacityAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 240,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: 0,
            duration: 240,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(modalOpacityAnim, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }
    } else if (!visible && wasVisible && modalVisible) {
      handleClose();
    }
  }, [visible, isTablet]);

  useEffect(() => {
    if (visible) {
      setName(userName || '');
      setDateOfBirth(initialData.dateOfBirth || '');
      setBiologicalSex(initialData.biologicalSex || 'undisclosed');
      setHeight(initialData.height || '');
      setWeight(initialData.weight || '');
      setPhone(initialData.phone || '');
      setAddress(initialData.address || '');

      setBloodType(initialData.bloodType || 'unknown');
      setAllergies(initialData.allergies || '');
      setMedicalConditions(initialData.medicalConditions || '');
      setMedicationsSummary(initialData.medicationsSummary || '');
      setEmergencyContactName(initialData.emergencyContactName || '');
      setEmergencyContactRelationship(initialData.emergencyContactRelationship || '');
      setEmergencyContactPhone(initialData.emergencyContactPhone || '');
      setOrganDonor(Boolean(initialData.organDonor));
    }
  }, [visible, initialData, userName]);

  const formContent = (
    <>
      {/* Header with integrated drag handle */}
      <View style={styles.header}>
        <DragHandle />

        <View style={styles.headerContentRow}>
          <Pressable onPress={handleClose} hitSlop={8} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Text
            style={[
              styles.headerTitle,
              { fontSize: scaleFont(16, 14.5, 18) },
            ]}
            maxFontSizeMultiplier={1.35}
          >
            {mode === 'demographics' ? 'Edit Demographics' : 'Edit Medical ID'}
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            hitSlop={8}
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={TEAL} />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 20) + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {mode === 'demographics' ? (
          /* DEMOGRAPHICS FORM */
          <View style={styles.formGroup}>
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Full Legal Name *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. McLein Onz"
                placeholderTextColor={MUTED}
                style={[
                  styles.input,
                  { fontSize: scaleFont(14, 13, 15) },
                  !name && styles.placeholderInput,
                ]}
                autoCapitalize="words"
                autoCorrect={false}
                maxFontSizeMultiplier={1.35}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
              <TextInput
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="e.g. 1996-10-14"
                placeholderTextColor={MUTED}
                style={[
                  styles.input,
                  { fontSize: scaleFont(14, 13, 15) },
                  !dateOfBirth && styles.placeholderInput,
                ]}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                maxFontSizeMultiplier={1.35}
              />
              <Text style={styles.hint}>Format: YYYY-MM-DD. Age is automatically calculated.</Text>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Biological Sex</Text>
              <View style={styles.chipGrid}>
                {SEX_OPTIONS.map((opt) => {
                  const isSelected = biologicalSex === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setBiologicalSex(opt.value)}
                      style={[styles.chip, isSelected && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.rowTwoCols}>
              <View style={[styles.fieldBlock, { flex: 1 }]}>
                <Text style={styles.label}>Height (cm)</Text>
                <TextInput
                  value={height}
                  onChangeText={setHeight}
                  placeholder="e.g. 178"
                  placeholderTextColor={MUTED}
                  style={[
                    styles.input,
                    { fontSize: scaleFont(14, 13, 15) },
                    !height && styles.placeholderInput,
                  ]}
                  keyboardType="numeric"
                  maxFontSizeMultiplier={1.35}
                />
              </View>

              <View style={[styles.fieldBlock, { flex: 1 }]}>
                <Text style={styles.label}>Weight (kg)</Text>
                <TextInput
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="e.g. 72"
                  placeholderTextColor={MUTED}
                  style={[
                    styles.input,
                    { fontSize: scaleFont(14, 13, 15) },
                    !weight && styles.placeholderInput,
                  ]}
                  keyboardType="numeric"
                  maxFontSizeMultiplier={1.35}
                />
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="e.g. +1 (555) 012-3456"
                placeholderTextColor={MUTED}
                style={[
                  styles.input,
                  { fontSize: scaleFont(14, 13, 15) },
                  !phone && styles.placeholderInput,
                ]}
                keyboardType="phone-pad"
                maxFontSizeMultiplier={1.35}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Residential Address</Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="e.g. 123 Health Ave, San Francisco, CA"
                placeholderTextColor={MUTED}
                style={[
                  styles.input,
                  styles.multilineInput,
                  { fontSize: scaleFont(14, 13, 15) },
                  !address && styles.placeholderInput,
                ]}
                multiline
                numberOfLines={3}
                maxFontSizeMultiplier={1.35}
              />
            </View>
          </View>
        ) : (
          /* MEDICAL ID FORM */
          <View style={styles.formGroup}>
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Blood Type</Text>
              <View style={styles.chipGrid}>
                {BLOOD_TYPES.map((bt) => {
                  const isSelected = bloodType === bt;
                  return (
                    <Pressable
                      key={bt}
                      onPress={() => setBloodType(bt)}
                      style={[styles.bloodChip, isSelected && styles.bloodChipActive]}
                    >
                      <Text style={[styles.bloodChipText, isSelected && styles.bloodChipTextActive]}>
                        {bt === 'unknown' ? 'Unknown' : bt}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Severe Allergies & Intolerances</Text>
              <TextInput
                value={allergies}
                onChangeText={setAllergies}
                placeholder="e.g. Penicillin (Anaphylaxis), Peanuts, NSAIDs"
                placeholderTextColor={MUTED}
                style={[
                  styles.input,
                  styles.multilineInput,
                  { fontSize: scaleFont(14, 13, 15) },
                  !allergies && styles.placeholderInput,
                ]}
                multiline
                numberOfLines={2}
                maxFontSizeMultiplier={1.35}
              />
              <Text style={styles.hint}>Life-critical for emergency care and prescriptions.</Text>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Chronic Medical Conditions</Text>
              <TextInput
                value={medicalConditions}
                onChangeText={setMedicalConditions}
                placeholder="e.g. Mild Asthma, Type 1 Diabetes, Hypertension"
                placeholderTextColor={MUTED}
                style={[
                  styles.input,
                  styles.multilineInput,
                  { fontSize: scaleFont(14, 13, 15) },
                  !medicalConditions && styles.placeholderInput,
                ]}
                multiline
                numberOfLines={2}
                maxFontSizeMultiplier={1.35}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Emergency Maintenance Medications</Text>
              <TextInput
                value={medicationsSummary}
                onChangeText={setMedicationsSummary}
                placeholder="e.g. Albuterol Inhaler (PRN), Insulin Glargine"
                placeholderTextColor={MUTED}
                style={[
                  styles.input,
                  styles.multilineInput,
                  { fontSize: scaleFont(14, 13, 15) },
                  !medicationsSummary && styles.placeholderInput,
                ]}
                multiline
                numberOfLines={2}
                maxFontSizeMultiplier={1.35}
              />
            </View>

            <View style={styles.sectionDivider} />
            <Text style={styles.sectionSubhead}>Primary Emergency Contact</Text>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Contact Full Name</Text>
              <TextInput
                value={emergencyContactName}
                onChangeText={setEmergencyContactName}
                placeholder="e.g. Jane Doe"
                placeholderTextColor={MUTED}
                style={[
                  styles.input,
                  { fontSize: scaleFont(14, 13, 15) },
                  !emergencyContactName && styles.placeholderInput,
                ]}
                autoCapitalize="words"
                maxFontSizeMultiplier={1.35}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Relationship</Text>
              <View style={styles.chipGrid}>
                {RELATIONSHIP_OPTIONS.map((rel) => {
                  const isSelected = emergencyContactRelationship === rel;
                  return (
                    <Pressable
                      key={rel}
                      onPress={() => setEmergencyContactRelationship(rel)}
                      style={[styles.chip, isSelected && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {rel}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Contact Phone Number</Text>
              <TextInput
                value={emergencyContactPhone}
                onChangeText={setEmergencyContactPhone}
                placeholder="e.g. +1 (555) 019-2834"
                placeholderTextColor={MUTED}
                style={[
                  styles.input,
                  { fontSize: scaleFont(14, 13, 15) },
                  !emergencyContactPhone && styles.placeholderInput,
                ]}
                keyboardType="phone-pad"
                maxFontSizeMultiplier={1.35}
              />
            </View>

            <View style={styles.sectionDivider} />

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Organ Donor</Text>
                <Text style={styles.switchSub}>Registered organ donor preference</Text>
              </View>
              <Switch
                value={organDonor}
                onValueChange={setOrganDonor}
                trackColor={{ false: '#D9E7E4', true: TEAL }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      accessibilityViewIsModal
    >
      <View style={styles.modalRoot}>
        {/* LAYER 1: Independent Stationary Background Dimming Overlay */}
        <Animated.View
          style={[styles.backdrop, { opacity: backdropFadeAnim }]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close edit profile backdrop"
          />
        </Animated.View>

        {/* LAYER 2: Independent Edit Profile Modal */}
        {isTablet ? (
          <View style={styles.tabletCenterWrapper} pointerEvents="box-none">
            <KeyboardAvoidingView
              style={styles.tabletKeyboardAvoider}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              pointerEvents="box-none"
            >
              <Animated.View
                style={[
                  styles.container,
                  styles.containerTablet,
                  {
                    opacity: modalOpacityAnim,
                    transform: [
                      { scale: scaleAnim },
                      { translateY: translateYAnim },
                    ],
                  },
                ]}
              >
                {formContent}
              </Animated.View>
            </KeyboardAvoidingView>
          </View>
        ) : (
          <View style={styles.phoneSheetWrapper} pointerEvents="box-none">
            <KeyboardAvoidingView
              style={styles.phoneKeyboardAvoider}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              pointerEvents="box-none"
            >
              <Animated.View
                style={[
                  styles.container,
                  styles.containerPhone,
                  {
                    transform: [{ translateY: slideAnim }],
                    opacity: modalOpacityAnim,
                  },
                ]}
              >
                {formContent}
              </Animated.View>
            </KeyboardAvoidingView>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  tabletCenterWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tabletKeyboardAvoider: {
    width: '100%',
    maxWidth: ResponsiveLimits.maxModalWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneSheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  phoneKeyboardAvoider: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: BG,
  },
  containerPhone: {
    flex: 0,
    height: '92%',
    maxHeight: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  containerTablet: {
    flex: 0,
    width: '100%',
    maxWidth: ResponsiveLimits.maxModalWidth,
    maxHeight: '85%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  header: {
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  headerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: 'LexendDeca-Bold',
    color: INK,
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 15,
    color: MUTED,
  },
  saveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: GREEN_LIGHT,
    minHeight: 36,
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 15,
    color: TEAL,
  },
  content: {
    padding: 20,
  },
  formGroup: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    gap: 16,
  },
  fieldBlock: {
    gap: 6,
  },
  label: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13,
    color: INK,
  },
  hint: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    color: MUTED,
  },
  input: {
    backgroundColor: '#F8FCFB',
    borderWidth: 1,
    borderColor: '#D9E7E4',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'LexendDeca-Regular',
    color: INK,
    minHeight: 48,
  },
  placeholderInput: {
    fontSize: 12.5,
  },
  multilineInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D9E7E4',
    backgroundColor: '#FFFFFF',
    minHeight: 36,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: GREEN_LIGHT,
    borderColor: TEAL,
  },
  chipText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: MUTED,
  },
  chipTextActive: {
    fontFamily: 'LexendDeca-SemiBold',
    color: TEAL,
  },
  bloodChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D9E7E4',
    backgroundColor: '#FFFFFF',
    minWidth: 46,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  bloodChipActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  bloodChipText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13,
    color: INK,
  },
  bloodChipTextActive: {
    color: '#FFFFFF',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 4,
  },
  sectionSubhead: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 14,
    color: INK,
    marginBottom: -4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  switchInfo: {
    flex: 1,
    gap: 2,
  },
  switchLabel: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 14,
    color: INK,
  },
  switchSub: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: MUTED,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
});
