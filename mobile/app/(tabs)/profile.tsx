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
import { Colors, Radii, ResponsiveLimits } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';

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
  const { user, setUser, logout } = useAuth();
  const {
    isTablet,
    screenPadding,
    insets,
    scaleFont,
    tabBarClearance,
  } = useResponsive();

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
      setProfile((prev) => ({ ...prev, avatarUrl: photoPayload }));
      setUser((prev) => (prev ? { ...prev, avatarUrl: photoPayload } : null));

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

  // Card 1: Emergency & Medical ID Card
  const emergencyMedicalCard = (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.35}>
          EMERGENCY &amp; MEDICAL ID
        </Text>
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

        {/* Organ Donor Status */}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Organ Donor</Text>
          <Text style={styles.rowValue}>
            {profile.organDonor ? 'Yes (Registered Donor)' : 'No / Not registered'}
          </Text>
        </View>

        <View style={styles.rowDivider} />

        {/* Primary ICE Contact */}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Emergency Contact</Text>
          <View style={styles.emergencyContactRight}>
            <Text
              style={[
                styles.rowValueBold,
                !profile.emergencyContactName && styles.mutedValue,
              ]}
              numberOfLines={1}
            >
              {profile.emergencyContactName || 'Not listed'}
            </Text>
            {profile.emergencyContactRelationship ? (
              <Text style={styles.emergencyRelationBadge}>
                {profile.emergencyContactRelationship}
              </Text>
            ) : null}
          </View>
        </View>

        {profile.emergencyContactPhone ? (
          <>
            <View style={styles.rowDivider} />
            <Pressable
              onPress={handleCallEmergency}
              style={({ pressed }) => [styles.callRowBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Call emergency contact ${profile.emergencyContactName}`}
            >
              <View style={styles.callRowIconBox}>
                <Ionicons name="call" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.callRowText} numberOfLines={1}>
                Call {profile.emergencyContactPhone}
              </Text>
            </Pressable>
          </>
        ) : null}

        <View style={styles.rowDivider} />

        {/* Open Full Paramedic Card Action */}
        <Pressable
          onPress={() => setEmergencyModalVisible(true)}
          style={({ pressed }) => [styles.openEmergencyBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Open First Responder Medical ID Card"
        >
          <Ionicons name="medical" size={16} color={RED} />
          <Text style={styles.openEmergencyBtnText}>First Responder QR &amp; ID Card</Text>
          <Ionicons name="chevron-forward" size={15} color={MUTED} />
        </Pressable>
      </View>
    </View>
  );

  // Card 2: Personal Demographics Card
  const personalDemographicsCard = (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.35}>
          PERSONAL INFORMATION
        </Text>
        <Pressable
          onPress={handleEditDemographics}
          style={({ pressed }) => [styles.sectionEditLink, pressed && styles.pressed]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Edit personal demographics"
        >
          <Text style={styles.sectionEditLinkText}>Edit</Text>
        </Pressable>
      </View>

      <View style={styles.groupedCard}>
        {/* Date of Birth & Calculated Age */}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Date of Birth</Text>
          <Text
            style={[styles.rowValue, !profile.dateOfBirth && styles.mutedValue]}
          >
            {formatDate(profile.dateOfBirth)}
            {age !== null ? ` (${age} yrs)` : ''}
          </Text>
        </View>

        <View style={styles.rowDivider} />

        {/* Biological Sex */}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Biological Sex</Text>
          <Text
            style={[styles.rowValue, !profile.biologicalSex && styles.mutedValue]}
          >
            {profile.biologicalSex
              ? profile.biologicalSex.charAt(0).toUpperCase() + profile.biologicalSex.slice(1)
              : 'Not set'}
          </Text>
        </View>

        <View style={styles.rowDivider} />

        {/* Height & Weight */}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Height &amp; Weight</Text>
          <Text
            style={[
              styles.rowValue,
              !profile.height && !profile.weight && styles.mutedValue,
            ]}
          >
            {profile.height ? `${profile.height} cm` : '—'} /{' '}
            {profile.weight ? `${profile.weight} kg` : '—'}
          </Text>
        </View>

        <View style={styles.rowDivider} />

        {/* Contact Phone */}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Phone Number</Text>
          <Text
            style={[styles.rowValue, !profile.phone && styles.mutedValue]}
            numberOfLines={1}
          >
            {profile.phone || 'Not set'}
          </Text>
        </View>

        <View style={styles.rowDivider} />

        {/* Primary Address */}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Address</Text>
          <Text
            style={[styles.rowValue, !profile.address && styles.mutedValue]}
            numberOfLines={2}
          >
            {profile.address || 'Not set'}
          </Text>
        </View>
      </View>
    </View>
  );

  // Card 3: Security & Preferences Card
  const securityCard = (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.35}>
        SECURITY &amp; PREFERENCES
      </Text>

      <View style={styles.groupedCard}>
        {/* Biometrics Toggle */}
        <View style={styles.switchRow}>
          <View style={styles.switchLabelGroup}>
            <Text style={styles.switchTitle}>Biometric Unlock</Text>
            <Text style={styles.switchSubtitle}>Use Face ID / Touch ID to open MedRec</Text>
          </View>
          <Switch
            value={biometricsEnabled}
            onValueChange={(val) => {
              Haptics.selectionAsync();
              setBiometricsEnabled(val);
            }}
            trackColor={{ false: '#E2E8F0', true: TEAL }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.rowDivider} />

        {/* Health Notifications Toggle */}
        <View style={styles.switchRow}>
          <View style={styles.switchLabelGroup}>
            <Text style={styles.switchTitle}>Health Alerts &amp; Logs</Text>
            <Text style={styles.switchSubtitle}>Notifications for doctor QR shares &amp; uploads</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={(val) => {
              Haptics.selectionAsync();
              setNotificationsEnabled(val);
            }}
            trackColor={{ false: '#E2E8F0', true: TEAL }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.rowDivider} />

        {/* Change Password */}
        <Pressable
          onPress={() => setPasswordModalVisible(true)}
          style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Change password"
        >
          <View style={styles.actionIconBox}>
            <Ionicons name="key-outline" size={16} color={INK} />
          </View>
          <Text style={styles.actionTitle}>Change Password</Text>
          <Ionicons name="chevron-forward" size={15} color={MUTED} />
        </Pressable>

        <View style={styles.rowDivider} />

        {/* Export Data Archive */}
        <Pressable
          onPress={handleExportData}
          style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Export all health data as JSON"
        >
          <View style={styles.actionIconBox}>
            <Ionicons name="download-outline" size={16} color={INK} />
          </View>
          <Text style={styles.actionTitle}>Export Health Vault (JSON)</Text>
          <Ionicons name="chevron-forward" size={15} color={MUTED} />
        </Pressable>
      </View>
    </View>
  );

  // Card 4: Legal & Account Actions Card
  const legalAccountCard = (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.35}>
        ACCOUNT &amp; LEGAL
      </Text>

      <View style={styles.groupedCard}>
        {/* Medical Disclaimer */}
        <Pressable
          onPress={handleShowDisclaimer}
          style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="View Medical Disclaimer"
        >
          <View style={styles.actionIconBox}>
            <Ionicons name="information-circle-outline" size={16} color={INK} />
          </View>
          <Text style={styles.actionTitle}>Medical Disclaimer</Text>
          <Ionicons name="chevron-forward" size={15} color={MUTED} />
        </Pressable>

        <View style={styles.rowDivider} />

        {/* Sign Out */}
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Sign Out"
        >
          <View style={[styles.actionIconBox, { backgroundColor: '#FEE4E2' }]}>
            <Ionicons name="log-out-outline" size={16} color={RED} />
          </View>
          <Text style={[styles.actionTitle, { color: RED }]}>Sign Out</Text>
          <Ionicons name="chevron-forward" size={15} color={MUTED} />
        </Pressable>

        <View style={styles.rowDivider} />

        {/* Delete Account */}
        <Pressable
          onPress={handleDeleteAccount}
          style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Delete Account permanently"
        >
          <View style={[styles.actionIconBox, { backgroundColor: '#FEE4E2' }]}>
            <Ionicons name="trash-outline" size={16} color={RED} />
          </View>
          <Text style={[styles.actionTitle, { color: RED }]}>Delete Account</Text>
          <Ionicons name="chevron-forward" size={15} color={MUTED} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Global Navigation Toolbar */}
      <View
        style={[
          styles.topToolbar,
          {
            paddingTop: insets.top + 12,
            paddingLeft: Math.max(insets.left, screenPadding),
            paddingRight: Math.max(insets.right, screenPadding),
          },
        ]}
      >
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
          { paddingBottom: Math.max(insets.bottom, 20) + tabBarClearance },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />
        }
      >
        <View
          style={[
            styles.containerInner,
            isTablet && {
              maxWidth: ResponsiveLimits.maxContentWidth,
              alignSelf: 'center',
              width: '100%',
            },
          ]}
        >
          {/* Profile Title */}
          <View style={[styles.titleSection, { paddingHorizontal: screenPadding }]}>
            <Text
              style={[
                styles.screenTitle,
                { fontSize: scaleFont(26, 22, 30) },
              ]}
              maxFontSizeMultiplier={1.35}
            >
              Profile
            </Text>
            <Text
              style={[
                styles.screenSubtitle,
                { fontSize: scaleFont(12, 11, 13.5) },
              ]}
              maxFontSizeMultiplier={1.35}
            >
              Manage your personal and medical ID
            </Text>
          </View>

          {/* 1. UNBOXED PROFILE HERO */}
          <View style={[styles.heroSection, { paddingHorizontal: screenPadding }]}>
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

            <Text
              style={[
                styles.userName,
                { fontSize: scaleFont(20, 18, 23) },
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.35}
            >
              {user?.name || 'Patient'}
            </Text>
            <Text
              style={[
                styles.userEmail,
                { fontSize: scaleFont(13, 11.5, 14.5) },
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.35}
            >
              {user?.email || 'patient@medrec.local'}
            </Text>

            {/* Plain Text Metadata Summary */}
            <Text
              style={[
                styles.metadataLine,
                { fontSize: scaleFont(12.5, 11, 13.5) },
              ]}
              maxFontSizeMultiplier={1.35}
            >
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

          {/* Grouped Sections */}
          <View style={{ paddingHorizontal: screenPadding, gap: 20 }}>
            {isTablet ? (
              <>
                {/* Tablet Row 1: Emergency ID & Demographics */}
                <View style={styles.tabletRow}>
                  <View style={styles.tabletCol}>{emergencyMedicalCard}</View>
                  <View style={styles.tabletCol}>{personalDemographicsCard}</View>
                </View>

                {/* Tablet Row 2: Security & Legal */}
                <View style={styles.tabletRow}>
                  <View style={styles.tabletCol}>{securityCard}</View>
                  <View style={styles.tabletCol}>{legalAccountCard}</View>
                </View>
              </>
            ) : (
              <>
                {emergencyMedicalCard}
                {personalDemographicsCard}
                {securityCard}
                {legalAccountCard}
              </>
            )}

            {/* Version Footer */}
            <View style={styles.versionContainer}>
              <Text style={styles.versionText} maxFontSizeMultiplier={1.35}>
                MedRec v1.0.0 (Build 2026) · Encrypted Sovereign Health Vault
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Profile Edit Demographics & Medical ID Modal */}
      <ProfileEditModal
        visible={editModalVisible}
        mode={editMode}
        initialData={profile}
        userName={user?.name || ''}
        onClose={() => setEditModalVisible(false)}
        onSaved={handleProfileUpdated}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
      />

      {/* First Responder Medical ID Card Modal */}
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
  topToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  iconBtn: {
    padding: 4,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarIcon: {
    width: 25,
    height: 25,
    resizeMode: 'contain',
  },
  notificationDot: {
    position: 'absolute',
    right: 8,
    top: 5,
    width: 10,
    height: 9,
    borderRadius: 5,
    backgroundColor: TEAL,
    borderWidth: 1.5,
    borderColor: BG,
  },
  scrollContent: {
    flexGrow: 1,
  },
  containerInner: {
    paddingBottom: 8,
  },
  titleSection: {
    marginBottom: 12,
  },
  screenTitle: {
    fontFamily: 'LexendDeca-Bold',
    color: INK,
  },
  screenSubtitle: {
    fontFamily: 'LexendDeca-Regular',
    color: MUTED,
    marginTop: 2,
  },

  /* Unboxed Profile Hero */
  heroSection: {
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 6,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 28,
    color: '#FFFFFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontFamily: 'LexendDeca-Bold',
    color: INK,
  },
  userEmail: {
    fontFamily: 'LexendDeca-Regular',
    color: MUTED,
    marginTop: 2,
  },
  metadataLine: {
    fontFamily: 'LexendDeca-Regular',
    color: MUTED,
    marginTop: 4,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EAF6F3',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 10,
    minHeight: 32,
  },
  editProfileBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12,
    color: TEAL,
  },

  /* Tablet Layout Rows */
  tabletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  tabletCol: {
    flex: 1,
  },

  /* Grouped Card Sections */
  sectionBlock: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11,
    color: MUTED,
    letterSpacing: 0.6,
  },
  sectionEditLink: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  sectionEditLinkText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12.5,
    color: TEAL,
  },
  groupedCard: {
    backgroundColor: CARD_BG,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 46,
  },
  rowLabel: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: INK,
    flex: 1,
  },
  rowValue: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: INK,
    textAlign: 'right',
    flex: 1.2,
  },
  rowValueBold: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13,
    color: INK,
    textAlign: 'right',
    flex: 1.2,
  },
  bloodTypeText: {
    color: RED,
    fontFamily: 'LexendDeca-Bold',
  },
  allergyText: {
    color: RED,
  },
  mutedValue: {
    color: MUTED,
  },
  emergencyContactRight: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  emergencyRelationBadge: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 9,
    color: TEAL,
    backgroundColor: '#DDF5EE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  callRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EDFAF7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  callRowIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callRowText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13,
    color: TEAL,
  },
  openEmergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    backgroundColor: '#FFFBFA',
    minHeight: 46,
  },
  openEmergencyBtnText: {
    flex: 1,
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13,
    color: RED,
  },
  rowDivider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginLeft: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  switchLabelGroup: {
    flex: 1,
    gap: 2,
    paddingRight: 10,
  },
  switchTitle: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: INK,
  },
  switchSubtitle: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    color: MUTED,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
    minHeight: 46,
  },
  actionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    flex: 1,
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: INK,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  versionText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    color: MUTED,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
