import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Animated,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  Image,
  Easing,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { SideMenuItem } from './SideMenuItem';
import { Colors, Radii } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';

const TEAL = Colors.teal;
const INK = Colors.ink;
const MUTED = Colors.muted;
const BORDER = Colors.border;
const CARD_BG = Colors.cardBg;
const BACKDROP_COLOR = Colors.backdrop;

interface SideMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenAiSummary?: () => void;
}

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return 'MR';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const SideMenuModal: React.FC<SideMenuModalProps> = ({
  visible,
  onClose,
  onOpenAiSummary,
}) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { width, insets, isTablet } = useResponsive();

  const drawerWidth = isTablet
    ? Math.min(width * 0.38, 320)
    : Math.min(width * 0.78, 290);

  const [activeSharesCount, setActiveSharesCount] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [modalVisible, setModalVisible] = useState(visible);

  const slideAnim = useRef(new Animated.Value(-drawerWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isClosingRef = useRef(false);
  const prevVisibleRef = useRef(visible);
  const animTokenRef = useRef(0);

  const stopAllAnimations = () => {
    slideAnim.stopAnimation();
    fadeAnim.stopAnimation();
  };

  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (visible && !wasVisible) {
      isClosingRef.current = false;
      const currentToken = ++animTokenRef.current;
      stopAllAnimations();

      setModalVisible(true);
      slideAnim.setValue(-drawerWidth);
      fadeAnim.setValue(0);

      api.listShares().then((res: any) => {
        if (res && Array.isArray(res.shares)) {
          const now = new Date();
          const active = res.shares.filter(
            (s: any) => !s.revoked_at && new Date(s.expires_at) > now
          );
          setActiveSharesCount(active.length);
        }
      }).catch(() => {
        // Silently continue if offline
      });

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (!visible && wasVisible && modalVisible) {
      handleClose();
    }
  }, [visible, drawerWidth]);

  const handleClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    const currentToken = ++animTokenRef.current;
    stopAllAnimations();

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -drawerWidth,
        duration: 160,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && animTokenRef.current === currentToken) {
        setModalVisible(false);
        onClose();
      }
    });
  };

  const isRecordsActive =
    pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
  const isShareActive = pathname.includes('share');
  const isScanActive = pathname.includes('scan');
  const isProfileActive = pathname.includes('profile');

  const navigateTo = (route: string) => {
    handleClose();
    setTimeout(() => {
      router.push(route as any);
    }, 180);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of your MedRec account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          handleClose();
          logout();
        },
      },
    ]);
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

  const handleAboutPress = () => {
    Alert.alert(
      'About MedRec',
      'MedRec is your personal, sovereign health records vault.\n\nVersion: 1.0.0 (Build 2026)\nSecurity: Client-side cryptographic access tokens & encrypted data.\n\nMedical Disclaimer:\nMedRec is a personal data organizer and is not a substitute for professional clinical medical advice, diagnosis, or treatment.',
      [{ text: 'Close', style: 'default' }]
    );
  };

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      accessibilityViewIsModal
    >
      <StatusBar style={modalVisible ? 'light' : 'dark'} />
      <View style={styles.modalRoot}>
        {/* Backdrop */}
        <Animated.View
          style={[styles.backdrop, { opacity: fadeAnim }]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close navigation menu backdrop"
          />
        </Animated.View>

        {/* Sliding Drawer */}
        <Animated.View
          style={[
            styles.drawer,
            {
              width: drawerWidth,
              paddingTop: insets.top + 12,
              paddingLeft: Math.max(insets.left, 0),
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* 1. Header Branding & Close Button */}
          <View style={styles.header}>
            <View style={styles.brandGroup}>
              <Image
                source={require('../../assets/logo/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.brandTitle}>MedRec</Text>
                <Text style={styles.brandSubtitle}>Health Vault</Text>
              </View>
            </View>

            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
            >
              <Ionicons name="close" size={18} color={INK} />
            </Pressable>
          </View>

          {/* 2. Unboxed User Identity Section */}
          <Pressable
            onPress={() => navigateTo('/(tabs)/profile')}
            style={({ pressed }) => [styles.identitySection, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Profile: ${user?.name || 'Patient'}, ${user?.email || 'View Profile & Emergency ID'}`}
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

            <View style={styles.identityInfo}>
              <Text style={styles.userName} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                {user?.name || 'Patient'}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                {user?.email || 'View profile & Emergency ID →'}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={14} color={MUTED} style={styles.chevron} />
          </Pressable>

          <View style={styles.hairlineDivider} />

          {/* 3. Scrollable Navigation Groups */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Section 1: Primary Patient Vault Navigation */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader} maxFontSizeMultiplier={1.3}>
                PATIENT VAULT
              </Text>

              <SideMenuItem
                imageSource={
                  isRecordsActive
                    ? require('../../assets/icons/records-active.png')
                    : require('../../assets/icons/records-inactive.png')
                }
                label="Records"
                active={isRecordsActive}
                onPress={() => navigateTo('/(tabs)')}
              />

              <SideMenuItem
                imageSource={
                  isShareActive
                    ? require('../../assets/icons/share-active.png')
                    : require('../../assets/icons/share-inactive.png')
                }
                label="Share Records"
                badge={activeSharesCount ? `${activeSharesCount} Active` : undefined}
                active={isShareActive}
                onPress={() => navigateTo('/(tabs)/share')}
              />

              <SideMenuItem
                imageSource={
                  isScanActive
                    ? require('../../assets/icons/scan-active.png')
                    : require('../../assets/icons/scan-inactive.png')
                }
                label="Doctor QR Scanner"
                active={isScanActive}
                onPress={() => navigateTo('/(tabs)/scan')}
              />

              <SideMenuItem
                imageSource={
                  isProfileActive
                    ? require('../../assets/icons/profile-active.png')
                    : require('../../assets/icons/profile-inactive.png')
                }
                label="Profile & Medical ID"
                active={isProfileActive}
                onPress={() => navigateTo('/(tabs)/profile')}
              />
            </View>

            <View style={styles.hairlineDivider} />

            {/* Section 2: Clinical Tools & Vault */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader} maxFontSizeMultiplier={1.3}>
                CLINICAL TOOLS
              </Text>

              <SideMenuItem
                icon="sparkles-outline"
                iconColor={TEAL}
                label="AI Health Summary"
                onPress={() => {
                  handleClose();
                  if (onOpenAiSummary) {
                    onOpenAiSummary();
                  } else {
                    navigateTo('/(tabs)');
                  }
                }}
              />

              <SideMenuItem
                icon="shield-checkmark-outline"
                iconColor={MUTED}
                label="Emergency Medical ID"
                onPress={() => navigateTo('/(tabs)/profile')}
              />

              <SideMenuItem
                icon="cloud-download-outline"
                iconColor={MUTED}
                label="Export Health Vault"
                onPress={handleExportVault}
              />
            </View>
          </ScrollView>

          {/* 4. Pinned Footer Action & Version Stamp */}
          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, 12) + 4 },
            ]}
          >
            <SideMenuItem
              icon="information-circle-outline"
              iconColor={MUTED}
              label="About MedRec"
              onPress={handleAboutPress}
            />
            <SideMenuItem
              icon="log-out-outline"
              label="Sign Out"
              destructive
              onPress={handleSignOut}
            />
            <Text style={styles.versionText} maxFontSizeMultiplier={1.2}>
              MedRec v1.0.0 • Sovereign Health Vault
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BACKDROP_COLOR,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: CARD_BG,
    borderTopRightRadius: Radii.sheet,
    borderBottomRightRadius: Radii.sheet,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 3, height: 0 },
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 30,
    height: 30,
  },
  brandTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 17,
    color: INK,
    lineHeight: 21,
  },
  brandSubtitle: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 10.5,
    color: MUTED,
    lineHeight: 13,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4FAF9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  identitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  avatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarMonogram: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 13.5,
    color: TEAL,
  },
  identityInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 1,
  },
  userName: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 14.5,
    color: INK,
    letterSpacing: -0.2,
  },
  userEmail: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    color: MUTED,
  },
  chevron: {
    opacity: 0.45,
    marginLeft: 6,
  },
  hairlineDivider: {
    height: 1,
    backgroundColor: '#F0F5F4',
    marginHorizontal: 16,
    marginVertical: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 2,
  },
  section: {
    marginVertical: 4,
  },
  sectionHeader: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#F0F5F4',
    paddingTop: 4,
  },
  versionText: {
    textAlign: 'center',
    fontFamily: 'LexendDeca-Regular',
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: 2,
  },
  pressed: {
    opacity: 0.65,
  },
});

export default SideMenuModal;
