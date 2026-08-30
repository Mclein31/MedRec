import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Radii, Typography } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive' | 'blue' | 'outline';
  size?: 'default' | 'small';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
}) => {
  const { buttonHeight, scaleFont } = useResponsive();

  const handlePress = () => {
    if (disabled || loading) return;
    if (variant === 'destructive') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const getContainerStyle = () => {
    const isSmall = size === 'small';
    switch (variant) {
      case 'secondary':
        return [styles.secondaryBtn, isSmall && styles.smallBtn];
      case 'destructive':
        return [styles.destructiveBtn, isSmall && styles.smallBtn];
      case 'blue':
        return [styles.blueBtn, isSmall && styles.smallBtn];
      case 'outline':
        return [styles.outlineBtn, isSmall && styles.smallBtn];
      case 'primary':
      default:
        return [styles.primaryBtn, isSmall && styles.smallBtn];
    }
  };

  const getTextStyle = () => {
    const isSmall = size === 'small';
    switch (variant) {
      case 'secondary':
        return [styles.secondaryText, isSmall && styles.smallText];
      case 'destructive':
        return [styles.destructiveText, isSmall && styles.smallText];
      case 'blue':
        return [styles.blueText, isSmall && styles.smallText];
      case 'outline':
        return [styles.outlineText, isSmall && styles.smallText];
      case 'primary':
      default:
        return [styles.primaryText, isSmall && styles.smallText];
    }
  };

  const getIndicatorColor = () => {
    switch (variant) {
      case 'secondary':
        return Colors.teal;
      case 'destructive':
        return Colors.red;
      case 'outline':
        return Colors.ink;
      case 'blue':
      case 'primary':
      default:
        return Colors.white;
    }
  };

  const dynamicHeight = size === 'small' ? 38 : buttonHeight;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.baseButton,
        { height: dynamicHeight, minHeight: 44 },
        getContainerStyle(),
        disabled && styles.disabledBtn,
        pressed && styles.pressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getIndicatorColor()} />
      ) : (
        <>
          {leftIcon}
          <Text
            style={[
              getTextStyle(),
              { fontSize: size === 'small' ? scaleFont(12, 11, 13) : scaleFont(14, 13, 15.5) },
              textStyle,
            ]}
            maxFontSizeMultiplier={1.35}
          >
            {label}
          </Text>
          {rightIcon}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: Radii.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  smallBtn: {
    paddingHorizontal: 12,
    borderRadius: Radii.md,
  },
  primaryBtn: {
    backgroundColor: Colors.teal,
  },
  secondaryBtn: {
    backgroundColor: Colors.tealLight,
  },
  destructiveBtn: {
    backgroundColor: Colors.redLight,
    borderWidth: 1,
    borderColor: Colors.redBorder,
  },
  blueBtn: {
    backgroundColor: Colors.blue,
  },
  outlineBtn: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disabledBtn: {
    backgroundColor: '#E2E8F0',
    borderColor: '#E2E8F0',
  },
  pressed: {
    opacity: 0.8,
  },
  primaryText: {
    ...Typography.button,
    color: Colors.white,
  },
  secondaryText: {
    ...Typography.button,
    color: Colors.teal,
  },
  destructiveText: {
    ...Typography.button,
    color: Colors.red,
  },
  blueText: {
    ...Typography.button,
    color: Colors.white,
  },
  outlineText: {
    ...Typography.button,
    color: Colors.ink,
  },
  smallText: {
    fontSize: 12.5,
  },
});

export default Button;
