import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useCalmMotion } from '../prefs';
import { motion } from '../theme';

/**
 * Fades and lifts children in whenever `active` turns true. Uses shared values rather than
 * layout `entering` animations, so it is safe on web (DD-44). Calm motion shows content at once.
 */
export function Rise({
  active = true,
  delay = 0,
  from = 12,
  x = 0,
  scale = 1,
  duration = motion.enter,
  children,
  style,
}: {
  active?: boolean;
  delay?: number;
  from?: number;
  /** Horizontal offset for directional transitions (onboarding). */
  x?: number;
  /** Starting scale, e.g. 0.92 for a gentle pop. */
  scale?: number;
  duration?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const calm = useCalmMotion();
  const p = useSharedValue(calm ? 1 : 0);
  useEffect(() => {
    if (calm) {
      p.value = 1;
      return;
    }
    if (!active) {
      p.value = 0;
      return;
    }
    p.value = 0;
    p.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
  }, [active, calm, delay, duration, p]);
  const animated = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateX: (1 - p.value) * x }, { translateY: (1 - p.value) * from }, { scale: scale + (1 - scale) * p.value }],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
