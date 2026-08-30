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
  Switch,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';

const TEAL = '#159A83';
const INK = '#12343B';
const GREEN_LIGHT = '#DDF5EE';
const BG = '#F4FAF9';
const BORDER = '#E5F0EE';
const MUTED = '#64748B';
const CARD_BG = '#FFFFFF';
const RED = '#D92D20';

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
  onSuccess: (updated: any) => void;
};

export default function ProfileEditModal({
  visible,
  mode,
  initialData,
  userName,
  onClose,
  onSuccess,
}: Props) {
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);

  // Demographics state
  const [name, setName] = useState(userName || '');
  const [dateOfBirth, setDateOfBirth] = useState(initialData.dateOfBirth || '');
  const [biologicalSex, setBiologicalSex] = useState(initialData.biologicalSex || 'undisclosed');
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

  useEffect(() => {
    if (visible) {
      setName(userName || '');
      setDateOfBirth(initialData.dateOfBirth || '');
      setBiologicalSex(initialData.biologicalSex || 'undisclosed');
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
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not update profile details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header with integrated drag handle */}
        <View style={styles.header}>
          <View style={styles.dragHandle} />

          <View style={styles.headerContentRow}>
            <Pressable onPress={onClose} hitSlop={8} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Text style={styles.headerTitle}>
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
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {mode === 'demographics' ? (
            /* ─────────────────────────────
               DEMOGRAPHICS FORM
            ───────────────────────────── */
            <View style={styles.formGroup}>
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Full Legal Name *</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. McLein Onz"
                  placeholderTextColor={MUTED}
                  style={[styles.input, !name && styles.placeholderInput]}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
                <TextInput
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="e.g. 1996-10-14"
                  placeholderTextColor={MUTED}
                  style={[styles.input, !dateOfBirth && styles.placeholderInput]}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
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

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="e.g. +1 (555) 012-3456"
                  placeholderTextColor={MUTED}
                  style={[styles.input, !phone && styles.placeholderInput]}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Residential Address</Text>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="e.g. 123 Health Ave, San Francisco, CA"
                  placeholderTextColor={MUTED}
                  style={[styles.input, styles.multilineInput, !address && styles.placeholderInput]}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          ) : (
            /* ─────────────────────────────
               MEDICAL ID FORM
            ───────────────────────────── */
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
                  style={[styles.input, styles.multilineInput, !allergies && styles.placeholderInput]}
                  multiline
                  numberOfLines={2}
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
                  style={[styles.input, styles.multilineInput, !medicalConditions && styles.placeholderInput]}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Emergency Maintenance Medications</Text>
                <TextInput
                  value={medicationsSummary}
                  onChangeText={setMedicationsSummary}
                  placeholder="e.g. Albuterol Inhaler (PRN), Insulin Glargine"
                  placeholderTextColor={MUTED}
                  style={[styles.input, styles.multilineInput, !medicationsSummary && styles.placeholderInput]}
                  multiline
                  numberOfLines={2}
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
                  style={[styles.input, !emergencyContactName && styles.placeholderInput]}
                  autoCapitalize="words"
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
                  style={[styles.input, !emergencyContactPhone && styles.placeholderInput]}
                  keyboardType="phone-pad"
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 16,
    color: INK,
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cancelBtnText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 15,
    color: MUTED,
  },
  saveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: GREEN_LIGHT,
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
    fontSize: 14,
    color: INK,
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
});
