import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
  Linking,
  Share,
  Switch,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import ProfileEditModal, { ProfileData } from '../../components/ProfileEditModal';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import EmergencyIdModal from '../../components/EmergencyIdModal';

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

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'Not set';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, setUser, logout } = useAuth();

  const [profile, setProfile] = useState<ProfileData>({});
  const [recordsCount, setRecordsCount] = useState(0);
  const [activeSharesCount, setActiveSharesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Preference Toggles
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Modals state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editMode, setEditMode] = useState<'demographics' | 'medical'>('demographics');
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [emergencyModalVisible, setEmergencyModalVisible] = useState(false);

  const fetchProfileData = async () => {
    try {
      const data = await api.getProfile();
      if (data) {
        if (data.user) {
          setUser({
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
          });
        }
        setProfile(data.profile || {});
        setRecordsCount(data.recordsCount || 0);
        setActiveSharesCount(data.activeSharesCount || 0);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load profile');
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfileData().finally(() => setLoading(false));
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfileData();
    setRefreshing(false);
  };

  const handleEditDemographics = () => {
    setEditMode('demographics');
    setEditModalVisible(true);
  };

  const handleEditMedicalId = () => {
    setEditMode('medical');
    setEditModalVisible(true);
  };

  const handleProfileUpdated = (data: any) => {
    if (data.user) {
      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
      });
    }
    if (data.profile) {
      setProfile(data.profile);
    }
    if (data.recordsCount !== undefined) setRecordsCount(data.recordsCount);
    if (data.activeSharesCount !== undefined) setActiveSharesCount(data.activeSharesCount);
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
          Alert.alert('Phone not supported', `Cannot place a call to ${rawPhone} from this device.`);
        }
      })
      .catch(() => {
        Alert.alert('Error', 'Unable to initiate call.');
      });
  };

  const handleExportData = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const recordsData = await api.getRecords();
      const exportPayload = {
        exportDate: new Date().toISOString(),
        application: 'MedRec Health Vault',
        user: {
          name: user?.name,
          email: user?.email,
        },
        profile: {
          dateOfBirth: profile.dateOfBirth,
          biologicalSex: profile.biologicalSex,
          bloodType: profile.bloodType,
          allergies: profile.allergies,
          medicalConditions: profile.medicalConditions,
          medicationsSummary: profile.medicationsSummary,
          emergencyContact: {
            name: profile.emergencyContactName,
            relationship: profile.emergencyContactRelationship,
            phone: profile.emergencyContactPhone,
          },
          phone: profile.phone,
          address: profile.address,
          organDonor: profile.organDonor,
        },
        medicalRecords: recordsData?.records || [],
      };

      await Share.share({
        title: 'MedRec Health Vault Export',
        message: JSON.stringify(exportPayload, null, 2),
      });
    } catch (err: any) {
      Alert.alert('Export Failed', err.message || 'Could not export records.');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of your MedRec account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, clinical records, and sharing tokens. This action is IRREVERSIBLE.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteAccount();
              await logout();
            } catch (err: any) {
              Alert.alert('Deletion Failed', err.message || 'Could not delete account.');
            }
          },
        },
      ]
    );
  };

  const handleShowDisclaimer = () => {
    Alert.alert(
      'Medical Disclaimer',
      'MedRec is an independent personal health record management system designed for patient information storage and secure sharing. MedRec does not provide medical diagnoses, treatment advice, or emergency triage services. Always consult a qualified healthcare provider for clinical advice or in medical emergencies.'
    );
  };

  const userInitials = user?.name
    ? user.name
        .trim()
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'MR';

  const age = calculateAge(profile.dateOfBirth);

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Screen Header */}
      <View style={[styles.screenHeader, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.screenHeaderTitle}>Profile &amp; Health ID</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 96 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />
        }
      >
        {/* ─────────────────────────────
            1. USER PROFILE HEADER CARD
        ───────────────────────────── */}
        <View style={styles.headerCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{userInitials}</Text>
            </View>
            <View style={styles.identityBox}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.name || 'Patient'}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {user?.email || 'patient@medrec.local'}
              </Text>
            </View>
            <Pressable
              onPress={handleEditDemographics}
              style={({ pressed }) => [styles.editHeaderBtn, pressed && styles.pressed]}
              hitSlop={8}
            >
              <Ionicons name="create-outline" size={18} color={TEAL} />
            </Pressable>
          </View>

          {/* Quick Metrics Badges */}
          <View style={styles.badgeRow}>
            <View style={styles.statBadge}>
              <Ionicons name="person-outline" size={13} color={TEAL} />
              <Text style={styles.statBadgeText}>
                {age !== null ? `${age} yrs` : 'Age not set'}
                {profile.biologicalSex ? ` • ${profile.biologicalSex.charAt(0).toUpperCase() + profile.biologicalSex.slice(1)}` : ''}
              </Text>
            </View>

            <View style={[styles.statBadge, profile.bloodType && styles.statBadgeAccent]}>
              <Ionicons name="water-outline" size={13} color={profile.bloodType ? RED : TEAL} />
              <Text style={[styles.statBadgeText, profile.bloodType && styles.statBadgeAccentText]}>
                {profile.bloodType ? `Blood: ${profile.bloodType}` : 'Blood: Not set'}
              </Text>
            </View>

            <View style={styles.statBadge}>
              <Ionicons name="folder-outline" size={13} color={TEAL} />
              <Text style={styles.statBadgeText}>
                {recordsCount} Record{recordsCount === 1 ? '' : 's'}
              </Text>
            </View>
          </View>
        </View>

        {/* ─────────────────────────────
            2. EMERGENCY & MEDICAL ID CARD
        ───────────────────────────── */}
        <View style={[styles.card, styles.emergencyCard]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.emergencyIconBox}>
                <Ionicons name="medical" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.emergencyCardHeaderTitle}>Emergency Medical ID</Text>
            </View>
            <Pressable
              onPress={handleEditMedicalId}
              style={({ pressed }) => [styles.editSmallBtn, pressed && styles.pressed]}
              hitSlop={8}
            >
              <Ionicons name="pencil" size={13} color={TEAL} />
              <Text style={styles.editSmallBtnText}>Edit</Text>
            </Pressable>
          </View>

          <View style={styles.emergencyGrid}>
            {/* Blood Type Row */}
            <View style={styles.emergencyRow}>
              <Text style={styles.emergencyLabel}>Blood Type</Text>
              <View style={styles.bloodPill}>
                <Text style={styles.bloodPillText}>{profile.bloodType || 'Not specified'}</Text>
              </View>
            </View>

            {/* Allergies Row */}
            <View style={styles.emergencyRow}>
              <Text style={styles.emergencyLabel}>Known Allergies</Text>
              <Text
                style={[
                  styles.emergencyValue,
                  profile.allergies ? styles.allergyHighlight : styles.mutedValue,
                ]}
                numberOfLines={2}
              >
                {profile.allergies || 'No known allergies listed'}
              </Text>
            </View>

            {/* Chronic Conditions */}
            <View style={styles.emergencyRow}>
              <Text style={styles.emergencyLabel}>Chronic Conditions</Text>
              <Text
                style={[styles.emergencyValue, !profile.medicalConditions && styles.mutedValue]}
                numberOfLines={2}
              >
                {profile.medicalConditions || 'None reported'}
              </Text>
            </View>

            {/* Maintenance Medications */}
            <View style={styles.emergencyRow}>
              <Text style={styles.emergencyLabel}>Maintenance Meds</Text>
              <Text
                style={[styles.emergencyValue, !profile.medicationsSummary && styles.mutedValue]}
                numberOfLines={2}
              >
                {profile.medicationsSummary || 'None reported'}
              </Text>
            </View>

            {/* Emergency Contact */}
            <View style={styles.emergencyContactBox}>
              <View style={styles.emergencyContactHeader}>
                <Ionicons name="call" size={14} color={TEAL} />
                <Text style={styles.emergencyContactTitle}>Primary Emergency Contact</Text>
              </View>
              {profile.emergencyContactName ? (
                <View style={styles.emergencyContactBody}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.emergencyContactName}>
                      {profile.emergencyContactName}
                      {profile.emergencyContactRelationship
                        ? ` (${profile.emergencyContactRelationship})`
                        : ''}
                    </Text>
                    <Text style={styles.emergencyContactPhone}>
                      {profile.emergencyContactPhone || 'No phone number'}
                    </Text>
                  </View>
                  {profile.emergencyContactPhone && (
                    <Pressable
                      onPress={handleCallEmergency}
                      style={({ pressed }) => [styles.dialBtn, pressed && styles.pressed]}
                      hitSlop={6}
                    >
                      <Ionicons name="call" size={16} color="#FFFFFF" />
                      <Text style={styles.dialBtnText}>Call</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <Text style={styles.emptyEmergencyText}>
                  No emergency contact registered. Tap Edit to add a primary contact.
                </Text>
              )}
            </View>
          </View>

          {/* Emergency Card Modal Trigger */}
          <Pressable
            onPress={() => setEmergencyModalVisible(true)}
            style={({ pressed }) => [styles.viewEmergencyIdBtn, pressed && styles.pressed]}
          >
            <Ionicons name="qr-code-outline" size={16} color={TEAL} />
            <Text style={styles.viewEmergencyIdBtnText}>View First Responder QR ID</Text>
          </Pressable>
        </View>

        {/* ─────────────────────────────
            3. PERSONAL & DEMOGRAPHIC DETAILS
        ───────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionHeading}>Personal Information</Text>
            <Pressable
              onPress={handleEditDemographics}
              style={({ pressed }) => [styles.editSmallBtn, pressed && styles.pressed]}
              hitSlop={8}
            >
              <Ionicons name="pencil" size={13} color={TEAL} />
              <Text style={styles.editSmallBtnText}>Edit</Text>
            </Pressable>
          </View>

          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Text style={styles.infoRowLabel}>Date of Birth</Text>
              <Text style={styles.infoRowValue}>
                {profile.dateOfBirth
                  ? `${formatDate(profile.dateOfBirth)}${age !== null ? ` (${age} yrs)` : ''}`
                  : 'Not set'}
              </Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoRowLabel}>Biological Sex</Text>
              <Text style={styles.infoRowValue}>
                {profile.biologicalSex
                  ? profile.biologicalSex.charAt(0).toUpperCase() + profile.biologicalSex.slice(1)
                  : 'Not set'}
              </Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoRowLabel}>Phone Number</Text>
              <Text style={styles.infoRowValue}>{profile.phone || 'Not set'}</Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoRowLabel}>Address</Text>
              <Text style={[styles.infoRowValue, styles.addressValue]} numberOfLines={2}>
                {profile.address || 'Not set'}
              </Text>
            </View>
          </View>
        </View>

        {/* ─────────────────────────────
            4. PRIVACY, SHARING & SECURITY
        ───────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Privacy &amp; Security</Text>

          <View style={styles.actionList}>
            {/* Active Shares */}
            <Pressable
              onPress={() => router.push('/(tabs)/share')}
              style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
            >
              <View style={styles.actionIconBox}>
                <Image
                  source={require('../../assets/icons/share-active.png')}
                  style={styles.actionIcon}
                />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle}>Active QR Shares</Text>
                <Text style={styles.actionSubtitle}>
                  {activeSharesCount === 0
                    ? 'No active doctor shares'
                    : `${activeSharesCount} active temporary share${activeSharesCount > 1 ? 's' : ''}`}
                </Text>
              </View>
              <View style={styles.actionRight}>
                {activeSharesCount > 0 && (
                  <View style={styles.activeShareBadge}>
                    <Text style={styles.activeShareBadgeText}>{activeSharesCount} Active</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color={MUTED} />
              </View>
            </Pressable>

            <View style={styles.infoDivider} />

            {/* Change Password */}
            <Pressable
              onPress={() => setPasswordModalVisible(true)}
              style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
            >
              <View style={styles.actionIconBox}>
                <Image
                  source={require('../../assets/icons/padlock.png')}
                  style={styles.actionIcon}
                />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle}>Change Password</Text>
                <Text style={styles.actionSubtitle}>Update your MedRec account credentials</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={MUTED} />
            </Pressable>

            <View style={styles.infoDivider} />

            {/* Export Records */}
            <Pressable
              onPress={handleExportData}
              style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
            >
              <View style={styles.actionIconBox}>
                <Image
                  source={require('../../assets/icons/open-folder.png')}
                  style={styles.actionIcon}
                />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle}>Export Health Vault</Text>
                <Text style={styles.actionSubtitle}>Download full JSON archive of your records</Text>
              </View>
              <Ionicons name="share-outline" size={18} color={TEAL} />
            </Pressable>

            <View style={styles.infoDivider} />

            {/* Biometric Toggle */}
            <View style={styles.actionRow}>
              <View style={styles.actionIconBox}>
                <Ionicons name="finger-print" size={20} color={TEAL} />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle}>Biometric App Unlock</Text>
                <Text style={styles.actionSubtitle}>Require Face ID / Touch ID on app open</Text>
              </View>
              <Switch
                value={biometricsEnabled}
                onValueChange={(val) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setBiometricsEnabled(val);
                }}
                trackColor={{ false: '#D9E7E4', true: TEAL }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* ─────────────────────────────
            5. PREFERENCES & ACCOUNT ACTIONS
        ───────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Preferences &amp; Support</Text>

          <View style={styles.actionList}>
            {/* Notifications */}
            <View style={styles.actionRow}>
              <View style={styles.actionIconBox}>
                <Ionicons name="notifications-outline" size={20} color={TEAL} />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle}>Push Notifications</Text>
                <Text style={styles.actionSubtitle}>Sharing alerts and record reminders</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#D9E7E4', true: TEAL }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.infoDivider} />

            {/* Medical Disclaimer */}
            <Pressable
              onPress={handleShowDisclaimer}
              style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
            >
              <View style={styles.actionIconBox}>
                <Ionicons name="information-circle-outline" size={20} color={TEAL} />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle}>About MedRec &amp; Disclaimer</Text>
                <Text style={styles.actionSubtitle}>Version 1.0.0 (Build 42) · Privacy first</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={MUTED} />
            </Pressable>
          </View>

          <View style={styles.sectionDivider} />

          {/* Destructive Actions */}
          <View style={styles.accountButtonsBlock}>
            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}
            >
              <Ionicons name="log-out-outline" size={18} color={RED} />
              <Text style={styles.signOutBtnText}>Sign Out</Text>
            </Pressable>

            <Pressable
              onPress={handleDeleteAccount}
              style={({ pressed }) => [styles.deleteAccountBtn, pressed && styles.pressed]}
            >
              <Text style={styles.deleteAccountText}>Delete Account &amp; Vault</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* ─────────────────────────────
          SUB-MODALS
      ───────────────────────────── */}
      <ProfileEditModal
        visible={editModalVisible}
        mode={editMode}
        initialData={profile}
        userName={user?.name || ''}
        onClose={() => setEditModalVisible(false)}
        onSuccess={handleProfileUpdated}
      />

      <ChangePasswordModal
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
      />

      <EmergencyIdModal
        visible={emergencyModalVisible}
        profile={profile}
        userName={user?.name || ''}
        userEmail={user?.email || ''}
        onClose={() => setEmergencyModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  loadingRoot: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 14,
    color: MUTED,
  },
  screenHeader: {
    paddingHorizontal: 24,
    paddingBottom: 10,
    backgroundColor: BG,
  },
  screenHeaderTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 24,
    color: INK,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 14,
  },

  /* ─────────────────────────────
     HEADER CARD
  ───────────────────────────── */
  headerCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: GREEN_LIGHT,
  },
  avatarText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 22,
    color: '#FFFFFF',
  },
  identityBox: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 20,
    color: INK,
  },
  userEmail: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: MUTED,
  },
  editHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GREEN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FCFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5F0EE',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statBadgeAccent: {
    backgroundColor: RED_LIGHT,
    borderColor: RED_BORDER,
  },
  statBadgeText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11,
    color: INK,
  },
  statBadgeAccentText: {
    color: RED,
  },

  /* ─────────────────────────────
     COMMON CARDS
  ───────────────────────────── */
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeading: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 16,
    color: INK,
  },
  editSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: GREEN_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  editSmallBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12,
    color: TEAL,
  },

  /* ─────────────────────────────
     EMERGENCY CARD
  ───────────────────────────── */
  emergencyCard: {
    borderColor: '#D0EAE4',
  },
  emergencyIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyCardHeaderTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 15,
    color: INK,
  },
  emergencyGrid: {
    gap: 10,
  },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emergencyLabel: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: MUTED,
  },
  emergencyValue: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13,
    color: INK,
    textAlign: 'right',
    maxWidth: '60%',
  },
  bloodPill: {
    backgroundColor: RED_LIGHT,
    borderWidth: 1,
    borderColor: RED_BORDER,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bloodPillText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 13,
    color: RED,
  },
  allergyHighlight: {
    color: RED,
  },
  mutedValue: {
    color: MUTED,
    fontFamily: 'LexendDeca-Regular',
  },
  emergencyContactBox: {
    backgroundColor: '#F8FCFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2F0ED',
    padding: 12,
    gap: 8,
    marginTop: 4,
  },
  emergencyContactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emergencyContactTitle: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12,
    color: TEAL,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emergencyContactBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  emergencyContactName: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 14,
    color: INK,
  },
  emergencyContactPhone: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  dialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: TEAL,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  dialBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  emptyEmergencyText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: MUTED,
  },
  viewEmergencyIdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: GREEN_LIGHT,
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 2,
  },
  viewEmergencyIdBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13,
    color: TEAL,
  },

  /* ─────────────────────────────
     PERSONAL DETAILS
  ───────────────────────────── */
  infoList: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoRowLabel: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: MUTED,
  },
  infoRowValue: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13,
    color: INK,
  },
  addressValue: {
    maxWidth: '55%',
    textAlign: 'right',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F0F5F4',
  },

  /* ─────────────────────────────
     PRIVACY & ACTIONS
  ───────────────────────────── */
  actionList: {
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: GREEN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
    tintColor: TEAL,
  },
  actionTextBox: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 14,
    color: INK,
  },
  actionSubtitle: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    color: MUTED,
  },
  actionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeShareBadge: {
    backgroundColor: GREEN_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeShareBadgeText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 10,
    color: TEAL,
  },

  /* ─────────────────────────────
     ACCOUNT BUTTONS
  ───────────────────────────── */
  sectionDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 4,
  },
  accountButtonsBlock: {
    gap: 12,
    alignItems: 'center',
    paddingTop: 4,
  },
  signOutBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: RED_BORDER,
    backgroundColor: RED_LIGHT,
    borderRadius: 12,
    paddingVertical: 12,
  },
  signOutBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 14,
    color: RED,
  },
  deleteAccountBtn: {
    paddingVertical: 6,
  },
  deleteAccountText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: RED,
    textDecorationLine: 'underline',
  },

  pressed: {
    opacity: 0.75,
  },
});
