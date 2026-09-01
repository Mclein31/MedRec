import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { api } from '../../lib/api';
import { Colors, Radii, LandscapeTokens } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import EmergencyIdModal from '../EmergencyIdModal';
import NotificationCenterModal from '../notifications/NotificationCenterModal';

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

interface TabletLandscapeNavRailProps {
  onOpenAiSummary?: () => void;
}

export const TabletLandscapeNavRail: React.FC<TabletLandscapeNavRailProps> = ({
  onOpenAiSummary,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { unreadCount, refreshNotifications } = useNotifications();
  const { insets } = useResponsive();

  const [activeSharesCount, setActiveSharesCount] = useState<number | null>(null);
  const [emergencyModalVisible, setEmergencyModalVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [profileData, setProfileData] = useState<any>({});
  const [aiSummaryVisible, setAiSummaryVisible] = useState(false);
  const [aiSummaryText, setAiSummaryText] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

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

  return (
    <View
      style={[
        styles.railContainer,
        {
          paddingTop: Math.max(insets.top, 14) + 6,
          paddingBottom: Math.max(insets.bottom, 14) + 6,
        },
      ]}
    >
      {/* 1. Top Brand Glyph */}
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          router.push('/(tabs)');
        }}
        style={styles.brandBox}
        accessibilityRole="button"
        accessibilityLabel="MedRec Home"
      >
        <Image
          source={require('../../assets/logo/logo.png')}
          style={styles.brandLogo}
          resizeMode="contain"
        />
      </Pressable>

      {/* 2. Primary Navigation Route Items */}
      <View style={styles.navGroup}>
        {/* Records Route */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/(tabs)');
          }}
          style={({ pressed }) => [
            styles.navItem,
            isRecordsActive && styles.navItemActive,
            pressed && styles.navItemPressed,
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: isRecordsActive }}
          accessibilityLabel="Records tab"
        >
          {isRecordsActive && <View style={styles.activeIndicatorBar} />}
          <View style={[styles.iconBox, isRecordsActive && styles.iconBoxActive]}>
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
            style={[styles.navLabel, isRecordsActive && styles.navLabelActive]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            Records
          </Text>
        </Pressable>

        {/* Share Route */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/(tabs)/share');
          }}
          style={({ pressed }) => [
            styles.navItem,
            isShareActive && styles.navItemActive,
            pressed && styles.navItemPressed,
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: isShareActive }}
          accessibilityLabel="Share tab"
        >
          {isShareActive && <View style={styles.activeIndicatorBar} />}
          <View style={[styles.iconBox, isShareActive && styles.iconBoxActive]}>
            <Image
              source={
                isShareActive
                  ? require('../../assets/icons/share-active.png')
                  : require('../../assets/icons/share-inactive.png')
              }
              style={styles.navIcon}
            />
            {activeSharesCount !== null && activeSharesCount > 0 && (
              <View style={styles.badgeIndicator}>
                <Text style={styles.badgeText}>{activeSharesCount}</Text>
              </View>
            )}
          </View>
          <Text
            style={[styles.navLabel, isShareActive && styles.navLabelActive]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            Share
          </Text>
        </Pressable>

        {/* Scan Route */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/(tabs)/scan');
          }}
          style={({ pressed }) => [
            styles.navItem,
            isScanActive && styles.navItemActive,
            pressed && styles.navItemPressed,
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: isScanActive }}
          accessibilityLabel="Scan tab"
        >
          {isScanActive && <View style={styles.activeIndicatorBar} />}
          <View style={[styles.iconBox, isScanActive && styles.iconBoxActive]}>
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
            style={[styles.navLabel, isScanActive && styles.navLabelActive]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            Scan
          </Text>
        </Pressable>

        {/* Profile Route */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/(tabs)/profile');
          }}
          style={({ pressed }) => [
            styles.navItem,
            isProfileActive && styles.navItemActive,
            pressed && styles.navItemPressed,
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: isProfileActive }}
          accessibilityLabel="Profile tab"
        >
          {isProfileActive && <View style={styles.activeIndicatorBar} />}
          <View style={[styles.iconBox, isProfileActive && styles.iconBoxActive]}>
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
            style={[styles.navLabel, isProfileActive && styles.navLabelActive]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            Profile
          </Text>
        </Pressable>
      </View>

      {/* 3. Quick Action Button: Add Record CTA */}
      <View style={styles.quickActionBox}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/record/add');
          }}
          style={({ pressed }) => [styles.quickAddBtn, pressed && styles.btnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Add New Health Record"
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.quickAddLabel} numberOfLines={1}>+ Record</Text>
      </View>

      <View style={styles.flexibleSpacer} />

      {/* 4. Bottom Utility Anchors */}
      <View style={styles.bottomUtilitiesGroup}>
        {/* AI Health Summary */}
        <Pressable
          onPress={handleSummarize}
          disabled={summarizing}
          style={({ pressed }) => [styles.utilityBtn, pressed && styles.navItemPressed]}
          accessibilityRole="button"
          accessibilityLabel="AI Health Summary"
        >
          {summarizing ? (
            <ActivityIndicator size="small" color={Colors.blue} />
          ) : (
            <View style={[styles.utilityIconBox, { backgroundColor: Colors.blueLight }]}>
              <Image
                source={require('../../assets/icons/AI.png')}
                style={[styles.utilityIcon, { tintColor: Colors.blue }]}
              />
            </View>
          )}
        </Pressable>

        {/* Notifications Center */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            refreshNotifications();
            setNotificationsVisible(true);
          }}
          style={({ pressed }) => [styles.utilityBtn, pressed && styles.navItemPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Notifications, ${unreadCount} unread`}
        >
          <View style={styles.utilityIconBox}>
            <Image
              source={require('../../assets/icons/notification-bell.png')}
              style={styles.utilityIcon}
            />
            {unreadCount > 0 && (
              <View style={styles.notificationDot} />
            )}
          </View>
        </Pressable>

        {/* Paramedic Emergency ID Instant Trigger */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setEmergencyModalVisible(true);
          }}
          style={({ pressed }) => [styles.utilityBtn, pressed && styles.navItemPressed]}
          accessibilityRole="button"
          accessibilityLabel="Emergency Medical ID"
        >
          <View style={[styles.utilityIconBox, { backgroundColor: Colors.redLight }]}>
            <Ionicons name="medical" size={17} color={Colors.red} />
          </View>
        </Pressable>

        {/* User Monogram / Avatar */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/(tabs)/profile');
          }}
          style={({ pressed }) => [styles.avatarAnchor, pressed && styles.navItemPressed]}
          accessibilityRole="button"
          accessibilityLabel="Profile settings"
        >
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarMonogram}>
              <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Emergency Modal */}
      <EmergencyIdModal
        visible={emergencyModalVisible}
        profile={profileData}
        userName={user?.name || ''}
        userEmail={user?.email || ''}
        onClose={() => setEmergencyModalVisible(false)}
      />

      {/* Notifications Slide-Over Panel */}
      <NotificationCenterModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
        onOpenAiSummary={handleSummarize}
      />

      {/* AI Health Summary Floating Dialog */}
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
                accessibilityLabel="Close AI summary"
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
                <Ionicons name="information-circle" size={16} color={Colors.blue} />
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
  railContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: LandscapeTokens.navRailWidth, // 88pt
    backgroundColor: CARD_BG,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    alignItems: 'center',
    zIndex: 99,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 2, height: 0 },
    elevation: 8,
  },
  brandBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brandLogo: {
    width: 36,
    height: 36,
  },
  navGroup: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
  },
  navItem: {
    width: 68,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    gap: 3,
  },
  navItemActive: {
    backgroundColor: '#EDFAF7',
  },
  navItemPressed: {
    opacity: 0.75,
  },
  activeIndicatorBar: {
    position: 'absolute',
    left: -10,
    top: 12,
    bottom: 12,
    width: 3.5,
    borderRadius: 2,
    backgroundColor: TEAL,
  },
  iconBox: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconBoxActive: {},
  navIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  navLabel: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 10.5,
    color: MUTED,
    textAlign: 'center',
  },
  navLabelActive: {
    fontFamily: 'LexendDeca-SemiBold',
    color: TEAL,
  },
  badgeIndicator: {
    position: 'absolute',
    top: -3,
    right: -6,
    backgroundColor: TEAL,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 9,
    color: '#FFFFFF',
  },
  quickActionBox: {
    alignItems: 'center',
    marginTop: 14,
    gap: 3,
  },
  quickAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  quickAddLabel: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 10,
    color: TEAL,
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  flexibleSpacer: {
    flex: 1,
  },
  bottomUtilitiesGroup: {
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  utilityBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F7F6',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  utilityIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  avatarAnchor: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 2,
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarMonogram: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: TEAL,
  },
  avatarText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 13,
    color: TEAL,
  },

  /* AI Summary Dialog Styles */
  summaryModalOverlay: {
    flex: 1,
    backgroundColor: Colors.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  summaryModalContent: {
    width: '100%',
    maxWidth: 580,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.sheet,
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

export default TabletLandscapeNavRail;
