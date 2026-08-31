import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  Share,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Colors, Radii, Typography } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import EmergencyIdModal from '../EmergencyIdModal';

const TEAL = Colors.teal;
const INK = Colors.ink;
const MUTED = Colors.muted;
const BORDER = Colors.border;
const CARD_BG = Colors.cardBg;

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return 'MR';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface TabletPersistentSidebarProps {
  onOpenAiSummary?: () => void;
}

export const TabletPersistentSidebar: React.FC<TabletPersistentSidebarProps> = ({
  onOpenAiSummary,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { insets, scaleFont } = useResponsive();

  const [activeSharesCount, setActiveSharesCount] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [aiSummaryVisible, setAiSummaryVisible] = useState(false);
  const [aiSummaryText, setAiSummaryText] = useState<string | null>(null);
  const [emergencyModalVisible, setEmergencyModalVisible] = useState(false);
  const [profileData, setProfileData] = useState<any>({});

  useEffect(() => {
    api
      .listShares()
      .then((res: any) => {
        if (res && Array.isArray(res.shares)) {
          const now = new Date();
          const active = res.shares.filter(
            (s: any) => !s.revoked_at && new Date(s.expires_at) > now
          );
          setActiveSharesCount(active.length);
        }
      })
      .catch(() => {});

    api
      .getProfile()
      .then((res: any) => {
        if (res && res.profile) {
          setProfileData(res.profile);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const isRecordsActive =
    pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
  const isShareActive = pathname.includes('share');
  const isScanActive = pathname.includes('scan');
  const isProfileActive = pathname.includes('profile');

  const handleSummarize = async () => {
    if (onOpenAiSummary) {
      onOpenAiSummary();
      return;
    }
    setSummarizing(true);
    try {
      const data = await api.summarize();
      setAiSummaryText(data.summary);
      setAiSummaryVisible(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('AI Summary Failed', err.message || 'Could not generate AI summary.');
    } finally {
      setSummarizing(false);
    }
  };

  const handleExportVault = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const [recordsRes, profileRes] = await Promise.all([
        api.getRecords().catch(() => ({ records: [] })),
        api.getProfile().catch(() => ({ profile: {} })),
      ]);

      const archive = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        app: 'MedRec Health Vault',
        user: {
          name: user?.name,
          email: user?.email,
        },
        profile: profileRes.profile,
        recordsCount: recordsRes.records.length,
        records: recordsRes.records,
      };

      await Share.share({
        title: `MedRec_Health_Vault_${new Date().toISOString().split('T')[0]}.json`,
        message: JSON.stringify(archive, null, 2),
      });
    } catch (err: any) {
      Alert.alert('Export Failed', err.message || 'Unable to export health vault.');
    } finally {
      setExporting(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of your MedRec account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <View
      style={[
        styles.sidebarContainer,
        {
          paddingTop: insets.top + 14,
          paddingBottom: Math.max(insets.bottom, 14),
        },
      ]}
    >
      {/* 1. Header Branding */}
      <View style={styles.brandHeader}>
        <Image
          source={require('../../assets/logo/logo.png')}
          style={styles.brandLogo}
          resizeMode="contain"
        />
        <View style={styles.brandTextGroup}>
          <Text style={styles.brandTitle}>MedRec</Text>
          <Text style={styles.brandSubtitle}>Health Vault</Text>
        </View>
      </View>

      {/* 2. Patient Profile Card */}
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          router.push('/(tabs)/profile');
        }}
        style={({ pressed }) => [styles.userCard, pressed && styles.userCardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`User profile: ${user?.name || 'Patient'}`}
      >
        <View style={styles.avatarBox}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarMonogram}>
              <Text style={styles.avatarInitials}>{getInitials(user?.name)}</Text>
            </View>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {user?.name || 'Patient'}
          </Text>
          <Text style={styles.userEmail} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {user?.email || 'patient@medrec.health'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={MUTED} style={{ opacity: 0.6 }} />
      </Pressable>

      {/* 3. Primary Quick Action CTA Button */}
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          router.push('/record/add');
        }}
        style={({ pressed }) => [styles.addRecordBtn, pressed && styles.btnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Add New Health Record"
      >
        <Image
          source={require('../../assets/icons/add-record.png')}
          style={styles.addRecordIcon}
        />
        <Text style={styles.addRecordText}>Add Health Record</Text>
      </Pressable>

      {/* 4. Scrollable Nav Items */}
      <ScrollView
        style={styles.scrollNav}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader} maxFontSizeMultiplier={1.3}>
            NAVIGATION
          </Text>

          {/* Records Tab */}
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/(tabs)');
            }}
            style={({ pressed }) => [
              styles.navRow,
              isRecordsActive && styles.navRowActive,
              pressed && styles.navRowPressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isRecordsActive }}
          >
            {isRecordsActive && <View style={styles.activeIndicatorPill} />}
            <View style={[styles.navIconBox, isRecordsActive && styles.navIconBoxActive]}>
              <Image
                source={
                  isRecordsActive
                    ? require('../../assets/icons/records-active.png')
                    : require('../../assets/icons/records-inactive.png')
                }
                style={styles.navIcon}
              />
            </View>
            <Text
              style={[
                styles.navLabel,
                isRecordsActive && styles.navLabelActive,
                { fontSize: scaleFont(13.5, 12.5, 15) },
              ]}
              maxFontSizeMultiplier={1.3}
            >
              My Records
            </Text>
          </Pressable>

          {/* Share Records Tab */}
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/(tabs)/share');
            }}
            style={({ pressed }) => [
              styles.navRow,
              isShareActive && styles.navRowActive,
              pressed && styles.navRowPressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isShareActive }}
          >
            {isShareActive && <View style={styles.activeIndicatorPill} />}
            <View style={[styles.navIconBox, isShareActive && styles.navIconBoxActive]}>
              <Image
                source={
                  isShareActive
                    ? require('../../assets/icons/share-active.png')
                    : require('../../assets/icons/share-inactive.png')
                }
                style={styles.navIcon}
              />
            </View>
            <View style={styles.navLabelWrapper}>
              <Text
                style={[
                  styles.navLabel,
                  isShareActive && styles.navLabelActive,
                  { fontSize: scaleFont(13.5, 12.5, 15) },
                ]}
                maxFontSizeMultiplier={1.3}
              >
                Doctor Share QR
              </Text>
              {activeSharesCount !== null && activeSharesCount > 0 && (
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>{activeSharesCount}</Text>
                </View>
              )}
            </View>
          </Pressable>

          {/* Doctor Scanner Tab */}
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/(tabs)/scan');
            }}
            style={({ pressed }) => [
              styles.navRow,
              isScanActive && styles.navRowActive,
              pressed && styles.navRowPressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isScanActive }}
          >
            {isScanActive && <View style={styles.activeIndicatorPill} />}
            <View style={[styles.navIconBox, isScanActive && styles.navIconBoxActive]}>
              <Image
                source={
                  isScanActive
                    ? require('../../assets/icons/scan-active.png')
                    : require('../../assets/icons/scan-inactive.png')
                }
                style={styles.navIcon}
              />
            </View>
            <Text
              style={[
                styles.navLabel,
                isScanActive && styles.navLabelActive,
                { fontSize: scaleFont(13.5, 12.5, 15) },
              ]}
              maxFontSizeMultiplier={1.3}
            >
              Scan Doctor QR
            </Text>
          </Pressable>

          {/* Profile & Medical ID Tab */}
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/(tabs)/profile');
            }}
            style={({ pressed }) => [
              styles.navRow,
              isProfileActive && styles.navRowActive,
              pressed && styles.navRowPressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isProfileActive }}
          >
            {isProfileActive && <View style={styles.activeIndicatorPill} />}
            <View style={[styles.navIconBox, isProfileActive && styles.navIconBoxActive]}>
              <Image
                source={
                  isProfileActive
                    ? require('../../assets/icons/profile-active.png')
                    : require('../../assets/icons/profile-inactive.png')
                }
                style={styles.navIcon}
              />
            </View>
            <Text
              style={[
                styles.navLabel,
                isProfileActive && styles.navLabelActive,
                { fontSize: scaleFont(13.5, 12.5, 15) },
              ]}
              maxFontSizeMultiplier={1.3}
            >
              Profile &amp; ID
            </Text>
          </Pressable>
        </View>

        {/* Clinical Tools Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader} maxFontSizeMultiplier={1.3}>
            CLINICAL TOOLS
          </Text>

          {/* AI Health Summary */}
          <Pressable
            onPress={handleSummarize}
            disabled={summarizing}
            style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
            accessibilityRole="button"
            accessibilityLabel="Generate AI Health Summary"
          >
            <View style={[styles.navIconBox, { backgroundColor: Colors.blueLight }]}>
              {summarizing ? (
                <ActivityIndicator size="small" color={Colors.blue} />
              ) : (
                <Image
                  source={require('../../assets/icons/AI.png')}
                  style={[styles.navIcon, { tintColor: Colors.blue }]}
                />
              )}
            </View>
            <Text
              style={[
                styles.navLabel,
                { fontSize: scaleFont(13.5, 12.5, 15) },
              ]}
              maxFontSizeMultiplier={1.3}
            >
              {summarizing ? 'Analyzing Vault...' : 'AI Health Summary'}
            </Text>
          </Pressable>

          {/* Emergency Paramedic ID Card */}
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setEmergencyModalVisible(true);
            }}
            style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
            accessibilityRole="button"
            accessibilityLabel="View First Responder Emergency ID Card"
          >
            <View style={[styles.navIconBox, { backgroundColor: Colors.redLight }]}>
              <Ionicons name="medical" size={17} color={Colors.red} />
            </View>
            <Text
              style={[
                styles.navLabel,
                { fontSize: scaleFont(13.5, 12.5, 15) },
              ]}
              maxFontSizeMultiplier={1.3}
            >
              Emergency ID Card
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* 5. Pinned Vault Footer */}
      <View style={styles.footerSection}>
        {/* Export Health Vault */}
        <Pressable
          onPress={handleExportVault}
          disabled={exporting}
          style={({ pressed }) => [styles.footerActionRow, pressed && styles.navRowPressed]}
          accessibilityRole="button"
          accessibilityLabel="Export Health Vault Data as JSON"
        >
          <Ionicons name="cloud-download-outline" size={17} color={INK} />
          <Text style={styles.footerActionText}>
            {exporting ? 'Exporting...' : 'Export Vault (JSON)'}
          </Text>
        </Pressable>

        {/* Sign Out */}
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [styles.footerActionRow, pressed && styles.navRowPressed]}
          accessibilityRole="button"
          accessibilityLabel="Sign Out of MedRec"
        >
          <Ionicons name="log-out-outline" size={17} color={Colors.red} />
          <Text style={[styles.footerActionText, { color: Colors.red }]}>Sign Out</Text>
        </Pressable>

        <Text style={styles.versionText} maxFontSizeMultiplier={1.2}>
          MedRec v1.0.0 • Encrypted Vault
        </Text>
      </View>

      {/* Emergency Medical ID Modal */}
      <EmergencyIdModal
        visible={emergencyModalVisible}
        profile={profileData}
        userName={user?.name || ''}
        userEmail={user?.email || ''}
        onClose={() => setEmergencyModalVisible(false)}
      />

      {/* Formatted AI Health Summary Floating Modal */}
      <Modal
        visible={aiSummaryVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setAiSummaryVisible(false)}
      >
        <View style={styles.summaryModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setAiSummaryVisible(false)}
          />
          <View style={styles.summaryModalContent}>
            <View style={styles.summaryModalHeader}>
              <View style={styles.summaryHeaderTitleRow}>
                <View style={styles.summaryIconBox}>
                  <Image
                    source={require('../../assets/icons/AI.png')}
                    style={styles.summaryIcon}
                  />
                </View>
                <View>
                  <Text style={styles.summaryHeaderTitle}>AI Health Summary</Text>
                  <Text style={styles.summaryHeaderSub}>Clinical vault synthesis</Text>
                </View>
              </View>
              <Pressable
                onPress={() => setAiSummaryVisible(false)}
                style={styles.summaryCloseBtn}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close AI summary modal"
              >
                <Ionicons name="close" size={20} color={INK} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.summaryScroll}
              contentContainerStyle={styles.summaryScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.summaryDisclaimerBadge}>
                <Ionicons name="information-circle" size={15} color={Colors.blue} />
                <Text style={styles.summaryDisclaimerText}>
                  AI-synthesized from your sovereign health records. This summary does not constitute professional medical advice.
                </Text>
              </View>

              <View style={styles.summaryTextCard}>
                <Text style={styles.summaryBodyText}>{aiSummaryText}</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebarContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 260,
    backgroundColor: CARD_BG,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    zIndex: 99,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 2, height: 0 },
    elevation: 8,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 14,
    gap: 10,
  },
  brandLogo: {
    width: 36,
    height: 36,
  },
  brandTextGroup: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 20,
    color: INK,
    lineHeight: 24,
  },
  brandSubtitle: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    color: MUTED,
    lineHeight: 14,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FCFB',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5F0EE',
    marginHorizontal: 14,
    marginBottom: 12,
  },
  userCardPressed: {
    backgroundColor: '#EDFAF7',
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarMonogram: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 14,
    color: TEAL,
  },
  userInfo: {
    flex: 1,
    marginLeft: 10,
    gap: 1,
  },
  userName: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13.5,
    color: INK,
  },
  userEmail: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    color: MUTED,
  },
  addRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TEAL,
    borderRadius: Radii.button,
    height: 44,
    marginHorizontal: 14,
    marginBottom: 12,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  addRecordIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
  },
  addRecordText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.85,
  },
  scrollNav: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 4,
    gap: 14,
  },
  section: {
    gap: 3,
  },
  sectionHeader: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 10,
    color: MUTED,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginHorizontal: 8,
    borderRadius: 10,
    gap: 10,
    position: 'relative',
    minHeight: 44,
  },
  navRowActive: {
    backgroundColor: '#EDFAF7',
  },
  navRowPressed: {
    backgroundColor: '#F1F7F6',
  },
  activeIndicatorPill: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3.5,
    borderRadius: 2,
    backgroundColor: TEAL,
  },
  navIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconBoxActive: {
    backgroundColor: Colors.tealLight,
  },
  navIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  navLabelWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navLabel: {
    fontFamily: 'LexendDeca-Regular',
    color: INK,
  },
  navLabelActive: {
    fontFamily: 'LexendDeca-SemiBold',
    color: TEAL,
  },
  badgePill: {
    backgroundColor: TEAL,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 10.5,
    color: '#FFFFFF',
  },
  footerSection: {
    borderTopWidth: 1,
    borderTopColor: '#F0F5F4',
    paddingTop: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  footerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 10,
    minHeight: 38,
  },
  footerActionText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12.5,
    color: INK,
  },
  versionText: {
    textAlign: 'center',
    fontFamily: 'LexendDeca-Regular',
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },

  /* AI Summary Floating Modal Styles */
  summaryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  summaryModalContent: {
    width: '100%',
    maxWidth: 580,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  summaryModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F5F4',
    backgroundColor: '#FFFFFF',
  },
  summaryHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIcon: {
    width: 20,
    height: 20,
    tintColor: Colors.blue,
    resizeMode: 'contain',
  },
  summaryHeaderTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 16,
    color: INK,
  },
  summaryHeaderSub: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11.5,
    color: MUTED,
  },
  summaryCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryScroll: {
    flex: 1,
  },
  summaryScrollContent: {
    padding: 20,
    gap: 14,
  },
  summaryDisclaimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  summaryDisclaimerText: {
    flex: 1,
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11.5,
    color: '#1E40AF',
    lineHeight: 16,
  },
  summaryTextCard: {
    backgroundColor: '#FAFCFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5F0EE',
    padding: 18,
  },
  summaryBodyText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13.5,
    color: INK,
    lineHeight: 22,
  },
});

export default TabletPersistentSidebar;
