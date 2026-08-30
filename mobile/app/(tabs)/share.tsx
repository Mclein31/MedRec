import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '../../lib/api';
import { SideMenuModal } from '../../components/menu/SideMenuModal';
import { NotificationCenterModal } from '../../components/notifications/NotificationCenterModal';
import { useNotifications } from '../../context/NotificationContext';

const TEAL = '#159A83';
const BLUE = '#1976D2';
const BLUE_LIGHT = '#EBF3FB';
const INK = '#12343B';
const MUTED = '#64748B';
const BORDER = '#E5F0EE';
const BG = '#F4FAF9';
const RED = '#D92D20';
const RED_LIGHT = '#FEF3F2';

type Share = {
  id: string;
  token: string;
  expires_at: string;
  revoked_at: string | null;
  created_at?: string;
  allowed_types?: string[] | null;
  record_ids?: string[] | null;
};

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(dateStr?: string | null) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function expiryStatus(dateStr: string) {
  const minutes = Math.max(
    0,
    Math.ceil((new Date(dateStr).getTime() - Date.now()) / 60000)
  );
  return minutes > 0
    ? `Expires in ${minutes} minute${minutes === 1 ? '' : 's'}`
    : 'Expired';
}

export default function ShareScreen() {
  const params = useLocalSearchParams<{
    pendingToken?: string;
    pendingExpiry?: string;
  }>();
  const [shares, setShares] = useState<Share[]>([]);
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [activeExpiry, setActiveExpiry] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);

  const { unreadCount, refreshNotifications } = useNotifications();
  const insets = useSafeAreaInsets();

  const loadShares = async () => {
    try {
      const data = await api.listShares();
      setShares(data.shares);
    } catch (err: any) {
      Alert.alert('Error loading shares', err.message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadShares();
      refreshNotifications();
      if (params.pendingToken) {
        setActiveToken(params.pendingToken);
        setActiveExpiry(params.pendingExpiry ?? null);
      }
    }, [params.pendingToken, params.pendingExpiry, refreshNotifications])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadShares(), refreshNotifications()]);
    setRefreshing(false);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const data = await api.createShare(60);
      setActiveToken(data.token);
      setActiveExpiry(data.expiresAt);
      await loadShares();
    } catch (err: any) {
      Alert.alert('Failed to create share', err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = (id: string) => {
    Alert.alert(
      'Revoke access',
      'Are you sure you want to revoke this QR code? Healthcare providers will no longer be able to view your records.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            setRevoking(id);
            try {
              await api.revokeShare(id);
              if (
                activeToken &&
                shares.find((s) => s.id === id)?.token === activeToken
              ) {
                setActiveToken(null);
                setActiveExpiry(null);
              }
              await loadShares();
            } catch (err: any) {
              Alert.alert('Failed to revoke', err.message);
            } finally {
              setRevoking(null);
            }
          },
        },
      ]
    );
  };

  const activeShares = shares.filter(
    (s) => !s.revoked_at && new Date(s.expires_at) > new Date()
  );
  const recentShares = shares.filter(
    (s) => s.revoked_at || new Date(s.expires_at) <= new Date()
  );
  const isLoadingQr = Boolean(params.pendingToken) && !activeToken;

  const activeShareForQr = activeToken
    ? shares.find((s) => s.token === activeToken)
    : null;

  const visibleRecentShares = showAllHistory
    ? recentShares
    : recentShares.slice(0, 3);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={TEAL}
          />
        }
      >
        {/* Top Header */}
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <View style={styles.headerIcons}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setMenuVisible(true);
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Open navigation menu"
            >
              <Image
                source={require('../../assets/icons/burger-menu.png')}
                style={styles.headerAsset}
              />
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setNotificationsVisible(true);
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Notifications, ${unreadCount} unread`}
            >
              <Image
                source={require('../../assets/icons/notification-bell.png')}
                style={styles.headerAsset}
              />
              {unreadCount > 0 && <View style={styles.notificationDot} />}
            </Pressable>
          </View>
          <Text style={styles.title}>Share Records</Text>
          <Text style={styles.subtitle}>
            Share your health records in a limited time access
          </Text>
        </View>

        {/* ────────────────────────────────────────────────────────
            TIER 1: ADAPTIVE HERO (Primary Action / Active QR)
        ──────────────────────────────────────────────────────── */}
        {activeToken ? (
          /* Active Living QR Card */
          <View style={styles.activeHeroCard}>
            <Text style={styles.activeHeroTitle}>{"Doctor's QR Access"}</Text>
            <Text style={styles.activeHeroSubtitle}>
              All records · 60 minute temporary access
            </Text>

            <View style={styles.qrCodeContainer}>
              <QRCode
                value={activeToken}
                size={142}
                color="#12343B"
                backgroundColor="#FFFFFF"
              />
            </View>

            {activeExpiry && (
              <Text style={styles.activeTimerText}>
                {expiryStatus(activeExpiry)}
              </Text>
            )}

            {activeShareForQr ? (
              <Pressable
                onPress={() => handleRevoke(activeShareForQr.id)}
                disabled={revoking === activeShareForQr.id}
                style={({ pressed }) => [
                  styles.revokeHeroBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Revoke access immediately"
              >
                {revoking === activeShareForQr.id ? (
                  <ActivityIndicator size="small" color={RED} />
                ) : (
                  <Text style={styles.revokeHeroText}>
                    Revoke Access Immediately
                  </Text>
                )}
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  setActiveToken(null);
                  setActiveExpiry(null);
                }}
                style={styles.revokeHeroBtn}
              >
                <Text style={styles.dismissHeroText}>Close QR View</Text>
              </Pressable>
            )}
          </View>
        ) : isLoadingQr || creating ? (
          /* Loading State Card */
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={BLUE} />
            <Text style={styles.loadingCardText}>Generating Doctor Access QR...</Text>
          </View>
        ) : (
          /* Default Blue Generate Hero Card */
          <Pressable
            onPress={handleCreate}
            style={({ pressed }) => [
              styles.generateCard,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Generate QR Code to share records with your doctor"
          >
            {/* Top Row: QR Icon + Title */}
            <View style={styles.generateTopRow}>
              <View style={styles.generateIconBox}>
                <Image
                  source={require('../../assets/icons/qr-white.png')}
                  style={styles.whiteQrAsset}
                />
              </View>
              <Text style={styles.generateTitle}>
                Share your records with your Doctor
              </Text>
            </View>

            {/* Subtitle / Expiration info */}
            <Text style={styles.generateSubtitle}>
              The QR code will automatically expire in 60 minutes
            </Text>

            {/* Generate Button CTA */}
            <View style={styles.generateButton}>
              <Text style={styles.generateButtonText}>GENERATE QR CODE</Text>
            </View>
          </Pressable>
        )}

        {/* ────────────────────────────────────────────────────────
            TIER 2: ADDITIONAL ACTIVE SHARES (If not viewing QR)
        ──────────────────────────────────────────────────────── */}
        {!activeToken && activeShares.length > 0 && (
          <View style={styles.activeSection}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Active Shares</Text>
              <Text style={styles.sectionSubtitle}>
                Currently live doctor access sessions
              </Text>
            </View>
            {activeShares.map((share) => (
              <View key={share.id} style={styles.activeShareCard}>
                <View style={styles.activeShareTop}>
                  <View style={styles.activeShareIconBox}>
                    <Ionicons name="qr-code-outline" size={18} color={BLUE} />
                  </View>
                  <View style={styles.activeShareInfo}>
                    <Text style={styles.activeShareTitle}>Doctor's QR Access</Text>
                    <Text style={styles.activeShareSub}>
                      All records · {expiryStatus(share.expires_at)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setActiveToken(share.token);
                      setActiveExpiry(share.expires_at);
                    }}
                    style={({ pressed }) => [
                      styles.viewQrBtn,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="View QR Code"
                  >
                    <Text style={styles.viewQrBtnText}>View QR</Text>
                  </Pressable>
                </View>
                <View style={styles.activeShareDivider} />
                <Pressable
                  onPress={() => handleRevoke(share.id)}
                  disabled={revoking === share.id}
                  style={styles.activeShareRevokeBtn}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Revoke access"
                >
                  {revoking === share.id ? (
                    <ActivityIndicator size="small" color={RED} />
                  ) : (
                    <Text style={styles.activeShareRevokeText}>Revoke Access</Text>
                  )}
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* ────────────────────────────────────────────────────────
            TIER 3: PAST SESSIONS (Unboxed, Cardless Timeline)
        ──────────────────────────────────────────────────────── */}
        {recentShares.length > 0 && (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.historySectionTitle}>Past Sessions</Text>
            </View>

            {/* Unboxed Flat Row List */}
            <View style={styles.historyList}>
              {visibleRecentShares.map((share, index) => {
                const isRevoked = Boolean(share.revoked_at);
                const dateStr = formatDate(share.created_at || share.expires_at);
                const timeStr = formatTime(share.created_at || share.expires_at);
                const termTime = isRevoked
                  ? formatTime(share.revoked_at)
                  : formatTime(share.expires_at);

                const scopeTitle =
                  share.record_ids && share.record_ids.length > 0
                    ? `Selected Records (${share.record_ids.length})`
                    : 'Doctor QR Access';

                const subtext = dateStr
                  ? isRevoked
                    ? `Shared ${dateStr} · Revoked at ${termTime || timeStr}`
                    : `Shared ${dateStr} · Expired at ${termTime || timeStr}`
                  : '60-minute temporary access';

                return (
                  <View key={share.id} style={styles.historyItemWrapper}>
                    <View style={styles.historyRow}>
                      <View style={styles.historyLeft}>
                        <Text
                          style={styles.historyItemTitle}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {scopeTitle}
                        </Text>
                        <Text
                          style={styles.historyItemSubtitle}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {subtext}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.historyStatusText,
                          isRevoked
                            ? styles.historyStatusRevoked
                            : styles.historyStatusExpired,
                        ]}
                      >
                        {isRevoked ? 'Revoked' : 'Expired'}
                      </Text>
                    </View>

                    {/* Hairline Divider between items */}
                    {index < visibleRecentShares.length - 1 && (
                      <View style={styles.historyDivider} />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Progressive Disclosure Toggle */}
            {recentShares.length > 3 && (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowAllHistory(!showAllHistory);
                }}
                style={({ pressed }) => [
                  styles.expandHistoryBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  showAllHistory
                    ? 'Show fewer sessions'
                    : `Show all ${recentShares.length} past sessions`
                }
              >
                <Text style={styles.expandHistoryText}>
                  {showAllHistory
                    ? 'Show less'
                    : `Show full history (${recentShares.length} sessions)`}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Empty State when no shares exist at all */}
        {activeShares.length === 0 &&
          recentShares.length === 0 &&
          !activeToken && (
            <View style={styles.empty}>
              <Ionicons
                name="share-outline"
                size={44}
                color={TEAL}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyTitle}>No previous sharing sessions</Text>
              <Text style={styles.emptyText}>
                Generate a QR code to share your health records with a doctor.
              </Text>
            </View>
          )}
      </ScrollView>

      {/* Side Menu Drawer */}
      <SideMenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
      />

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
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  notificationDot: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 9,
    height: 9,
    borderRadius: 6,
    backgroundColor: TEAL,
  },
  headerAsset: {
    width: 25,
    height: 25,
    resizeMode: 'contain',
  },
  title: {
    color: INK,
    fontFamily: 'LexendDeca-Bold',
    fontSize: 28,
  },
  subtitle: {
    color: MUTED,
    fontSize: 12,
    marginTop: 2,
  },

  /* ─────────────────────────────
     TIER 1: ADAPTIVE HERO
  ───────────────────────────── */
  generateCard: {
    marginHorizontal: 24,
    borderRadius: 16,
    backgroundColor: BLUE,
    padding: 16,
    gap: 12,
    marginBottom: 12,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  generateTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  generateIconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whiteQrAsset: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
  },
  generateTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'LexendDeca-Bold',
    lineHeight: 22,
  },
  generateSubtitle: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 11,
    fontFamily: 'LexendDeca-Regular',
    lineHeight: 16,
  },
  generateButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    height: 36,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  generateButtonText: {
    color: '#111827',
    fontSize: 12,
    fontFamily: 'LexendDeca-Bold',
    letterSpacing: 0.4,
  },

  activeHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BLUE,
    padding: 18,
    marginHorizontal: 24,
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  activeHeroTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 18,
    color: INK,
  },
  activeHeroSubtitle: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: MUTED,
  },
  qrCodeContainer: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 4,
  },
  activeTimerText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12,
    color: TEAL,
    marginVertical: 4,
  },
  revokeHeroBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  revokeHeroText: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 13,
    color: RED,
  },
  dismissHeroText: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 13,
    color: MUTED,
  },

  loadingCard: {
    marginHorizontal: 24,
    height: 120,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  loadingCardText: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 13,
    color: MUTED,
  },

  /* ─────────────────────────────
     TIER 2: ACTIVE SHARES
  ───────────────────────────── */
  activeSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  sectionHead: {
    marginHorizontal: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 16,
    color: INK,
  },
  sectionSubtitle: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11.5,
    color: MUTED,
    marginTop: 1,
  },
  activeShareCard: {
    marginHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BLUE,
    marginBottom: 10,
    overflow: 'hidden',
  },
  activeShareTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  activeShareIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: BLUE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeShareInfo: {
    flex: 1,
    gap: 2,
  },
  activeShareTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 13.5,
    color: INK,
  },
  activeShareSub: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    color: BLUE,
  },
  viewQrBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: BLUE_LIGHT,
  },
  viewQrBtnText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 11.5,
    color: BLUE,
  },
  activeShareDivider: {
    height: 1,
    backgroundColor: BORDER,
  },
  activeShareRevokeBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFCFC',
  },
  activeShareRevokeText: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 12,
    color: RED,
  },

  /* ─────────────────────────────
     TIER 3: PAST SESSIONS (UNBOXED)
  ───────────────────────────── */
  historySection: {
    marginTop: 14,
    marginHorizontal: 24,
  },
  historyHeader: {
    marginBottom: 8,
  },
  historySectionTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 16,
    color: INK,
  },
  historyList: {
    backgroundColor: 'transparent',
  },
  historyItemWrapper: {
    backgroundColor: 'transparent',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    minHeight: 48,
    gap: 12,
  },
  historyLeft: {
    flex: 1,
    gap: 3,
  },
  historyItemTitle: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13.5,
    color: INK,
  },
  historyItemSubtitle: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11.5,
    color: MUTED,
  },
  historyStatusText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12.5,
    color: MUTED,
  },
  historyStatusRevoked: {
    fontFamily: 'LexendDeca-Medium',
    color: RED,
  },
  historyStatusExpired: {
    color: MUTED,
  },
  historyDivider: {
    height: 1,
    backgroundColor: BORDER,
  },
  expandHistoryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 2,
  },
  expandHistoryText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12.5,
    color: TEAL,
  },

  /* ─────────────────────────────
     EMPTY STATE
  ───────────────────────────── */
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIcon: {
    opacity: 0.5,
    marginBottom: 6,
  },
  emptyTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 15,
    color: INK,
  },
  emptyText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12.5,
    color: MUTED,
    textAlign: 'center',
    maxWidth: 260,
  },
  pressed: {
    opacity: 0.8,
  },
});
