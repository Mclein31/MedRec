import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useNotifications, MedRecNotification } from '../../context/NotificationContext';
import { NotificationCard } from './NotificationCard';
import { DragHandle } from '../ui/DragHandle';
import { Colors, Radii, ResponsiveLimits } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';

const TEAL = Colors.teal;
const INK = Colors.ink;
const MUTED = Colors.muted;
const BORDER = Colors.border;
const BG = Colors.bg;
const CARD_BG = Colors.cardBg;

const notificationKeyExtractor = (item: MedRecNotification) => item.id;

interface NotificationCenterModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenAiSummary?: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  visible,
  onClose,
  onOpenAiSummary,
}) => {
  const { isTablet, isLandscape, width, insets, scaleFont } = useResponsive();
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const panelWidth = isLandscape
    ? Math.min(width * 0.44, 420)
    : Math.min(width * 0.60, 420);

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Tablet (Portrait & Landscape) animated state for independent backdrop & panel slide
  const [modalVisible, setModalVisible] = useState(visible);
  const slideAnim = useRef(new Animated.Value(panelWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isTablet) {
      setModalVisible(visible);
      return;
    }

    if (visible) {
      setModalVisible(true);
      slideAnim.setValue(panelWidth);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: panelWidth,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible, isTablet, panelWidth]);

  const handleClose = () => {
    if (!isTablet) {
      onClose();
      return;
    }
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: panelWidth,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      onClose();
    });
  };

  const filteredNotifications =
    activeTab === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications;

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await markAllAsRead();
  };

  const handleNotificationPress = async (notification: MedRecNotification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    handleClose();

    setTimeout(() => {
      if (notification.type === 'record_added' && notification.data?.recordId) {
        router.push(`/record/${notification.data.recordId}` as any);
      } else if (
        notification.type === 'share_created' ||
        notification.type === 'share_expired' ||
        notification.type === 'share_revoked'
      ) {
        router.push('/(tabs)/share' as any);
      } else if (
        notification.type === 'emergency_updated' ||
        notification.type === 'security_alert'
      ) {
        router.push('/(tabs)/profile' as any);
      } else if (notification.type === 'ai_summary_ready') {
        if (onOpenAiSummary) {
          onOpenAiSummary();
        } else {
          router.push('/(tabs)' as any);
        }
      }
    }, isTablet ? 220 : 150);
  };

  // ─── 1. TABLET (PORTRAIT & LANDSCAPE) FLOATING SIDE PANEL ───────────────
  if (isTablet) {
    return (
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={handleClose}
      >
        <View style={styles.modalRootTabletSide}>
          {/* Layer 1: Independent Full-Screen Stationary Dimming Backdrop */}
          <Animated.View
            style={[
              styles.backdropTablet,
              { opacity: fadeAnim },
            ]}
          >
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close notifications backdrop"
            />
          </Animated.View>

          {/* Layer 2: Right-Side Anchored Notification Panel with Side Slide Transition */}
          <Animated.View
            style={[
              styles.containerTabletSide,
              {
                width: panelWidth,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={[styles.headerTabletSide, { paddingTop: Math.max(insets.top + 6, 18) }]}>
              <View style={styles.headerContentRow}>
                <View style={styles.headerTitleGroup}>
                  <Text
                    style={[
                      styles.headerTitle,
                      { fontSize: scaleFont(20, 18, 22) },
                    ]}
                    maxFontSizeMultiplier={1.35}
                  >
                    Notifications
                  </Text>
                  <Text style={styles.headerSubtitle} maxFontSizeMultiplier={1.35}>
                    {unreadCount > 0
                      ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}`
                      : 'All caught up'}
                  </Text>
                </View>

                <View style={styles.headerActions}>
                  {unreadCount > 0 && (
                    <Pressable
                      onPress={handleMarkAllRead}
                      style={({ pressed }) => [styles.markAllBtn, pressed && styles.pressed]}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Mark all notifications as read"
                    >
                      <Text style={styles.markAllText}>Mark all as read</Text>
                    </Pressable>
                  )}

                  <Pressable
                    onPress={handleClose}
                    style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Close notifications"
                  >
                    <Ionicons name="close" size={20} color={INK} />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Filter Segmented Control */}
            <View style={styles.filterBar}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab('all');
                }}
                style={[styles.filterTab, activeTab === 'all' && styles.filterTabActive]}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    activeTab === 'all' && styles.filterTabTextActive,
                  ]}
                  maxFontSizeMultiplier={1.35}
                >
                  All ({notifications.length})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab('unread');
                }}
                style={[styles.filterTab, activeTab === 'unread' && styles.filterTabActive]}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    activeTab === 'unread' && styles.filterTabTextActive,
                  ]}
                  maxFontSizeMultiplier={1.35}
                >
                  Unread ({unreadCount})
                </Text>
              </Pressable>
            </View>

            {/* Notification List / Empty State */}
            {loading && notifications.length === 0 ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={TEAL} />
                <Text style={styles.loadingText}>Loading notifications...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredNotifications}
                keyExtractor={notificationKeyExtractor}
                renderItem={({ item }) => (
                  <NotificationCard
                    notification={item}
                    onPress={handleNotificationPress}
                  />
                )}
                contentContainerStyle={[
                  styles.listContent,
                  { paddingBottom: Math.max(insets.bottom, 20) + 16 },
                ]}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={TEAL}
                  />
                }
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconBox}>
                      <Ionicons name="notifications-off-outline" size={32} color={TEAL} />
                    </View>
                    <Text style={styles.emptyTitle}>
                      {activeTab === 'unread' ? 'No unread notifications' : 'All caught up'}
                    </Text>
                    <Text style={styles.emptySubtitle}>
                      {activeTab === 'unread'
                        ? 'You have reviewed all your health alerts and updates.'
                        : 'Important updates about your shared records, AI summaries, and security will appear here.'}
                    </Text>
                  </View>
                }
              />
            )}
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // ─── 2. PHONE & TABLET PORTRAIT MODAL (100% UNTOUCHED 🔒) ───────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={isTablet ? 'overFullScreen' : 'pageSheet'}
      transparent={isTablet}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.modalRoot,
          isTablet && styles.modalRootTablet,
        ]}
      >
        {isTablet && (
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        )}
        <View
          style={[
            styles.container,
            isTablet && styles.containerTablet,
          ]}
        >
          {/* Header with integrated drag handle */}
          <View style={styles.header}>
            <DragHandle />

            <View style={styles.headerContentRow}>
              <View style={styles.headerTitleGroup}>
                <Text
                  style={[
                    styles.headerTitle,
                    { fontSize: scaleFont(20, 18, 22) },
                  ]}
                  maxFontSizeMultiplier={1.35}
                >
                  Notifications
                </Text>
                <Text style={styles.headerSubtitle} maxFontSizeMultiplier={1.35}>
                  {unreadCount > 0
                    ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}`
                    : 'All caught up'}
                </Text>
              </View>

              <View style={styles.headerActions}>
                {unreadCount > 0 && (
                  <Pressable
                    onPress={handleMarkAllRead}
                    style={({ pressed }) => [styles.markAllBtn, pressed && styles.pressed]}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Mark all notifications as read"
                  >
                    <Text style={styles.markAllText}>Mark all as read</Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Close notifications"
                >
                  <Ionicons name="close" size={20} color={INK} />
                </Pressable>
              </View>
            </View>
          </View>

          {/* Filter Segmented Control */}
          <View style={styles.filterBar}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab('all');
              }}
              style={[styles.filterTab, activeTab === 'all' && styles.filterTabActive]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  activeTab === 'all' && styles.filterTabTextActive,
                ]}
                maxFontSizeMultiplier={1.35}
              >
                All ({notifications.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab('unread');
              }}
              style={[styles.filterTab, activeTab === 'unread' && styles.filterTabActive]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  activeTab === 'unread' && styles.filterTabTextActive,
                ]}
                maxFontSizeMultiplier={1.35}
              >
                Unread ({unreadCount})
              </Text>
            </Pressable>
          </View>

          {/* Notification List / Empty State */}
          {loading && notifications.length === 0 ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={TEAL} />
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredNotifications}
              keyExtractor={notificationKeyExtractor}
              renderItem={({ item }) => (
                <NotificationCard
                  notification={item}
                  onPress={handleNotificationPress}
                />
              )}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: Math.max(insets.bottom, 20) + 16 },
              ]}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={TEAL}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconBox}>
                    <Ionicons name="notifications-off-outline" size={32} color={TEAL} />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {activeTab === 'unread' ? 'No unread notifications' : 'All caught up'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {activeTab === 'unread'
                      ? 'You have reviewed all your health alerts and updates.'
                      : 'Important updates about your shared records, AI summaries, and security will appear here.'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: BG,
  },
  modalRootTablet: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalRootTabletSide: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    backgroundColor: 'transparent',
  },
  backdropTablet: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.backdrop,
  },
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  containerTablet: {
    flex: 0,
    width: '100%',
    maxWidth: ResponsiveLimits.maxModalWidth,
    maxHeight: '85%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  containerTabletSide: {
    height: '100%',
    backgroundColor: BG,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    borderLeftWidth: 1,
    borderLeftColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: -6, height: 0 },
    elevation: 16,
    overflow: 'hidden',
  },
  headerTabletSide: {
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  header: {
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  headerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleGroup: {
    gap: 2,
  },
  headerTitle: {
    fontFamily: 'LexendDeca-Bold',
    color: INK,
  },
  headerSubtitle: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: MUTED,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F0F9F7',
    minHeight: 32,
    justifyContent: 'center',
  },
  markAllText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 12,
    color: TEAL,
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
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    minHeight: 32,
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: TEAL,
  },
  filterTabText: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 13,
    color: MUTED,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontFamily: 'LexendDeca-SemiBold',
  },
  listContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 14,
    color: MUTED,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
    gap: 10,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DDF5EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 17,
    color: INK,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.7,
  },
});

export default NotificationCenterModal;
