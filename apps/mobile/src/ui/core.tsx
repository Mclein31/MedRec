import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { usePrefs } from '../prefs';
import { motion, radius, space, type as t, useColors } from '../theme';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Variant = keyof typeof t;

export function Txt({ variant = 'body', color, style, ...rest }: TextProps & { variant?: Variant; color?: string }) {
  const c = useColors();
  const { largerText } = usePrefs();
  const base = t[variant];
  const sized = largerText ? { fontSize: Math.round(base.fontSize * 1.15), lineHeight: Math.round(base.lineHeight * 1.15) } : null;
  return <Text {...rest} style={[base, sized, { color: color ?? c.ink }, style]} maxFontSizeMultiplier={1.6} />;
}

/** Small uppercase label above a section or card ("LAB RESULT / 22 OCT 2026"). */
export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  const c = useColors();
  return (
    <Txt variant="micro" color={color ?? c.ink2} style={{ textTransform: 'uppercase' }}>
      {children}
    </Txt>
  );
}

/** Inline text action with a trailing arrow, e.g. "View this record ↗". */
export function TextLink({ label, onPress, icon = 'arrow-top-right', color }: { label: string; onPress: () => void; icon?: IconName | null; color?: string }) {
  const c = useColors();
  const fg = color ?? c.ink;
  return (
    <Tappable onPress={onPress} accessibilityRole="link" accessibilityLabel={label} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 44 }}>
      <Txt variant="label" color={fg}>{label}</Txt>
      {icon && <Icon name={icon} size={16} color={fg} />}
    </Tappable>
  );
}

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const c = useColors();
  return <MaterialCommunityIcons name={name} size={size} color={color ?? c.ink2} />;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Press feedback shared by every tappable surface: brief ease-out scale, none under Reduce Motion. */
export function Tappable({
  onPress,
  style,
  children,
  disabled,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
  haptic = false,
  hitSlop,
  dimmed = false,
}: {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link' | 'tab' | 'checkbox' | 'radio' | 'switch';
  accessibilityState?: { selected?: boolean; checked?: boolean; disabled?: boolean };
  haptic?: boolean;
  hitSlop?: number;
  /** Disabled look. Lives in the animated style so press feedback can't override it. */
  dimmed?: boolean;
}) {
  const reduce = useReducedMotion();
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: reduce ? 1 : 1 - pressed.value * (1 - motion.pressScale) }],
    opacity: (dimmed ? 0.45 : 1) * (reduce ? 1 - pressed.value * 0.25 : 1),
  }));
  const timing = { duration: motion.press, easing: Easing.out(Easing.quad) };
  return (
    <AnimatedPressable
      onPress={() => {
        if (haptic && Platform.OS !== 'web') void Haptics.selectionAsync();
        onPress?.();
      }}
      onPressIn={() => (pressed.value = withTiming(1, timing))}
      onPressOut={() => (pressed.value = withTiming(0, timing))}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  icon,
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  /** primary: persimmon signature action. dark: aubergine. secondary: outlined. gold: on dark panels. */
  kind?: 'primary' | 'dark' | 'secondary' | 'gold' | 'ghost' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const palette = {
    primary: { bg: c.persimmon, fg: c.onPersimmon, border: c.persimmon },
    dark: { bg: c.accent, fg: c.onAccent, border: c.accent },
    secondary: { bg: c.surface, fg: c.ink, border: c.ink },
    gold: { bg: c.gold, fg: c.onGold, border: c.gold },
    ghost: { bg: 'transparent', fg: c.accent, border: 'transparent' },
    danger: { bg: c.dangerSoft, fg: c.danger, border: c.dangerSoft },
  }[kind];
  const off = disabled || loading;
  return (
    <Tappable
      onPress={onPress}
      disabled={off}
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off }}
      dimmed={!!disabled && !loading}
      style={[
        {
          minHeight: 56,
          borderRadius: radius.md,
          paddingHorizontal: space.xl,
          backgroundColor: palette.bg,
          borderWidth: 1,
          borderColor: palette.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.sm,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={palette.fg} /> : icon ? <Icon name={icon} size={18} color={palette.fg} /> : null}
      <Txt variant="headline" color={palette.fg} style={{ textAlign: 'center' } as TextStyle}>
        {label}
      </Txt>
    </Tappable>
  );
}

export function Banner({ tone = 'danger', message, action }: { tone?: 'danger' | 'warn' | 'info'; message: string; action?: { label: string; onPress: () => void } }) {
  const c = useColors();
  const bg = tone === 'danger' ? c.dangerSoft : tone === 'warn' ? c.warnSoft : c.accentSoft;
  const fg = tone === 'danger' ? c.danger : tone === 'warn' ? c.warn : c.ink;
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: bg, borderRadius: radius.sm, padding: space.md, flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
      <Icon name={tone === 'info' ? 'information-outline' : 'alert-circle-outline'} size={18} color={fg} />
      <Txt variant="caption" color={fg} style={{ flex: 1 }}>
        {message}
      </Txt>
      {action && (
        <Tappable onPress={action.onPress} accessibilityLabel={action.label} hitSlop={8}>
          <Txt variant="label" color={fg}>
            {action.label}
          </Txt>
        </Tappable>
      )}
    </View>
  );
}
