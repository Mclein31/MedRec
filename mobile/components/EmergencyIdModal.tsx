import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { PrivateModal as Modal } from './security/PrivateModal';
import { useRef, useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { ProfileData } from './ProfileEditModal';
import { DragHandle } from './ui/DragHandle';
import { Colors, Radii, ResponsiveLimits } from '../constants/theme';
import { useResponsive } from '../hooks/useResponsive';
import { calculateAge } from '../utils/dateUtils';

const TEAL = Colors.teal;
const INK = Colors.ink;
const BG = Colors.bg;
const BORDER = Colors.border;
const MUTED = Colors.muted;
const CARD_BG = Colors.cardBg;
const RED = Colors.red;
const RED_LIGHT = Colors.redLight;
const RED_BORDER = Colors.redBorder;

type Props = {
  visible: boolean;
  profile: ProfileData;
  userName: string;
  userEmail: string;
  onClose: () => void;
};

export default function EmergencyIdModal({
  visible,
  profile,
  userName,
  userEmail,
  onClose,
}: Props) {
  const { isTablet, isLandscape, insets, width, height, scaleFont } = useResponsive();

  const [modalVisible, setModalVisible] = useState(visible);
  const backdropFadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height || 800)).current;
  const scaleAnim = useRef(new Animated.Value(0.93)).current;
  const translateYAnim = useRef(new Animated.Value(16)).current;
  const modalOpacityAnim = useRef(new Animated.Value(0)).current;

  const isClosingRef = useRef(false);
  const prevVisibleRef = useRef(visible);
  const animTokenRef = useRef(0);

  const stopAllAnimations = () => {
    backdropFadeAnim.stopAnimation();
    slideAnim.stopAnimation();
    scaleAnim.stopAnimation();
    translateYAnim.stopAnimation();
    modalOpacityAnim.stopAnimation();
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
      slideAnim.setValue(height || 800);
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
          toValue: height || 800,
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
    email: userEmail || undefined,
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

  const qrSize = Math.round(isTablet ? 170 : Math.min(width * 0.42, 160));

  // Medical baselines block
  const medicalBaselinesBlock = (
    <>
      {/* Emergency Alert Banner */}
      <View style={styles.alertBanner}>
        <View style={styles.alertIconBox}>
          <Ionicons name="alert-circle" size={22} color={RED} />
        </View>
        <View style={styles.alertTextBox}>
          <Text style={styles.alertTitle} maxFontSizeMultiplier={1.35}>
            First Responder Summary
          </Text>
          <Text style={styles.alertSub} maxFontSizeMultiplier={1.35}>
            Critical medical baselines and emergency contacts for acute clinical triage.
          </Text>
        </View>
      </View>

      {/* Primary Patient Card */}
      <View style={styles.card}>
        <View style={styles.patientRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText} maxFontSizeMultiplier={1.35}>
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
            <Text
              style={[
                styles.patientName,
                { fontSize: scaleFont(18, 16, 20) },
              ]}
              maxFontSizeMultiplier={1.35}
            >
              {userName || 'Patient'}
            </Text>
            <Text style={styles.patientSub} maxFontSizeMultiplier={1.35}>
              {age !== null ? `${age} yrs` : 'Age not set'}
              {profile.biologicalSex ? ` • ${profile.biologicalSex.charAt(0).toUpperCase() + profile.biologicalSex.slice(1)}` : ''}
            </Text>
          </View>
          {profile.bloodType && (
            <View style={styles.bloodBadge}>
              <Text style={styles.bloodBadgeSub} maxFontSizeMultiplier={1.35}>BLOOD</Text>
              <Text style={styles.bloodBadgeText} maxFontSizeMultiplier={1.35}>{profile.bloodType}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Allergies Highlight */}
        <View style={styles.allergySection}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="warning" size={16} color={RED} />
            <Text style={styles.allergyTitle} maxFontSizeMultiplier={1.35}>Allergies &amp; Contraindications</Text>
          </View>
          {profile.allergies && profile.allergies.trim() ? (
            <View style={styles.allergyBox}>
              <Text style={styles.allergyText} maxFontSizeMultiplier={1.35}>{profile.allergies}</Text>
            </View>
          ) : (
            <View style={styles.safeBox}>
              <Ionicons name="checkmark-circle-outline" size={16} color={TEAL} />
              <Text style={styles.safeText} maxFontSizeMultiplier={1.35}>No known severe allergies reported</Text>
            </View>
          )}
        </View>

        {/* Medical Conditions */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.35}>Chronic Medical Conditions</Text>
          <Text style={styles.infoValue} maxFontSizeMultiplier={1.35}>
            {profile.medicalConditions || 'None reported'}
          </Text>
        </View>

        {/* Medications */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.35}>Maintenance Medications</Text>
          <Text style={styles.infoValue} maxFontSizeMultiplier={1.35}>
            {profile.medicationsSummary || 'None reported'}
          </Text>
        </View>

        {/* Organ Donor */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.35}>Organ Donor</Text>
          <Text style={styles.infoValue} maxFontSizeMultiplier={1.35}>
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
            <Text style={styles.contactCardTitle} maxFontSizeMultiplier={1.35}>Primary Emergency Contact</Text>
            <Text style={styles.contactCardSub} maxFontSizeMultiplier={1.35}>
              {profile.emergencyContactRelationship
                ? profile.emergencyContactRelationship.toUpperCase()
                : 'EMERGENCY ICE'}
            </Text>
          </View>
        </View>

        {profile.emergencyContactName ? (
          <View style={styles.contactDetails}>
            <Text style={styles.contactName} maxFontSizeMultiplier={1.35}>{profile.emergencyContactName}</Text>
            <Text style={styles.contactPhone} maxFontSizeMultiplier={1.35}>{profile.emergencyContactPhone || 'No phone number'}</Text>

            {profile.emergencyContactPhone && (
              <Pressable
                onPress={handleCallEmergency}
                style={({ pressed }) => [styles.callBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Call emergency contact: ${profile.emergencyContactName} at ${profile.emergencyContactPhone}`}
              >
                <Ionicons name="call" size={18} color="#FFFFFF" />
                <Text style={styles.callBtnText} maxFontSizeMultiplier={1.35}>Call Emergency Contact</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.emptyContact}>
            <Text style={styles.emptyContactText} maxFontSizeMultiplier={1.35}>
              No emergency contact registered. Tap &ldquo;Edit Medical ID&rdquo; to add one.
            </Text>
          </View>
        )}
      </View>
    </>
  );

  // Paramedic QR Block
  const paramedicQrBlock = (
    <View style={styles.qrCard}>
      <Text
        style={[
          styles.qrTitle,
          { fontSize: scaleFont(15, 14, 17) },
        ]}
        maxFontSizeMultiplier={1.35}
      >
        Offline Paramedic QR Code
      </Text>
      <Text style={styles.qrSub} maxFontSizeMultiplier={1.35}>
        First responders can scan this code with any camera to read emergency data instantly without internet or login.
      </Text>
      <View style={styles.qrWrapper}>
        <QRCode value={qrPayload} size={qrSize} color="#12343B" backgroundColor="#FFFFFF" />
      </View>
      <Text style={styles.qrFooterNote} maxFontSizeMultiplier={1.35}>
        Notice: This offline placard displays critical emergency triage data without login or internet for first responders during an acute medical emergency.
      </Text>
    </View>
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
            accessibilityLabel="Close Emergency Medical ID backdrop"
          />
        </Animated.View>

        {/* LAYER 2: Independent Emergency Medical ID Modal */}
        {isTablet ? (
          <View style={styles.tabletCenterWrapper} pointerEvents="box-none">
            <Animated.View
              style={[
                styles.container,
                styles.containerTablet,
                isLandscape && { maxWidth: 680, maxHeight: '90%' },
                {
                  opacity: modalOpacityAnim,
                  transform: [
                    { scale: scaleAnim },
                    { translateY: translateYAnim },
                  ],
                },
              ]}
            >
              {/* Header with integrated drag handle */}
              <View style={styles.header}>
                <DragHandle />

                <View style={styles.headerContentRow}>
                  <Pressable
                    onPress={handleClose}
                    hitSlop={8}
                    style={styles.closeBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Close Emergency Medical ID"
                  >
                    <Ionicons name="close" size={24} color={INK} />
                  </Pressable>
                  <View style={styles.headerTitleBox}>
                    <Ionicons name="medical" size={18} color={RED} />
                    <Text
                      style={[
                        styles.headerTitle,
                        { fontSize: scaleFont(17, 15, 19) },
                      ]}
                      maxFontSizeMultiplier={1.35}
                    >
                      Emergency Medical ID
                    </Text>
                  </View>
                  <View style={{ width: 32 }} />
                </View>
              </View>

              <ScrollView
                contentContainerStyle={[
                  styles.content,
                  { paddingBottom: Math.max(insets.bottom, 20) + 32 },
                ]}
                showsVerticalScrollIndicator={false}
              >
                {isLandscape ? (
                  <View style={styles.landscapeRow}>
                    <View style={styles.landscapeColLeft}>
                      {medicalBaselinesBlock}
                    </View>
                    <View style={styles.landscapeColRight}>
                      {paramedicQrBlock}
                    </View>
                  </View>
                ) : (
                  <>
                    {medicalBaselinesBlock}
                    {paramedicQrBlock}
                  </>
                )}
              </ScrollView>
            </Animated.View>
          </View>
        ) : (
          <View style={styles.phoneSheetWrapper} pointerEvents="box-none">
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
              {/* Header with integrated drag handle */}
              <View style={styles.header}>
                <DragHandle />

                <View style={styles.headerContentRow}>
                  <Pressable
                    onPress={handleClose}
                    hitSlop={8}
                    style={styles.closeBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Close Emergency Medical ID"
                  >
                    <Ionicons name="close" size={24} color={INK} />
                  </Pressable>
                  <View style={styles.headerTitleBox}>
                    <Ionicons name="medical" size={18} color={RED} />
                    <Text
                      style={[
                        styles.headerTitle,
                        { fontSize: scaleFont(17, 15, 19) },
                      ]}
                      maxFontSizeMultiplier={1.35}
                    >
                      Emergency Medical ID
                    </Text>
                  </View>
                  <View style={{ width: 32 }} />
                </View>
              </View>

              <ScrollView
                contentContainerStyle={[
                  styles.content,
                  { paddingBottom: Math.max(insets.bottom, 20) + 32 },
                ]}
                showsVerticalScrollIndicator={false}
              >
                {medicalBaselinesBlock}
                {paramedicQrBlock}
              </ScrollView>
            </Animated.View>
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
    backgroundColor: Colors.backdrop,
  },
  tabletCenterWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  phoneSheetWrapper: {
    flex: 1,
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
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: 'LexendDeca-Bold',
    color: INK,
  },
  closeBtn: {
    padding: 4,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: Radii.card,
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
    borderRadius: Radii.card,
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
    minHeight: 44,
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
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  qrTitle: {
    fontFamily: 'LexendDeca-Bold',
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
  landscapeRow: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  landscapeColLeft: {
    flex: 0.52,
    gap: 16,
  },
  landscapeColRight: {
    flex: 0.48,
    gap: 16,
  },
});
