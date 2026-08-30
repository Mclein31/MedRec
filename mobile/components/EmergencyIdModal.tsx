import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { ProfileData } from './ProfileEditModal';

const TEAL = '#159A83';
const INK = '#12343B';
const GREEN_LIGHT = '#DDF5EE';
const BG = '#F4FAF9';
const BORDER = '#E5F0EE';
const MUTED = '#64748B';
const CARD_BG = '#FFFFFF';
const RED = '#D92D20';
const RED_LIGHT = '#FEF3F2';
const RED_BORDER = '#FECDCA';

type Props = {
  visible: boolean;
  profile: ProfileData;
  userName: string;
  userEmail: string;
  onClose: () => void;
};

function calculateAge(dobStr?: string | null): number | null {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export default function EmergencyIdModal({
  visible,
  profile,
  userName,
  userEmail,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();

  const handleCallEmergency = () => {
    const rawPhone = profile.emergencyContactPhone;
    if (!rawPhone || !rawPhone.trim()) {
      Alert.alert('No phone number', 'No emergency contact phone number is set.');
      return;
    }
    const cleanPhone = rawPhone.replace(/[^0-9+]/g, '');
    const url = `tel:${cleanPhone}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Cannot place call', `Phone calls are not supported on this device for ${rawPhone}`);
        }
      })
      .catch(() => {
        Alert.alert('Error', 'Unable to initiate call.');
      });
  };

  const age = calculateAge(profile.dateOfBirth);

  const qrPayload = JSON.stringify({
    service: 'MedRec Emergency Medical ID',
    name: userName || 'Not provided',
    dob: profile.dateOfBirth || 'Unknown',
    age: age !== null ? age : 'Unknown',
    bloodType: profile.bloodType || 'Unknown',
    allergies: profile.allergies || 'No known allergies',
    conditions: profile.medicalConditions || 'None reported',
    medications: profile.medicationsSummary || 'None reported',
    organDonor: profile.organDonor ? 'Yes' : 'No',
    emergencyContact: profile.emergencyContactName
      ? `${profile.emergencyContactName} (${profile.emergencyContactRelationship || 'Contact'}) - ${profile.emergencyContactPhone || 'No Phone'}`
      : 'None listed',
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header with integrated drag handle */}
        <View style={styles.header}>
          <View style={styles.dragHandle} />

          <View style={styles.headerContentRow}>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={INK} />
            </Pressable>
            <View style={styles.headerTitleBox}>
              <Ionicons name="medical" size={18} color={RED} />
              <Text style={styles.headerTitle}>Emergency Medical ID</Text>
            </View>
            <View style={{ width: 32 }} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Emergency Alert Banner */}
          <View style={styles.alertBanner}>
            <View style={styles.alertIconBox}>
              <Ionicons name="alert-circle" size={22} color={RED} />
            </View>
            <View style={styles.alertTextBox}>
              <Text style={styles.alertTitle}>First Responder Summary</Text>
              <Text style={styles.alertSub}>
                Critical medical baselines and emergency contacts for acute clinical triage.
              </Text>
            </View>
          </View>

          {/* Primary Patient Card */}
          <View style={styles.card}>
            <View style={styles.patientRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {userName
                    ? userName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : 'MR'}
                </Text>
              </View>
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{userName || 'Patient'}</Text>
                <Text style={styles.patientSub}>
                  {age !== null ? `${age} yrs` : 'Age not set'}
                  {profile.biologicalSex ? ` • ${profile.biologicalSex.charAt(0).toUpperCase() + profile.biologicalSex.slice(1)}` : ''}
                </Text>
              </View>
              {profile.bloodType && (
                <View style={styles.bloodBadge}>
                  <Text style={styles.bloodBadgeSub}>BLOOD</Text>
                  <Text style={styles.bloodBadgeText}>{profile.bloodType}</Text>
                </View>
              )}
            </View>

            <View style={styles.divider} />

            {/* Allergies Highlight */}
            <View style={styles.allergySection}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="warning" size={16} color={RED} />
                <Text style={styles.allergyTitle}>Allergies & Contraindications</Text>
              </View>
              {profile.allergies && profile.allergies.trim() ? (
                <View style={styles.allergyBox}>
                  <Text style={styles.allergyText}>{profile.allergies}</Text>
                </View>
              ) : (
                <View style={styles.safeBox}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={TEAL} />
                  <Text style={styles.safeText}>No known severe allergies reported</Text>
                </View>
              )}
            </View>

            {/* Medical Conditions */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Chronic Medical Conditions</Text>
              <Text style={styles.infoValue}>
                {profile.medicalConditions || 'None reported'}
              </Text>
            </View>

            {/* Medications */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Maintenance Medications</Text>
              <Text style={styles.infoValue}>
                {profile.medicationsSummary || 'None reported'}
              </Text>
            </View>

            {/* Organ Donor */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Organ Donor</Text>
              <Text style={styles.infoValue}>
                {profile.organDonor ? 'Yes (Registered Donor)' : 'No / Not registered'}
              </Text>
            </View>
          </View>

          {/* Emergency Contact Action Card */}
          <View style={styles.contactCard}>
            <View style={styles.contactHeader}>
              <View style={styles.phoneIconBox}>
                <Ionicons name="call" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactCardTitle}>Primary Emergency Contact</Text>
                <Text style={styles.contactCardSub}>
                  {profile.emergencyContactRelationship
                    ? profile.emergencyContactRelationship.toUpperCase()
                    : 'EMERGENCY ICE'}
                </Text>
              </View>
            </View>

            {profile.emergencyContactName ? (
              <View style={styles.contactDetails}>
                <Text style={styles.contactName}>{profile.emergencyContactName}</Text>
                <Text style={styles.contactPhone}>{profile.emergencyContactPhone || 'No phone number'}</Text>

                {profile.emergencyContactPhone && (
                  <Pressable
                    onPress={handleCallEmergency}
                    style={({ pressed }) => [styles.callBtn, pressed && styles.pressed]}
                  >
                    <Ionicons name="call" size={18} color="#FFFFFF" />
                    <Text style={styles.callBtnText}>Call Emergency Contact</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <View style={styles.emptyContact}>
                <Text style={styles.emptyContactText}>
                  No emergency contact registered. Tap &ldquo;Edit Medical ID&rdquo; to add one.
                </Text>
              </View>
            )}
          </View>

          {/* Offline Paramedic QR Code */}
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>Offline Paramedic QR Code</Text>
            <Text style={styles.qrSub}>
              First responders can scan this code with any camera to read emergency data instantly without internet or login.
            </Text>
            <View style={styles.qrWrapper}>
              <QRCode value={qrPayload} size={160} color="#12343B" backgroundColor="#FFFFFF" />
            </View>
            <Text style={styles.qrFooterNote}>
              Generated from verified patient vault data.
            </Text>
          </View>
        </ScrollView>
      </View>
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
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 17,
    color: INK,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RED_LIGHT,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: RED_BORDER,
    padding: 14,
    gap: 12,
  },
  alertIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTextBox: {
    flex: 1,
    gap: 2,
  },
  alertTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 14,
    color: RED,
  },
  alertSub: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    color: '#7A271A',
    lineHeight: 16,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    gap: 14,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  patientInfo: {
    flex: 1,
    gap: 2,
  },
  patientName: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 18,
    color: INK,
  },
  patientSub: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: MUTED,
  },
  bloodBadge: {
    backgroundColor: RED_LIGHT,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: RED_BORDER,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  bloodBadgeSub: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 9,
    color: RED,
    letterSpacing: 0.5,
  },
  bloodBadgeText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 16,
    color: RED,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
  },
  allergySection: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  allergyTitle: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13,
    color: RED,
  },
  allergyBox: {
    backgroundColor: RED_LIGHT,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: RED_BORDER,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  allergyText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13,
    color: RED,
    lineHeight: 18,
  },
  safeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FCFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D9E7E4',
  },
  safeText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: MUTED,
  },
  infoSection: {
    gap: 4,
  },
  sectionTitle: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12,
    color: MUTED,
  },
  infoValue: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 14,
    color: INK,
  },
  contactCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9E7E4',
    padding: 18,
    gap: 14,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  phoneIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactCardTitle: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 14,
    color: INK,
  },
  contactCardSub: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 10,
    color: TEAL,
    letterSpacing: 0.5,
  },
  contactDetails: {
    gap: 8,
  },
  contactName: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 16,
    color: INK,
  },
  contactPhone: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 14,
    color: MUTED,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 6,
  },
  callBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  emptyContact: {
    paddingVertical: 8,
  },
  emptyContactText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: MUTED,
  },
  qrCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  qrTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 15,
    color: INK,
    textAlign: 'center',
  },
  qrSub: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 17,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginVertical: 6,
  },
  qrFooterNote: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    color: MUTED,
  },
  pressed: {
    opacity: 0.8,
  },
});
