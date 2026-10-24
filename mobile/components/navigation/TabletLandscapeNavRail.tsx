import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { PrivateModal as Modal } from '../security/PrivateModal';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Colors, Radii, LandscapeTokens } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import EmergencyIdModal from '../EmergencyIdModal';
import { SideMenuModal } from '../menu/SideMenuModal';

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
  const { insets } = useResponsive();

  const [activeSharesCount, setActiveSharesCount] = useState<number | null>(null);
  const [emergencyModalVisible, setEmergencyModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
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
      {/* 1. Top Section: Burger Menu & Brand Logo */}
      <View style={styles.topSection}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setMenuVisible(true);
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.burgerBtn, pressed && styles.btnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
        >
          <Image
            source={require('../../assets/icons/burger-menu.png')}
            style={styles.burgerIcon}
          />
        </Pressable>

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
      </View>

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
            pressed && styles.navItemPressed,
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: isRecordsActive }}
          accessibilityLabel="Records tab"
        >
          <View style={styles.iconBox}>
            <Image
              source={
                isRecordsActive
                  ? require('../../assets/icons/records-active.png')
                  : require('../../assets/icons/records-inactive.png')
              }
              style={styles.navIcon}
            />
          </View>
        </Pressable>

        {/* Share Route */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/(tabs)/share');
          }}
          style={({ pressed }) => [
            styles.navItem,
            pressed && styles.navItemPressed,
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: isShareActive }}
          accessibilityLabel="Share tab"
        >
          <View style={styles.iconBox}>
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
        </Pressable>

        {/* Add Record Route */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/record/add');
          }}
          style={({ pressed }) => [
            styles.navItem,
            pressed && styles.navItemPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Add New Health Record"
        >
          <View style={styles.iconBox}>
            <Image
              source={require('../../assets/icons/add-record.png')}
              style={styles.addIcon}
            />
          </View>
        </Pressable>

        {/* Scan Route */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/(tabs)/scan');
          }}
          style={({ pressed }) => [
            styles.navItem,
            pressed && styles.navItemPressed,
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: isScanActive }}
          accessibilityLabel="Scan tab"
        >
          <View style={styles.iconBox}>
            <Image
              source={
                isScanActive
                  ? require('../../assets/icons/scan-active.png')
                  : require('../../assets/icons/scan-inactive.png')
              }
              style={styles.navIcon}
            />
          </View>
        </Pressable>

        {/* Profile Route */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/(tabs)/profile');
          }}
          style={({ pressed }) => [
            styles.navItem,
            pressed && styles.navItemPressed,
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: isProfileActive }}
          accessibilityLabel="Profile tab"
        >
          <View style={styles.iconBox}>
            <Image
              source={
                isProfileActive
                  ? require('../../assets/icons/profile-active.png')
                  : require('../../assets/icons/profile-inactive.png')
              }
              style={styles.navIcon}
            />
          </View>
        </Pressable>
      </View>

      <View style={styles.flexibleSpacer} />

      {/* 3. Bottom Utility Anchors */}
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
            <Image
              source={require('../../assets/icons/AI.png')}
              style={[styles.utilityIcon, { tintColor: Colors.blue }]}
            />
          )}
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
          <Ionicons name="medical" size={26} color={Colors.red} />
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

      {/* Side Menu Drawer Modal */}
      <SideMenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
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
  topSection: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  burgerBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burgerIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  brandBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogo: {
    width: 38,
    height: 38,
  },
  navGroup: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  navItem: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  navItemPressed: {
    opacity: 0.75,
  },
  iconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  navIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
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
  addIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
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
    gap: 10,
    width: '100%',
  },
  utilityBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  utilityIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  avatarAnchor: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    marginTop: 2,
  },
  avatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarMonogram: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
