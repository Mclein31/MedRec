import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Animated,
  StyleSheet,
  ScrollView,
  Dimensions,
  Alert,
  Share,
  Image,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { SideMenuItem } from './SideMenuItem';
import { Colors, Spacing, Radii, Typography } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 320);

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

export const SideMenuModal: React.FC<SideMenuModalProps> = ({
  visible,
  onClose,
  onOpenAiSummary,
}) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const [activeSharesCount, setActiveSharesCount] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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
          duration: 230,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 230,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const navigateTo = (route: string) => {
    handleClose();
    setTimeout(() => {
      router.push(route as any);
    }, 190);
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
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      accessibilityViewIsModal
    >
      <StatusBar style={visible ? 'light' : 'dark'} />
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
              width: DRAWER_WIDTH,
              paddingTop: insets.top + 14,
              paddingBottom: Math.max(insets.bottom, 16) + 12,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Header Branding with Existing MedRec App Logo */}
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
              <Ionicons name="close" size={20} color={INK} />
            </Pressable>
          </View>

          {/* User Demographic Summary */}
          <Pressable
            onPress={() => navigateTo('/(tabs)/profile')}
            style={({ pressed }) => [styles.userSection, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="View profile"
          >
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name || 'Patient'}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user?.email || ''}
            </Text>
          </Pressable>

          <View style={styles.divider} />

          {/* Menu Items (Text Only) */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Group 1: Clinical & Emergency Utilities */}
            <View style={styles.group}>
              <SideMenuItem
                label="Emergency Medical ID"
                sublabel="Blood type, allergies & emergency contacts"
                onPress={() => navigateTo('/(tabs)/profile')}
              />
              <SideMenuItem
                label="Share Records"
                sublabel="Doctor time-limited QR access"
                badge={activeSharesCount ? `${activeSharesCount} Active` : undefined}
                active={pathname === '/share'}
                onPress={() => navigateTo('/(tabs)/share')}
              />
              <SideMenuItem
                label="Scan Doctor QR"
                sublabel="Scan patient shared QR code"
                active={pathname === '/scan'}
                onPress={() => navigateTo('/(tabs)/scan')}
              />
              <SideMenuItem
                label="AI Health Summary"
                sublabel="Generate clinical record insights"
                onPress={() => {
                  handleClose();
                  if (onOpenAiSummary) {
                    onOpenAiSummary();
                  } else {
                    navigateTo('/(tabs)');
                  }
                }}
              />
            </View>

            <View style={styles.divider} />

            {/* Group 2: Vault & Information */}
            <View style={styles.group}>
              <SideMenuItem
                label="Export Health Vault"
                sublabel="Download encrypted JSON archive"
                onPress={handleExportVault}
              />
              <SideMenuItem
                label="About MedRec"
                sublabel="v1.0.0 • Medical Disclaimer"
                onPress={handleAboutPress}
              />
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.footer}>
            <SideMenuItem
              label="Sign Out"
              destructive
              onPress={handleSignOut}
            />
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
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 3, height: 0 },
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 38,
    height: 38,
  },
  brandTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 18,
    color: INK,
    lineHeight: 22,
  },
  brandSubtitle: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
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
  userSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 2,
  },
  userName: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 15,
    color: INK,
  },
  userEmail: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: MUTED,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  group: {
    gap: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#EDF4F3',
    marginVertical: 8,
    marginHorizontal: 16,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#EDF4F3',
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  pressed: {
    opacity: 0.7,
  },
});

export default SideMenuModal;
