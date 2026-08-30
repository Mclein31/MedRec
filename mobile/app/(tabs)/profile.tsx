import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Linking,
  Share,
  Switch,
  Image,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import ProfileEditModal, { ProfileData } from '../../components/ProfileEditModal';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import EmergencyIdModal from '../../components/EmergencyIdModal';
import { SideMenuModal } from '../../components/menu/SideMenuModal';
import { NotificationCenterModal } from '../../components/notifications/NotificationCenterModal';
import { Colors, Spacing, Radii, Typography } from '../../constants/theme';

const TEAL = Colors.teal;
const INK = Colors.ink;
const BG = Colors.bg;
const BORDER = Colors.border;
const MUTED = Colors.muted;
const CARD_BG = Colors.cardBg;
const DIVIDER = Colors.divider;
const RED = Colors.red;

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
    month: 'short',
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
  const [menuVisible, setMenuVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const { unreadCount, refreshNotifications } = useNotifications();

  const handlePickPhoto = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const photoPayload = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;

      setUploadingPhoto(true);
      // Optimistic update
      setProfile((prev) => ({ ...prev, avatarUrl: photoPayload }));
      setUser((prev) => (prev ? { ...prev, avatarUrl: photoPayload } : null));

      // Persist to backend database
      const res = await api.updateProfile({ avatarUrl: photoPayload });
      if (res && res.profile) {
        setProfile(res.profile);
        setUser((prev) => (prev ? { ...prev, avatarUrl: res.profile.avatarUrl } : null));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Photo Error', err?.message || 'Could not open photo library.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const fetchProfileData = async () => {
    try {
      const data = await api.getProfile();
      if (data) {
        if (data.user) {
          setUser({
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            avatarUrl: data.profile?.avatarUrl || null,
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
      setUser((prev) => ({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        avatarUrl: data.profile?.avatarUrl !== undefined ? data.profile.avatarUrl : prev?.avatarUrl,
      }));
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

      {/* Fixed Global Navigation Toolbar */}
      <View style={[styles.topToolbar, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setMenuVisible(true);
          }}
          hitSlop={10}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
        >
          <Image
            source={require('../../assets/icons/burger-menu.png')}
            style={styles.toolbarIcon}
          />
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            refreshNotifications();
            setNotificationsVisible(true);
          }}
          hitSlop={10}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={`Notifications, ${unreadCount} unread`}
        >
          <Image
            source={require('../../assets/icons/notification-bell.png')}
            style={styles.toolbarIcon}
          />
          {unreadCount > 0 && <View style={styles.notificationDot} />}
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + Spacing.tabBarClearance },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />
        }
      >
        {/* Profile Title & Subtitle (Scrolls away naturally) */}
        <View style={styles.titleSection}>
          <Text style={styles.screenTitle}>Profile</Text>
          <Text style={styles.screenSubtitle}>Manage your personal and medical ID</Text>
        </View>

        {/* ─────────────────────────────
            1. UNBOXED PROFILE HERO
        ───────────────────────────── */}
        <View style={styles.heroSection}>
          <Pressable
            onPress={handlePickPhoto}
            disabled={uploadingPhoto}
            style={({ pressed }) => [styles.avatarContainer, pressed && styles.pressed]}
            hitSlop={15}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
          >
            {(profile.avatarUrl || user?.avatarUrl) ? (
              <Image
                source={{ uri: profile.avatarUrl || user?.avatarUrl || '' }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{userInitials}</Text>
              </View>
            )}

            {uploadingPhoto ? (
              <View style={styles.cameraBadge}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            ) : (
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={13} color="#FFFFFF" />
              </View>
            )}
          </Pressable>

          <Text style={styles.userName} numberOfLines={1}>
            {user?.name || 'Patient'}
          </Text>
          <Text style={styles.userEmail} numberOfLines={1}>
            {user?.email || 'patient@medrec.local'}
          </Text>

          {/* Plain Text Metadata Summary */}
          <Text style={styles.metadataLine}>
            {age !== null ? `${age} yrs` : 'Age not set'}
            {profile.biologicalSex
              ? ` • ${profile.biologicalSex.charAt(0).toUpperCase() + profile.biologicalSex.slice(1)}`
              : ''}
            {profile.bloodType ? ` • Blood ${profile.bloodType}` : ''}
            {recordsCount > 0 ? ` • ${recordsCount} Record${recordsCount === 1 ? '' : 's'}` : ''}
          </Text>

          <Pressable
            onPress={handleEditDemographics}
            style={({ pressed }) => [styles.editProfileBtn, pressed && styles.pressed]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Edit profile demographics"
          >
            <Ionicons name="pencil" size={13} color={TEAL} />
            <Text style={styles.editProfileBtnText}>Edit Profile</Text>
          </Pressable>
        </View>

        {/* ─────────────────────────────
            2. EMERGENCY & MEDICAL ID
        ───────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>EMERGENCY &amp; MEDICAL ID</Text>
          <Pressable
            onPress={handleEditMedicalId}
            style={({ pressed }) => [styles.sectionEditLink, pressed && styles.pressed]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Edit medical ID information"
          >
            <Text style={styles.sectionEditLinkText}>Edit</Text>
          </Pressable>
        </View>

        <View style={styles.groupedCard}>
          {/* Blood Type */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Blood Type</Text>
            <Text
              style={[
                styles.rowValueBold,
                profile.bloodType ? styles.bloodTypeText : styles.mutedValue,
              ]}
            >
              {profile.bloodType || 'Not specified'}
            </Text>
          </View>

          <View style={styles.rowDivider} />

          {/* Known Allergies */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Known Allergies</Text>
            <Text
              style={[
                styles.rowValue,
                profile.allergies ? styles.allergyText : styles.mutedValue,
              ]}
              numberOfLines={2}
            >
              {profile.allergies || 'No known allergies'}
            </Text>
          </View>

          <View style={styles.rowDivider} />

          {/* Chronic Conditions */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Chronic Conditions</Text>
            <Text
              style={[styles.rowValue, !profile.medicalConditions && styles.mutedValue]}
              numberOfLines={2}
            >
              {profile.medicalConditions || 'None reported'}
            </Text>
          </View>

          <View style={styles.rowDivider} />

          {/* Maintenance Medications */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Maintenance Meds</Text>
            <Text
              style={[styles.rowValue, !profile.medicationsSummary && styles.mutedValue]}
              numberOfLines={2}
            >
              {profile.medicationsSummary || 'None reported'}
            </Text>
          </View>

          <View style={styles.rowDivider} />

          {/* Primary Emergency Contact */}
          <View style={styles.contactRow}>
            <View style={styles.contactInfo}>
              <Text style={styles.rowLabel}>Emergency Contact</Text>
              <Text style={styles.contactName} numberOfLines={1}>
                {profile.emergencyContactName
                  ? `${profile.emergencyContactName}${
                      profile.emergencyContactRelationship
                        ? ` (${profile.emergencyContactRelationship})`
                        : ''
                    }`
                  : 'No contact set'}
              </Text>
            </View>
            {profile.emergencyContactPhone ? (
              <Pressable
                onPress={handleCallEmergency}
                style={({ pressed }) => [styles.callActionBtn, pressed && styles.pressed]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Call emergency contact ${profile.emergencyContactName || ''}`}
              >
                <Ionicons name="call" size={13} color={TEAL} />
                <Text style={styles.callActionText}>Call</Text>
              </Pressable>
            ) : (
              <Text style={styles.mutedValue}>Not set</Text>
            )}
          </View>

          <View style={styles.rowDivider} />

          {/* First Responder QR ID */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setEmergencyModalVisible(true);
            }}
            style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="View First Responder Digital QR ID"
          >
            <View style={styles.navRowLeft}>
              <Ionicons name="qr-code-outline" size={18} color={TEAL} />
              <Text style={styles.navRowLabel}>First Responder Digital ID</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={MUTED} />
          </Pressable>
        </View>

        {/* ─────────────────────────────
            3. PERSONAL INFORMATION
        ───────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>PERSONAL INFORMATION</Text>
          <Pressable
            onPress={handleEditDemographics}
            style={({ pressed }) => [styles.sectionEditLink, pressed && styles.pressed]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Edit personal information"
          >
            <Text style={styles.sectionEditLinkText}>Edit</Text>
          </Pressable>
        </View>

        <View style={styles.groupedCard}>
          {/* Date of Birth */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Date of Birth</Text>
            <Text style={styles.rowValue}>
              {profile.dateOfBirth
                ? `${formatDate(profile.dateOfBirth)}${age !== null ? ` (${age} yrs)` : ''}`
                : 'Not set'}
            </Text>
          </View>

          <View style={styles.rowDivider} />

          {/* Biological Sex */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Biological Sex</Text>
            <Text style={styles.rowValue}>
              {profile.biologicalSex
                ? profile.biologicalSex.charAt(0).toUpperCase() + profile.biologicalSex.slice(1)
                : 'Not set'}
            </Text>
          </View>

          <View style={styles.rowDivider} />

          {/* Phone Number */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Phone Number</Text>
            <Text style={styles.rowValue}>{profile.phone || 'Not set'}</Text>
          </View>

          <View style={styles.rowDivider} />

          {/* Address */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Address</Text>
            <Text style={[styles.rowValue, styles.addressValue]} numberOfLines={2}>
              {profile.address || 'Not set'}
            </Text>
          </View>
        </View>

        {/* ─────────────────────────────
            4. SECURITY & PREFERENCES
        ───────────────────────────── */}
        <Text style={styles.sectionLabel}>SECURITY &amp; PREFERENCES</Text>
        <View style={styles.groupedCard}>
          {/* Active QR Shares */}
          <Pressable
            onPress={() => router.push('/(tabs)/share')}
            style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="View active QR shares"
          >
            <View style={styles.navRowLeft}>
              <Ionicons name="share-social-outline" size={18} color={TEAL} />
              <Text style={styles.navRowLabel}>Active QR Shares</Text>
            </View>
            <View style={styles.navRowRight}>
              <Text style={[styles.statusText, activeSharesCount > 0 && styles.activeSharesText]}>
                {activeSharesCount === 0 ? 'None' : `${activeSharesCount} Active`}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={MUTED} />
            </View>
          </Pressable>

          <View style={styles.rowDivider} />

          {/* Change Password */}
          <Pressable
            onPress={() => setPasswordModalVisible(true)}
            style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Change password"
          >
            <View style={styles.navRowLeft}>
              <Ionicons name="lock-closed-outline" size={18} color={TEAL} />
              <Text style={styles.navRowLabel}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={MUTED} />
          </Pressable>

          <View style={styles.rowDivider} />

          {/* Export Health Vault */}
          <Pressable
            onPress={handleExportData}
            style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Export health vault JSON archive"
          >
            <View style={styles.navRowLeft}>
              <Ionicons name="download-outline" size={18} color={TEAL} />
              <View>
                <Text style={styles.navRowLabel}>Export Health Vault</Text>
                <Text style={styles.navRowSub}>JSON Archive</Text>
              </View>
            </View>
            <Ionicons name="share-outline" size={18} color={TEAL} />
          </Pressable>

          <View style={styles.rowDivider} />

          {/* Biometric App Unlock */}
          <View style={styles.switchRow}>
            <View style={styles.navRowLeft}>
              <Ionicons name="finger-print-outline" size={18} color={TEAL} />
              <View>
                <Text style={styles.navRowLabel}>Biometric App Unlock</Text>
                <Text style={styles.navRowSub}>Face ID / Touch ID on launch</Text>
              </View>
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

          <View style={styles.rowDivider} />

          {/* Push Notifications */}
          <View style={styles.switchRow}>
            <View style={styles.navRowLeft}>
              <Ionicons name="notifications-outline" size={18} color={TEAL} />
              <View>
                <Text style={styles.navRowLabel}>Push Notifications</Text>
                <Text style={styles.navRowSub}>Sharing alerts and updates</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={(val) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setNotificationsEnabled(val);
              }}
              trackColor={{ false: '#D9E7E4', true: TEAL }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.rowDivider} />

          {/* About MedRec & Disclaimer */}
          <Pressable
            onPress={handleShowDisclaimer}
            style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="About MedRec and clinical disclaimer"
          >
            <View style={styles.navRowLeft}>
              <Ionicons name="information-circle-outline" size={18} color={TEAL} />
              <Text style={styles.navRowLabel}>About MedRec &amp; Disclaimer</Text>
            </View>
            <View style={styles.navRowRight}>
              <Text style={styles.versionText}>v1.0.0</Text>
              <Ionicons name="chevron-forward" size={16} color={MUTED} />
            </View>
          </Pressable>
        </View>

        {/* ─────────────────────────────
            5. ACCOUNT ACTIONS & FOOTER
        ───────────────────────────── */}
        <View style={[styles.groupedCard, { marginTop: 8 }]}>
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [styles.signOutRow, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Sign out of MedRec account"
          >
            <Ionicons name="log-out-outline" size={18} color={RED} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>

        {/* Delete Account Link */}
        <Pressable
          onPress={handleDeleteAccount}
          style={({ pressed }) => [styles.deleteLink, pressed && styles.pressed]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Permanently delete account and health vault"
        >
          <Text style={styles.deleteLinkText}>Delete Account &amp; Health Vault</Text>
        </Pressable>
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

      {/* Side Menu Drawer */}
      <SideMenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} />

      {/* Notification Center Modal */}
      <NotificationCenterModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
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

  /* ─────────────────────────────
     FIXED GLOBAL TOOLBAR
  ───────────────────────────── */
  topToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 8,
    backgroundColor: BG,
    zIndex: 10,
  },
  iconBtn: {
    padding: 2,
  },
  toolbarIcon: {
    width: 25,
    height: 25,
    resizeMode: 'contain',
  },
  notificationDot: {
    position: 'absolute',
    right: -1,
    top: -1,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: TEAL,
    borderWidth: 1.5,
    borderColor: BG,
  },

  /* ─────────────────────────────
     SCROLLABLE TITLE SECTION
  ───────────────────────────── */
  titleSection: {
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  screenTitle: {
    ...Typography.display,
    color: INK,
  },
  screenSubtitle: {
    ...Typography.subtitle,
    color: MUTED,
    marginTop: 2,
  },

  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 4,
    gap: 12,
  },

  /* ─────────────────────────────
     1. UNBOXED HERO SECTION
  ───────────────────────────── */
  heroSection: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  avatarContainer: {
    position: 'relative',
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E5F0EE',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: BG,
  },
  avatarText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 24,
    color: '#FFFFFF',
  },
  userName: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 20,
    color: INK,
    textAlign: 'center',
  },
  userEmail: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
  },
  metadataLine: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    marginTop: 2,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  editProfileBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13,
    color: TEAL,
  },

  /* ─────────────────────────────
     SECTION HEADERS & INSET CARDS
  ───────────────────────────── */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  sectionLabel: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  sectionEditLink: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  sectionEditLinkText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13,
    color: TEAL,
  },
  groupedCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },

  /* ─────────────────────────────
     KEY-VALUE & NAVIGATION ROWS
  ───────────────────────────── */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  rowLabel: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 14,
    color: MUTED,
    flex: 1,
  },
  rowValue: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 14,
    color: INK,
    textAlign: 'right',
    flexShrink: 1,
  },
  rowValueBold: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 14,
    color: INK,
    textAlign: 'right',
  },
  bloodTypeText: {
    color: INK,
    fontFamily: 'LexendDeca-Bold',
  },
  allergyText: {
    color: RED,
    fontFamily: 'LexendDeca-Medium',
  },
  addressValue: {
    maxWidth: '60%',
    textAlign: 'right',
  },
  mutedValue: {
    color: MUTED,
    fontFamily: 'LexendDeca-Regular',
  },
  rowDivider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginLeft: 16,
  },

  /* ─────────────────────────────
     CONTACT ROW
  ───────────────────────────── */
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  contactInfo: {
    flex: 1,
    gap: 2,
  },
  contactName: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 14,
    color: INK,
  },
  callActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F0F9F7',
  },
  callActionText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12,
    color: TEAL,
  },

  /* ─────────────────────────────
     NAV ROWS & SWITCHES
  ───────────────────────────── */
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  navRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  navRowLabel: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 14,
    color: INK,
  },
  navRowSub: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    color: MUTED,
    marginTop: 1,
  },
  navRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: MUTED,
  },
  activeSharesText: {
    fontFamily: 'LexendDeca-SemiBold',
    color: TEAL,
  },
  versionText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: MUTED,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 48,
  },

  /* ─────────────────────────────
     DESTRUCTIVE ACTIONS & FOOTER
  ───────────────────────────── */
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  signOutText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 15,
    color: RED,
  },
  deleteLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  deleteLinkText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: RED,
    opacity: 0.75,
  },

  pressed: {
    opacity: 0.7,
  },
});
