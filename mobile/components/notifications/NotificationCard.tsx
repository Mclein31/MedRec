import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MedRecNotification } from '../../context/NotificationContext';
import { Colors, Radii } from '../../constants/theme';

const TEAL = Colors.teal;
const INK = Colors.ink;
const MUTED = Colors.muted;
const BORDER = Colors.border;
const CARD_BG = Colors.cardBg;

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
        actionHint: 'View record',
      };
    case 'share_created':
    case 'share_expired':
    case 'share_revoked':
      return {
        icon: 'qr-code-outline' as const,
        color: '#0284C7',
        actionHint: 'Review doctor share',
      };
    case 'ai_summary_ready':
      return {
        icon: 'sparkles-outline' as const,
        color: '#7C3AED',
        actionHint: 'Open AI summary',
      };
    case 'emergency_updated':
      return {
        icon: 'medical-outline' as const,
        color: '#D92D20',
        actionHint: 'View Medical ID',
      };
    case 'security_alert':
      return {
        icon: 'shield-checkmark-outline' as const,
        color: '#D92D20',
        actionHint: 'Review profile',
      };
    default:
      return {
        icon: 'notifications-outline' as const,
        color: MUTED,
        actionHint: 'View details',
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
  const isUnread = !notification.read;

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress(notification);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        isUnread ? styles.cardUnread : styles.cardRead,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}, ${notification.body}`}
    >
      <View style={styles.contentRow}>
        {/* Clean Standalone Centered Icon without background box/highlight */}
        <View style={styles.standaloneIconWrapper}>
          <Ionicons name={config.icon} size={26} color={config.color} />
        </View>

        <View style={styles.textColumn}>
          <View style={styles.headerRow}>
            <Text
              style={[styles.title, isUnread && styles.titleUnread]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {notification.title}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>

          <Text
            style={[styles.body, !isUnread && styles.bodyRead]}
            numberOfLines={2}
            maxFontSizeMultiplier={1.3}
          >
            {notification.body}
          </Text>

          <View style={styles.footerRow}>
            <Text style={styles.timestamp} maxFontSizeMultiplier={1.2}>
              {timeString}
            </Text>
            <Text style={styles.footerBullet} maxFontSizeMultiplier={1.2}>
              •
            </Text>
            <Text style={styles.actionHint} maxFontSizeMultiplier={1.2}>
              {config.actionHint}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.card,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  // Unread = true/original white surface color, naturally emphasized
  cardUnread: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D0E6E1',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1.5 },
    elevation: 2,
  },
  // Read = slightly darker surface color, subtle but distinct, not disabled
  cardRead: {
    backgroundColor: '#F2F7F5',
    borderColor: '#E2ECE8',
    shadowColor: '#000',
    shadowOpacity: 0.01,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardPressed: {
    opacity: 0.72,
  },
  contentRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    alignItems: 'center',
  },
  standaloneIconWrapper: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  title: {
    flex: 1,
    fontFamily: 'LexendDeca-Medium',
    fontSize: 13.5,
    color: INK,
    letterSpacing: -0.2,
  },
  titleUnread: {
    fontFamily: 'LexendDeca-SemiBold',
    color: INK,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: TEAL,
  },
  body: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: '#324E48',
    lineHeight: 16.5,
  },
  bodyRead: {
    color: MUTED,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  timestamp: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 10.5,
    color: MUTED,
  },
  footerBullet: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  actionHint: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 10.5,
    color: TEAL,
  },
});

export default NotificationCard;
