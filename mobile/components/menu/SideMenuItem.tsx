import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/theme';

export interface SideMenuItemProps {
  imageSource?: ImageSourcePropType;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  sublabel?: string;
  badge?: string | number;
  onPress: () => void;
  destructive?: boolean;
  active?: boolean;
  accessibilityLabel?: string;
}

export const SideMenuItem: React.FC<SideMenuItemProps> = ({
  imageSource,
  icon,
  iconColor = Colors.muted,
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

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel || `${label}${badge ? `, ${badge}` : ''}`}
    >
      {/* Slim 2.5px Leading Active Indicator */}
      {active && <View style={styles.activeIndicator} />}

      {/* Free-Standing Icon Glyph Area (Zero Background Box) */}
      <View style={styles.iconArea}>
        {imageSource ? (
          <Image source={imageSource} style={styles.imageIcon} resizeMode="contain" />
        ) : icon ? (
          <Ionicons name={icon} size={20} color={resolvedIconColor} />
        ) : null}
      </View>

      {/* Label Group */}
      <View style={styles.textContainer}>
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  rowPressed: {
    opacity: 0.65,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 13,
    bottom: 13,
    width: 2.5,
    backgroundColor: Colors.teal,
    borderTopRightRadius: 1.5,
    borderBottomRightRadius: 1.5,
  },
  iconArea: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageIcon: {
    width: 22,
    height: 22,
  },
  textContainer: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.ink,
    letterSpacing: -0.2,
  },
  labelActive: {
    fontFamily: 'LexendDeca-SemiBold',
    color: Colors.teal,
  },
  labelDestructive: {
    fontFamily: 'LexendDeca-Medium',
    color: Colors.red,
  },
  sublabel: {
    fontFamily: 'LexendDeca-Regular',
    fontSize: 11.5,
    lineHeight: 15,
    color: Colors.muted,
    marginTop: 1,
  },
  sublabelActive: {
    color: Colors.tealDark,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: Colors.tealLight,
    marginLeft: 8,
  },
  badgeText: {
    fontFamily: 'LexendDeca-Bold',
    fontSize: 10.5,
    color: Colors.teal,
  },
});

export default SideMenuItem;
