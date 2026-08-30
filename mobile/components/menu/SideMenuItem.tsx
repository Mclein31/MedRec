import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';

const TEAL = '#159A83';
const INK = '#12343B';
const MUTED = '#64748B';
const GREEN_LIGHT = '#DDF5EE';
const RED = '#D92D20';

export interface SideMenuItemProps {
  label: string;
  sublabel?: string;
  badge?: string | number;
  onPress: () => void;
  destructive?: boolean;
  active?: boolean;
  accessibilityLabel?: string;
}

export const SideMenuItem: React.FC<SideMenuItemProps> = ({
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

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        active && styles.rowActive,
        pressed && styles.rowPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
    >
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.label,
            destructive && styles.labelDestructive,
            active && styles.labelActive,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {sublabel ? (
          <Text style={styles.sublabel} numberOfLines={1}>
            {sublabel}
          </Text>
        ) : null}
      </View>

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
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 10,
    minHeight: 46,
  },
  rowActive: {
    backgroundColor: '#F0F9F7',
  },
  rowPressed: {
    backgroundColor: '#F1F5F9',
    opacity: 0.8,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: 'LexendDeca-Medium',
    fontSize: 15,
    color: INK,
    letterSpacing: -0.2,
  },
  labelActive: {
    fontFamily: 'LexendDeca-SemiBold',
    color: TEAL,
  },
  labelDestructive: {
    fontFamily: 'LexendDeca-SemiBold',
    color: RED,
  },
  sublabel: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 12,
    color: MUTED,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: GREEN_LIGHT,
  },
  badgeText: {
    fontFamily: 'LexendDeca-SemiBold',
    fontSize: 11,
    color: TEAL,
  },
});

export default SideMenuItem;
