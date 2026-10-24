import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Easing,
} from 'react-native';
import { PrivateModal as Modal } from '../security/PrivateModal';
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
const DIVIDER = Colors.divider;

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
  const { isTablet, insets, scaleFont, height } = useResponsive();
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Tablet animation states for independent backdrop & modal slide
  const [modalVisible, setModalVisible] = useState(visible);
  const backdropFadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height || 800)).current;

  const heightRef = useRef(height);
  heightRef.current = height;

  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isClosingRef = useRef(false);
  const prevVisibleRef = useRef(false);
  const animTokenRef = useRef(0);

  const stopAllAnimations = () => {
    backdropFadeAnim.stopAnimation();
    slideAnim.stopAnimation();
  };

  const handleClose = (callback?: () => void) => {
    if (!isTablet) {
      onClose();
      if (callback) callback();
      return;
    }

    if (isClosingRef.current) return;
    isClosingRef.current = true;
    onClose(); // Synchronize parent state immediately so reopen taps are not blocked

    const currentToken = ++animTokenRef.current;
    stopAllAnimations();

    Animated.parallel([
      Animated.timing(backdropFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: heightRef.current || 800,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && animTokenRef.current === currentToken) {
        setModalVisible(false);
        isClosingRef.current = false;
        if (callback) callback();
      }
    });
  };

  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (!isTablet) {
      setModalVisible(visible);
      return;
    }

    if (visible && !wasVisible) {
      isClosingRef.current = false;
      animTokenRef.current += 1;
      stopAllAnimations();

      // Smooth reversal: only hard reset values if modal was not already visible
      if (!modalVisible) {
        backdropFadeAnim.setValue(0);
        slideAnim.setValue(heightRef.current || 800);
      }
      setModalVisible(true);

      Animated.parallel([
        Animated.timing(backdropFadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (!visible && wasVisible && modalVisible && !isClosingRef.current) {
      handleClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isTablet]);

  useEffect(() => {
    return () => {
      stopAllAnimations();
      if (navTimerRef.current) {
        clearTimeout(navTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleNotificationPress = (notification: MedRecNotification) => {
    if (!notification.read) {
      markAsRead(notification.id).catch(() => {});
    }

    const navigate = () => {
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
    };

    if (isTablet) {
      handleClose(navigate);
    } else {
      onClose();
      if (navTimerRef.current) {
        clearTimeout(navTimerRef.current);
      }
      navTimerRef.current = setTimeout(navigate, 150);
    }
  };

  const modalContent = (
    <>
      {/* Header with integrated drag handle */}
      <View style={styles.header}>
        {!isTablet && <DragHandle />}

        <View style={styles.headerContentRow}>
          <View style={styles.headerTitleGroup}>
            <Text
              style={[
                styles.headerTitle,
                { fontSize: scaleFont(19, 17, 21) },
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
                <Text style={styles.markAllText} maxFontSizeMultiplier={1.35}>Mark all as read</Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => handleClose()}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close notifications"
            >
              <Ionicons name="close" size={18} color={INK} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Filter Segmented Control Bar */}
      <View style={styles.filterBar} accessibilityRole="tablist">
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab('all');
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'all' }}
          accessibilityLabel={`All notifications, ${notifications.length} total`}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
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
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'unread' }}
          accessibilityLabel={`Unread notifications, ${unreadCount} unread`}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
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
          <ActivityIndicator size="small" color={TEAL} />
          <Text style={styles.loadingText} maxFontSizeMultiplier={1.35}>Loading notifications...</Text>
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
            { paddingBottom: isTablet ? 16 : Math.max(insets.bottom, 20) + 16 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={TEAL}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {/* Clean Standalone Icon without background circle */}
              <Ionicons name="notifications-off-outline" size={36} color={TEAL} />
              <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.35}>
                {activeTab === 'unread' ? 'No unread notifications' : 'All caught up'}
              </Text>
              <Text style={styles.emptySubtitle} maxFontSizeMultiplier={1.35}>
                {activeTab === 'unread'
                  ? 'You have reviewed all your health alerts and updates.'
                  : 'Important updates about your shared records, AI summaries, and security will appear here.'}
              </Text>
            </View>
          }
        />
      )}
    </>
  );

  if (!isTablet) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
        onDismiss={onClose}
        accessibilityViewIsModal
      >
        <View style={styles.modalRoot}>
          <View style={styles.container}>
            {modalContent}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={() => handleClose()}
      accessibilityViewIsModal
    >
      <View style={styles.modalRootTablet}>
        {/* Layer 1: Independent Stationary Dimming Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropFadeAnim },
          ]}
          pointerEvents={modalVisible ? 'auto' : 'none'}
        >
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => handleClose()}
            accessibilityRole="button"
            accessibilityLabel="Close notifications backdrop"
          />
        </Animated.View>

        {/* Layer 2: Independent Sliding Modal Window */}
        <View style={styles.tabletCenterWrapper} pointerEvents="box-none">
          <Animated.View
            accessibilityLabel="Notifications Dialog"
            pointerEvents={isClosingRef.current ? 'none' : 'auto'}
            style={[
              styles.container,
              styles.containerTablet,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {modalContent}
          </Animated.View>
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
    flex: 1,
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.backdrop,
  },
  tabletCenterWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  containerTablet: {
    flex: 0,
    width: '100%',
    maxWidth: ResponsiveLimits.maxModalWidth,
    minHeight: 320,
    maxHeight: '85%',
    borderRadius: Radii.sheet,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  header: {
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 18,
  },
  headerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
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
    fontSize: 11.5,
    color: MUTED,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markAllBtn: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: '#F0F9F7',
    minHeight: 28,
    justifyContent: 'center',
  },
  markAllText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11.5,
    color: TEAL,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  filterTab: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: DIVIDER,
    minHeight: 28,
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: TEAL,
  },
  filterTabText: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 12,
    color: MUTED,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontFamily: 'LexendDeca-SemiBold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: MUTED,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 15,
    color: INK,
    textAlign: 'center',
    marginTop: 4,
  },
  emptySubtitle: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.7,
  },
});

export default NotificationCenterModal;
