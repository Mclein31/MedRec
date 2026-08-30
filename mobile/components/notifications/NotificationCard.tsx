import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MedRecNotification } from '../../context/NotificationContext';
import { Colors, Spacing, Radii, Typography } from '../../constants/theme';

const TEAL = Colors.teal;
const TEAL_LIGHT = Colors.tealLight;
const INK = Colors.ink;
const MUTED = Colors.muted;
const BORDER = Colors.border;
const CARD_BG = Colors.cardBg;
const UNREAD_BG = Colors.bg;

interface NotificationCardProps {
  notification: MedRecNotification;
  onPress: (notification: MedRecNotification) => void;
  onDelete?: (id: string) => void;
}

function getCategoryConfig(type: string) {
  switch (type) {
    case 'record_added':
      return {
        icon: 'folder-outline' as const,
        color: TEAL,
        bg: TEAL_LIGHT,
        actionHint: 'Tap to view record',
      };
    case 'share_created':
    case 'share_expired':
    case 'share_revoked':
      return {
        icon: 'share-social-outline' as const,
        color: '#0284C7',
        bg: '#E0F2FE',
        actionHint: 'Tap to review sharing',
      };
    case 'ai_summary_ready':
      return {
        icon: 'sparkles-outline' as const,
        color: '#7C3AED',
        bg: '#EDE9FE',
        actionHint: 'Tap to open AI insights',
      };
    case 'emergency_updated':
      return {
        icon: 'medical-outline' as const,
        color: '#D92D20',
        bg: '#FEE2E2',
        actionHint: 'Tap to view Medical ID',
      };
    case 'security_alert':
      return {
        icon: 'shield-checkmark-outline' as const,
        color: '#D92D20',
        bg: '#FEE2E2',
        actionHint: 'Tap to review profile',
      };
    default:
      return {
        icon: 'notifications-outline' as const,
        color: MUTED,
        bg: '#F1F5F9',
        actionHint: 'Tap to view',
      };
  }
}

function formatRelativeTime(dateStr: string) {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
}) => {
  const config = getCategoryConfig(notification.type);
  const timeString = formatRelativeTime(notification.createdAt);

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress(notification);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        !notification.read && styles.cardUnread,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}, ${notification.body}`}
    >
      {!notification.read && <View style={styles.unreadBar} />}

      <View style={styles.contentRow}>
        <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>

        <View style={styles.textColumn}>
          <View style={styles.headerRow}>
            <Text
              style={[styles.title, !notification.read && styles.titleUnread]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            {!notification.read && <View style={styles.unreadDot} />}
          </View>

          <Text style={styles.body} numberOfLines={2}>
            {notification.body}
          </Text>

          <View style={styles.footerRow}>
            <Text style={styles.timestamp}>{timeString}</Text>
            <Text style={styles.actionHint}>• {config.actionHint}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardUnread: {
    backgroundColor: UNREAD_BG,
    borderColor: '#CDEAE4',
  },
  cardPressed: {
    opacity: 0.85,
    backgroundColor: '#EDF5F3',
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: TEAL,
  },
  contentRow: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
    gap: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: 'LexendDeca-Medium',
    fontSize: 14,
    color: INK,
    letterSpacing: -0.2,
  },
  titleUnread: {
    fontFamily: 'LexendDeca-SemiBold',
    color: INK,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEAL,
  },
  body: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 13,
    color: MUTED,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  timestamp: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11,
    color: MUTED,
  },
  actionHint: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 11,
    color: TEAL,
  },
});

export default NotificationCard;
