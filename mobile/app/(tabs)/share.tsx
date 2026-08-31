import React, { useState, useCallback, useEffect } from 'react';
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
import QRCode from 'react-native-qrcode-svg';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '../../lib/api';
import { SideMenuModal } from '../../components/menu/SideMenuModal';
import { NotificationCenterModal } from '../../components/notifications/NotificationCenterModal';
import { useNotifications } from '../../context/NotificationContext';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Colors, Radii, Typography, ResponsiveLimits } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';

const TEAL = Colors.teal;
const BLUE = Colors.blue;
const BLUE_LIGHT = Colors.blueLight;
const INK = Colors.ink;
const MUTED = Colors.muted;
const BORDER = Colors.border;
const BG = Colors.bg;
const RED = Colors.red;
const RED_LIGHT = Colors.redLight;

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
  const {
    isTablet,
    isLandscape,
    width,
    screenPadding,
    insets,
    scaleFont,
    tabBarClearance,
  } = useResponsive();

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

  // Active interval ticker to keep live countdown accurate without manual screen interactions
  const [, setTick] = useState(0);
  useEffect(() => {
    const hasLiveSession = Boolean(activeExpiry || activeShares.length > 0);
    if (!hasLiveSession) return;
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 15000);
    return () => clearInterval(interval);
  }, [activeExpiry, activeShares.length]);

  const activeShareForQr = activeToken
    ? shares.find((s) => s.token === activeToken)
    : null;

  const visibleRecentShares = showAllHistory
    ? recentShares
    : recentShares.slice(0, 3);

  const tabletRecentShares = showAllHistory
    ? recentShares
    : recentShares.slice(0, 10);

  const qrSize = Math.round(
    isTablet
      ? 200
      : Math.min(width * 0.42, 175)
  );

  // ─── TABLET SHARING SCREEN (Landscape 2-Column / Portrait Single-Column) ─
  if (isTablet) {
    // Tier 1: Hero Block
    const heroCardBlock = (
      <View style={{ gap: 16 }}>
        {activeToken ? (
          /* Active Living QR Card */
          <View style={styles.activeHeroCard}>
            <Text
              style={[
                styles.activeHeroTitle,
                { fontSize: scaleFont(20, 18, 22) },
              ]}
              maxFontSizeMultiplier={1.35}
            >
              {"Doctor's QR Access"}
            </Text>
            <Text
              style={[
                styles.activeHeroSubtitle,
                { fontSize: scaleFont(12, 11, 13) },
              ]}
              maxFontSizeMultiplier={1.35}
            >
              All records · 60 minute temporary access
            </Text>

            <View style={styles.qrCodeContainer}>
              <QRCode
                value={activeToken}
                size={qrSize}
                color="#12343B"
                backgroundColor="#FFFFFF"
              />
            </View>

            {activeExpiry && (
              <Text style={styles.activeTimerText} maxFontSizeMultiplier={1.35}>
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
                  <>
                    <Ionicons name="close-circle-outline" size={16} color={RED} />
                    <Text style={styles.revokeHeroBtnText}>Revoke Access Immediately</Text>
                  </>
                )}
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  setActiveToken(null);
                  setActiveExpiry(null);
                }}
                style={({ pressed }) => [
                  styles.dismissHeroBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Done viewing QR"
              >
                <Text style={styles.dismissHeroBtnText}>Done Viewing</Text>
              </Pressable>
            )}
          </View>
        ) : isLoadingQr ? (
          /* Loading State when Navigating from Add Flow */
          <View style={styles.loadingQrCard}>
            <ActivityIndicator size="large" color={BLUE} />
            <Text style={styles.loadingQrText}>Generating Doctor Access QR...</Text>
          </View>
        ) : (
          /* Generate QR Hero Card */
          <View style={styles.generateHeroCard}>
            <View style={styles.generateHeroTopRow}>
              <View style={styles.generateHeroIconBox}>
                <Ionicons name="qr-code" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.generateHeroTextBox}>
                <Text
                  style={[
                    styles.generateHeroTitle,
                    { fontSize: scaleFont(17, 15, 19) },
                  ]}
                  maxFontSizeMultiplier={1.35}
                >
                  Doctor QR Access
                </Text>
                <Text
                  style={[
                    styles.generateHeroSubtitle,
                    { fontSize: scaleFont(11.5, 11, 13) },
                  ]}
                  maxFontSizeMultiplier={1.35}
                >
                  Instant, secure 60-min access without logins
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleCreate}
              disabled={creating}
              style={({ pressed }) => [
                styles.generatePrimaryBtn,
                pressed && styles.pressed,
                creating && styles.disabledBtn,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Generate QR code for doctor access"
            >
              {creating ? (
                <ActivityIndicator size="small" color={BLUE} />
              ) : (
                <>
                  <Ionicons name="sparkles" size={16} color={BLUE} />
                  <Text style={styles.generatePrimaryBtnText}>Generate Doctor QR</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </View>
    );

    // Tier 2: Active Sessions Block
    const activeSessionsBlock = activeShares.length > 0 ? (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.35}>
          Active Access Sessions ({activeShares.length})
        </Text>

        <View style={styles.cardsStack}>
          {activeShares.map((s) => {
            const isViewing = activeToken === s.token;
            return (
              <View key={s.id} style={styles.activeShareCard}>
                <View style={styles.shareCardHeader}>
                  <View style={styles.statusBadgeLive}>
                    <View style={styles.statusDotLive} />
                    <Text style={styles.statusTextLive}>ACTIVE</Text>
                  </View>
                  <Text style={styles.shareCardTimer}>
                    {expiryStatus(s.expires_at)}
                  </Text>
                </View>

                <View style={styles.shareCardMetaRow}>
                  <Image
                    source={require('../../assets/icons/clock.png')}
                    style={styles.metaIcon}
                  />
                  <Text style={styles.shareCardMetaText}>
                    Created {formatDate(s.created_at || s.expires_at)} at{' '}
                    {formatTime(s.created_at || s.expires_at)}
                  </Text>
                </View>

                <View style={styles.shareCardActions}>
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      if (isViewing) {
                        setActiveToken(null);
                        setActiveExpiry(null);
                      } else {
                        setActiveToken(s.token);
                        setActiveExpiry(s.expires_at);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.viewQrBtn,
                      isViewing && styles.viewQrBtnActive,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={isViewing ? 'Hide QR Code' : 'Display QR Code'}
                  >
                    <Ionicons
                      name={isViewing ? 'eye-off-outline' : 'qr-code-outline'}
                      size={15}
                      color={isViewing ? INK : TEAL}
                    />
                    <Text
                      style={[
                        styles.viewQrBtnText,
                        isViewing && { color: INK },
                      ]}
                    >
                      {isViewing ? 'Hide QR' : 'Show QR'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleRevoke(s.id)}
                    disabled={revoking === s.id}
                    style={({ pressed }) => [
                      styles.revokeBtn,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Revoke access"
                  >
                    {revoking === s.id ? (
                      <ActivityIndicator size="small" color={RED} />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={15} color={RED} />
                        <Text style={styles.revokeBtnText}>Revoke</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    ) : null;

    // Tier 3: Past History Block
    const pastHistoryBlock = recentShares.length > 0 ? (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.35}>
          Past Share History
        </Text>

        <View style={styles.historyCard}>
          {tabletRecentShares.map((s, index) => {
            const isLast = index === tabletRecentShares.length - 1;
            const isRevoked = Boolean(s.revoked_at);

            return (
              <View key={s.id}>
                <View style={styles.historyRow}>
                  <View style={styles.historyIconBox}>
                    <Ionicons
                      name={isRevoked ? 'close-circle' : 'checkmark-circle'}
                      size={18}
                      color={isRevoked ? RED : MUTED}
                    />
                  </View>

                  <View style={styles.historyContent}>
                    <Text style={styles.historyTitle} numberOfLines={1}>
                      {isRevoked ? 'Manually Revoked' : 'Session Expired'}
                    </Text>
                    <Text style={styles.historySubtitle}>
                      {formatDate(s.created_at || s.expires_at)} at{' '}
                      {formatTime(s.created_at || s.expires_at)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.historyBadge,
                      isRevoked ? styles.historyBadgeRevoked : styles.historyBadgeExpired,
                    ]}
                  >
                    <Text
                      style={[
                        styles.historyBadgeText,
                        isRevoked && { color: RED },
                      ]}
                    >
                      {isRevoked ? 'REVOKED' : 'EXPIRED'}
                    </Text>
                  </View>
                </View>
                {!isLast && <View style={styles.historyDivider} />}
              </View>
            );
          })}

          {recentShares.length > 10 && (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setShowAllHistory(!showAllHistory);
              }}
              style={({ pressed }) => [
                styles.showMoreBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={showAllHistory ? 'Show fewer past sessions' : 'Show all past sessions'}
            >
              <Text style={styles.showMoreBtnText}>
                {showAllHistory
                  ? 'Show Less'
                  : `View All ${recentShares.length} Past Sessions`}
              </Text>
              <Ionicons
                name={showAllHistory ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={TEAL}
              />
            </Pressable>
          )}
        </View>
      </View>
    ) : null;

    // Tier 4: Security Guarantee Block
    const securityGuaranteeBlock = (
      <View style={styles.securityBox}>
        <Ionicons name="shield-checkmark" size={16} color={TEAL} />
        <Text style={styles.securityText} maxFontSizeMultiplier={1.35}>
          MedRec sharing links are end-to-end encrypted. Healthcare providers only receive temporary, read-only viewing permissions that automatically expire.
        </Text>
      </View>
    );

    return (
      <View
        style={[
          styles.root,
          isLandscape && { paddingLeft: 260 },
        ]}
      >
        <StatusBar style="dark" />
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(insets.bottom, 24) + tabBarClearance,
            },
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
          <View
            style={
              isLandscape
                ? styles.tabletLandscapeContainer
                : styles.tabletSingleColContainer
            }
          >
            {/* Header */}
            <ScreenHeader
              title="Share Records"
              subtitle="Share your health records in a limited time access"
              onPressMenu={isLandscape ? undefined : () => setMenuVisible(true)}
              onPressNotifications={() => {
                refreshNotifications();
                setNotificationsVisible(true);
              }}
              unreadCount={unreadCount}
              style={{ paddingHorizontal: 0 }}
            />

            {isLandscape ? (
              /* ─── TABLET LANDSCAPE: 2-COLUMN SHARING STUDIO ─── */
              <View style={styles.tabletLandscapeSplitRow}>
                {/* Left Column (48%): QR Hero + Security */}
                <View style={styles.tabletLandscapeColLeft}>
                  {heroCardBlock}
                  {securityGuaranteeBlock}
                </View>

                {/* Right Column (52%): Active Sessions + Past History */}
                <View style={styles.tabletLandscapeColRight}>
                  {activeSessionsBlock}
                  {pastHistoryBlock}
                </View>
              </View>
            ) : (
              /* ─── TABLET PORTRAIT: SINGLE COLUMN STACK (LOCKED) ─── */
              <View style={{ gap: 16 }}>
                {heroCardBlock}
                {activeSessionsBlock}
                {pastHistoryBlock}
                {securityGuaranteeBlock}
              </View>
            )}
          </View>
        </ScrollView>

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

  // ─── PHONE VIEW (100% LOCKED & UNTOUCHED) ─────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + tabBarClearance },
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
          {/* Screen Header Toolbar */}
          <ScreenHeader
            title="Share Records"
            subtitle="Share your health records in a limited time access"
            onPressMenu={() => setMenuVisible(true)}
            onPressNotifications={() => {
              refreshNotifications();
              setNotificationsVisible(true);
            }}
            unreadCount={unreadCount}
          />

          {/* ────────────────────────────────────────────────────────
              TIER 1: ADAPTIVE HERO (Primary Action / Active QR)
          ──────────────────────────────────────────────────────── */}
          <View style={{ paddingHorizontal: screenPadding, gap: 16 }}>
            {activeToken ? (
              /* Active Living QR Card */
              <View style={styles.activeHeroCard}>
                <Text
                  style={[
                    styles.activeHeroTitle,
                    { fontSize: scaleFont(21, 18, 24) },
                  ]}
                  maxFontSizeMultiplier={1.35}
                >
                  {"Doctor's QR Access"}
                </Text>
                <Text
                  style={[
                    styles.activeHeroSubtitle,
                    { fontSize: scaleFont(12, 11, 13) },
                  ]}
                  maxFontSizeMultiplier={1.35}
                >
                  All records · 60 minute temporary access
                </Text>

                <View style={styles.qrCodeContainer}>
                  <QRCode
                    value={activeToken}
                    size={qrSize}
                    color="#12343B"
                    backgroundColor="#FFFFFF"
                  />
                </View>

                {activeExpiry && (
                  <Text style={styles.activeTimerText} maxFontSizeMultiplier={1.35}>
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
                      <>
                        <Ionicons name="close-circle-outline" size={16} color={RED} />
                        <Text style={styles.revokeHeroBtnText}>Revoke Access Immediately</Text>
                      </>
                    )}
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => {
                      setActiveToken(null);
                      setActiveExpiry(null);
                    }}
                    style={({ pressed }) => [
                      styles.dismissHeroBtn,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Done viewing QR"
                  >
                    <Text style={styles.dismissHeroBtnText}>Done Viewing</Text>
                  </Pressable>
                )}
              </View>
            ) : isLoadingQr ? (
              /* Loading State when Navigating from Add Flow */
              <View style={styles.loadingQrCard}>
                <ActivityIndicator size="large" color={BLUE} />
                <Text style={styles.loadingQrText}>Generating Doctor Access QR...</Text>
              </View>
            ) : (
              /* Generate QR Hero Card */
              <View style={styles.generateHeroCard}>
                <View style={styles.generateHeroTopRow}>
                  <View style={styles.generateHeroIconBox}>
                    <Ionicons name="qr-code" size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.generateHeroTextBox}>
                    <Text
                      style={[
                        styles.generateHeroTitle,
                        { fontSize: scaleFont(16, 14.5, 18) },
                      ]}
                      maxFontSizeMultiplier={1.35}
                    >
                      Doctor QR Access
                    </Text>
                    <Text
                      style={[
                        styles.generateHeroSubtitle,
                        { fontSize: scaleFont(11, 10.5, 12.5) },
                      ]}
                      maxFontSizeMultiplier={1.35}
                    >
                      Instant, secure 60-min access without logins
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={handleCreate}
                  disabled={creating}
                  style={({ pressed }) => [
                    styles.generatePrimaryBtn,
                    pressed && styles.pressed,
                    creating && styles.disabledBtn,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Generate QR code for doctor access"
                >
                  {creating ? (
                    <ActivityIndicator size="small" color={BLUE} />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={16} color={BLUE} />
                      <Text style={styles.generatePrimaryBtnText}>Generate Doctor QR</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}

            {/* ────────────────────────────────────────────────────────
                TIER 2: ACTIVE SHARING SESSIONS
            ──────────────────────────────────────────────────────── */}
            {activeShares.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.35}>
                  Active Access Sessions ({activeShares.length})
                </Text>

                <View style={styles.cardsStack}>
                  {activeShares.map((s) => {
                    const isViewing = activeToken === s.token;
                    return (
                      <View key={s.id} style={styles.activeShareCard}>
                        <View style={styles.shareCardHeader}>
                          <View style={styles.statusBadgeLive}>
                            <View style={styles.statusDotLive} />
                            <Text style={styles.statusTextLive}>ACTIVE</Text>
                          </View>
                          <Text style={styles.shareCardTimer}>
                            {expiryStatus(s.expires_at)}
                          </Text>
                        </View>

                        <View style={styles.shareCardMetaRow}>
                          <Image
                            source={require('../../assets/icons/clock.png')}
                            style={styles.metaIcon}
                          />
                          <Text style={styles.shareCardMetaText}>
                            Created {formatDate(s.created_at || s.expires_at)} at{' '}
                            {formatTime(s.created_at || s.expires_at)}
                          </Text>
                        </View>

                        <View style={styles.shareCardActions}>
                          <Pressable
                            onPress={() => {
                              Haptics.selectionAsync();
                              if (isViewing) {
                                setActiveToken(null);
                                setActiveExpiry(null);
                              } else {
                                setActiveToken(s.token);
                                setActiveExpiry(s.expires_at);
                              }
                            }}
                            style={({ pressed }) => [
                              styles.viewQrBtn,
                              isViewing && styles.viewQrBtnActive,
                              pressed && styles.pressed,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={isViewing ? 'Hide QR Code' : 'Display QR Code'}
                          >
                            <Ionicons
                              name={isViewing ? 'eye-off-outline' : 'qr-code-outline'}
                              size={15}
                              color={isViewing ? INK : TEAL}
                            />
                            <Text
                              style={[
                                styles.viewQrBtnText,
                                isViewing && { color: INK },
                              ]}
                            >
                              {isViewing ? 'Hide QR' : 'Show QR'}
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() => handleRevoke(s.id)}
                            disabled={revoking === s.id}
                            style={({ pressed }) => [
                              styles.revokeBtn,
                              pressed && styles.pressed,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel="Revoke access"
                          >
                            {revoking === s.id ? (
                              <ActivityIndicator size="small" color={RED} />
                            ) : (
                              <>
                                <Ionicons name="trash-outline" size={15} color={RED} />
                                <Text style={styles.revokeBtnText}>Revoke</Text>
                              </>
                            )}
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ────────────────────────────────────────────────────────
                TIER 3: PAST SHARING SESSIONS
            ──────────────────────────────────────────────────────── */}
            {recentShares.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.35}>
                  Past Share History
                </Text>

                <View style={styles.historyCard}>
                  {visibleRecentShares.map((s, index) => {
                    const isLast = index === visibleRecentShares.length - 1;
                    const isRevoked = Boolean(s.revoked_at);

                    return (
                      <View key={s.id}>
                        <View style={styles.historyRow}>
                          <View style={styles.historyIconBox}>
                            <Ionicons
                              name={isRevoked ? 'close-circle' : 'checkmark-circle'}
                              size={18}
                              color={isRevoked ? RED : MUTED}
                            />
                          </View>

                          <View style={styles.historyContent}>
                            <Text style={styles.historyTitle} numberOfLines={1}>
                              {isRevoked ? 'Manually Revoked' : 'Session Expired'}
                            </Text>
                            <Text style={styles.historySubtitle}>
                              {formatDate(s.created_at || s.expires_at)} at{' '}
                              {formatTime(s.created_at || s.expires_at)}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.historyBadge,
                              isRevoked ? styles.historyBadgeRevoked : styles.historyBadgeExpired,
                            ]}
                          >
                            <Text
                              style={[
                                styles.historyBadgeText,
                                isRevoked && { color: RED },
                              ]}
                            >
                              {isRevoked ? 'REVOKED' : 'EXPIRED'}
                            </Text>
                          </View>
                        </View>
                        {!isLast && <View style={styles.historyDivider} />}
                      </View>
                    );
                  })}

                  {recentShares.length > 3 && (
                    <Pressable
                      onPress={() => {
                        Haptics.selectionAsync();
                        setShowAllHistory(!showAllHistory);
                      }}
                      style={({ pressed }) => [
                        styles.showMoreBtn,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={showAllHistory ? 'Show fewer past sessions' : 'Show all past sessions'}
                    >
                      <Text style={styles.showMoreBtnText}>
                        {showAllHistory
                          ? 'Show Less'
                          : `View All ${recentShares.length} Past Sessions`}
                      </Text>
                      <Ionicons
                        name={showAllHistory ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color={TEAL}
                      />
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            {/* ────────────────────────────────────────────────────────
                SECURITY GUARANTEE FOOTER
            ──────────────────────────────────────────────────────── */}
            <View style={styles.securityBox}>
              <Ionicons name="shield-checkmark" size={16} color={TEAL} />
              <Text style={styles.securityText} maxFontSizeMultiplier={1.35}>
                MedRec sharing links are encrypted. Doctors only receive temporary, read-only viewing permissions that automatically expire.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

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
  scrollContent: {
    flexGrow: 1,
  },
  containerInner: {
    paddingBottom: 8,
  },
  activeHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.card,
    borderWidth: 1.5,
    borderColor: '#D4EBE6',
    padding: 24,
    alignItems: 'center',
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  activeHeroTitle: {
    fontFamily: 'LexendDeca-Bold',
    color: INK,
    textAlign: 'center',
  },
  activeHeroSubtitle: {
    fontFamily: 'LexendDeca-Regular',
    color: MUTED,
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 16,
  },
  qrCodeContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 14,
  },
  activeTimerText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13,
    color: TEAL,
    marginBottom: 16,
  },
  revokeHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: RED_LIGHT,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECDCA',
    minHeight: 44,
  },
  revokeHeroBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12.5,
    color: RED,
  },
  dismissHeroBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    minHeight: 44,
    justifyContent: 'center',
  },
  dismissHeroBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13,
    color: INK,
  },
  loadingQrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  loadingQrText: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 14,
    color: MUTED,
  },
  generateHeroCard: {
    backgroundColor: BLUE,
    borderRadius: Radii.card,
    padding: 18,
    gap: 14,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  generateHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  generateHeroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateHeroTextBox: {
    flex: 1,
    gap: 2,
  },
  generateHeroTitle: {
    fontFamily: 'LexendDeca-Bold',
    color: '#FFFFFF',
  },
  generateHeroSubtitle: {
    fontFamily: 'LexendDeca-Regular',
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 15,
  },
  generatePrimaryBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.button,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  generatePrimaryBtnText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 13.5,
    color: BLUE,
    letterSpacing: 0.2,
  },
  sectionContainer: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 15,
    color: INK,
  },
  cardsStack: {
    gap: 10,
  },
  activeShareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: '#D4EBE6',
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  shareCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadgeLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DDF5EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusDotLive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TEAL,
  },
  statusTextLive: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 10,
    color: TEAL,
    letterSpacing: 0.5,
  },
  shareCardTimer: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12,
    color: TEAL,
  },
  shareCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaIcon: {
    width: 12,
    height: 12,
    resizeMode: 'contain',
    tintColor: MUTED,
  },
  shareCardMetaText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: MUTED,
  },
  shareCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F6F5',
  },
  viewQrBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0F9F7',
    borderRadius: Radii.button,
    height: 38,
    borderWidth: 1,
    borderColor: '#D4EBE6',
  },
  viewQrBtnActive: {
    backgroundColor: '#E2E8F0',
    borderColor: '#CBD5E1',
  },
  viewQrBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12.5,
    color: TEAL,
  },
  revokeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: RED_LIGHT,
    borderRadius: Radii.button,
    height: 38,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#FECDCA',
  },
  revokeBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12,
    color: RED,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  historyIconBox: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyContent: {
    flex: 1,
    gap: 2,
  },
  historyTitle: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 13,
    color: INK,
  },
  historySubtitle: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11.5,
    color: MUTED,
  },
  historyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  historyBadgeRevoked: {
    backgroundColor: RED_LIGHT,
  },
  historyBadgeExpired: {
    backgroundColor: '#F1F5F9',
  },
  historyBadgeText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 9.5,
    color: MUTED,
    letterSpacing: 0.5,
  },
  historyDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 52,
  },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFCFC',
  },
  showMoreBtnText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12,
    color: TEAL,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EDF8F6',
    borderRadius: Radii.card,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D4EBE6',
    marginTop: 4,
  },
  securityText: {
    flex: 1,
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11.5,
    color: '#12343B',
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.75,
  },
  disabledBtn: {
    opacity: 0.6,
  },

  /* ────────────────────────────────────────────────────────
     TABLET SHARING SCREEN STYLES
  ──────────────────────────────────────────────────────── */
  tabletSingleColContainer: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  tabletLandscapeContainer: {
    maxWidth: 1060,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    gap: 20,
  },
  tabletLandscapeSplitRow: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'flex-start',
  },
  tabletLandscapeColLeft: {
    flex: 0.48,
    gap: 16,
  },
  tabletLandscapeColRight: {
    flex: 0.52,
    gap: 16,
  },
});
