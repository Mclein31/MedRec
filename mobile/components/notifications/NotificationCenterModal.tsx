import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
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
  const { isTablet, insets, scaleFont } = useResponsive();
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
    onClose();

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
    }, 150);
  };

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
                  <Ionicons name="close" size={18} color={INK} />
                </Pressable>
              </View>
            </View>
          </View>

          {/* Filter Segmented Control Bar */}
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
              <ActivityIndicator size="small" color={TEAL} />
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
    backgroundColor: Colors.backdrop,
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
    borderBottomColor: '#F0F5F4',
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
    backgroundColor: '#F4FAF9',
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
    borderBottomColor: '#F0F5F4',
  },
  filterTab: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#F0F5F4',
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
