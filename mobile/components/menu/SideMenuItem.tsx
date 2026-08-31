import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/theme';

export interface SideMenuItemProps {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  label: string;
  sublabel?: string;
  badge?: string | number;
  onPress: () => void;
  destructive?: boolean;
  active?: boolean;
  accessibilityLabel?: string;
}

export const SideMenuItem: React.FC<SideMenuItemProps> = ({
  icon,
  iconColor = Colors.ink,
  iconBg = Colors.bg,
  label,
  sublabel,
  badge,
  onPress,
  destructive = false,
  active = false,
  accessibilityLabel,
}) => {
  const handlePress = () => {
    if (destructive) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.selectionAsync();
    }
    onPress();
  };

  const resolvedIconColor = destructive
    ? Colors.red
    : active
    ? Colors.teal
    : iconColor;

  const resolvedIconBg = destructive
    ? Colors.redLight
    : active
    ? Colors.tealLight
    : iconBg;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        active && styles.rowActive,
        pressed && styles.rowPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel || `${label}${sublabel ? `, ${sublabel}` : ''}`}
    >
      {/* Active Left Indicator Pill */}
      {active && <View style={styles.activeIndicator} />}

      {/* Leading Squircle Icon */}
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: resolvedIconBg }]}>
          <Ionicons name={icon} size={18} color={resolvedIconColor} />
        </View>
      )}

      {/* Text Group */}
      <View style={[styles.textContainer, !icon && styles.textContainerNoIcon]}>
        <Text
          style={[
            styles.label,
            destructive && styles.labelDestructive,
            active && styles.labelActive,
          ]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {label}
        </Text>
        {sublabel ? (
          <Text
            style={[styles.sublabel, active && styles.sublabelActive]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {sublabel}
          </Text>
        ) : null}
      </View>

      {/* Trailing Badge */}
      {badge !== undefined && badge !== null ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    minHeight: 50,
    position: 'relative',
    marginHorizontal: 8,
  },
  rowActive: {
    backgroundColor: '#F0F9F7',
  },
  rowPressed: {
    backgroundColor: '#F1F5F9',
    opacity: 0.85,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3.5,
    backgroundColor: Colors.teal,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    gap: 2,
  },
  textContainerNoIcon: {
    marginLeft: 0,
  },
  label: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 14.5,
    color: Colors.ink,
    letterSpacing: -0.2,
  },
  labelActive: {
    fontFamily: 'LexendDeca-Bold',
    color: Colors.teal,
  },
  labelDestructive: {
    fontFamily: 'LexendDeca-SemiBold',
    color: Colors.red,
  },
  sublabel: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11.5,
    color: Colors.muted,
  },
  sublabelActive: {
    color: Colors.tealDark,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: Colors.tealLight,
    marginLeft: 8,
  },
  badgeText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11,
    color: Colors.teal,
  },
});

export default SideMenuItem;
