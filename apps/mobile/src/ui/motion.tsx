import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { cubicBezier, Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useCalmMotion } from '../prefs';
import { curves, motion } from '../theme';

/** Worklet easings built from the shared curves. Never ease-in on UI: it delays the moment being watched. */
export const ease = {
  out: Easing.bezier(...curves.out),
  inOut: Easing.bezier(...curves.inOut),
  sheet: Easing.bezier(...curves.sheet),
};

/**
 * CSS transition for state-driven colour changes (selection, focus). Runs on the UI thread with no
 * shared values. Colour still changes under calm motion, which explains state rather than decorates.
 */
export function colorTransition(calm: boolean, properties: ('backgroundColor' | 'borderColor')[] = ['backgroundColor', 'borderColor']) {
  return {
    transitionProperty: properties,
    transitionDuration: calm ? 0 : 150,
    transitionTimingFunction: cubicBezier(...curves.out),
  } as unknown as ViewStyle;
}

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
  /** Starting scale, e.g. 0.96 for a gentle settle. Never below ~0.9. */
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
    p.value = withDelay(delay, withTiming(1, { duration, easing: ease.out }));
  }, [active, calm, delay, duration, p]);
  const animated = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateX: (1 - p.value) * x }, { translateY: (1 - p.value) * from }, { scale: scale + (1 - scale) * p.value }],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

type Box = { x: number; y: number; w: number; bar: number };

/**
 * One indicator that travels between measured items (tab underline, filter underline): spatial
 * continuity instead of one bar fading out and another fading in. Positions go straight to shared
 * values, so React never re-renders while it moves. The first placement and calm motion jump.
 * Wrap each item in a View with `onLayout={item(key)}` and put `onLayout={bar(key)}` on a
 * transparent spacer where the marker should sit; render the marker absolutely with `style`.
 */
export function useSlidingMarker(activeKey: string | undefined, width: number) {
  const calm = useCalmMotion();
  const boxes = useRef<Record<string, Box>>({});
  const placed = useRef(false);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const shown = useSharedValue(0);

  const place = useCallback(() => {
    const b = activeKey ? boxes.current[activeKey] : undefined;
    if (!b) {
      shown.value = withTiming(0, { duration: calm ? 0 : motion.routine, easing: ease.out });
      return;
    }
    const tx = b.x + (b.w - width) / 2;
    if (!placed.current || calm) {
      x.value = tx;
      y.value = b.y + b.bar;
      placed.current = true;
    } else {
      x.value = withTiming(tx, { duration: 240, easing: ease.inOut });
      y.value = withTiming(b.y + b.bar, { duration: 240, easing: ease.inOut });
    }
    shown.value = withTiming(1, { duration: calm ? 0 : motion.routine, easing: ease.out });
  }, [activeKey, calm, shown, width, x, y]);
  useEffect(place, [place]);

  const measure = (key: string, patch: Partial<Box>) => {
    boxes.current[key] = { x: 0, y: 0, w: 0, bar: 0, ...boxes.current[key], ...patch };
    if (key === activeKey) place();
  };
  const style = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateX: x.value }, { translateY: y.value }] }));
  return {
    style,
    item: (key: string) => (e: { nativeEvent: { layout: { x: number; y: number; width: number } } }) =>
      measure(key, { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y, w: e.nativeEvent.layout.width }),
    bar: (key: string) => (e: { nativeEvent: { layout: { y: number } } }) => measure(key, { bar: e.nativeEvent.layout.y }),
  };
}

/**
 * Choreographed swap between states of one region (loading -> content, intro -> conversation,
 * step -> step). The outgoing content clears out quickly (110 ms, a short drift), then the incoming
 * content settles in (200 ms). Under a third of a second end to end, so it never feels like waiting.
 * `direction` 1/-1 drifts sideways for forward/back steps; 0 drifts vertically. A change mid-exit
 * retargets, and returning to the shown state mid-exit simply reverses. Calm motion swaps at once.
 * Web-safe: shared values only, no layout animations (DD-44).
 */
export function Swap({ id, direction: fixed = 0, order, children, style }: {
  id: string;
  direction?: -1 | 0 | 1;
  /** Step order for a flow: moving later travels forward (left), earlier travels back (right). */
  order?: string[];
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const calm = useCalmMotion();
  const [shown, setShown] = useState(id);
  const step = order ? Math.sign(order.indexOf(id) - order.indexOf(shown)) : 0;
  const direction = (order ? (step === 0 ? fixed : step) : fixed) as -1 | 0 | 1;
  const frozen = useRef(children);
  if (shown === id) frozen.current = children;
  const opacity = useSharedValue(1);
  const offset = useSharedValue(0);
  const sideways = useSharedValue(direction !== 0);
  const mounted = useRef(false);
  // Sideways steps travel further than vertical swaps; the exit drifts back, the entrance arrives from ahead.
  const out = direction ? -12 * direction : -6;
  // Captured when the exit starts: by the time the new state mounts, shown === id and the step reads 0.
  const travel = useRef<-1 | 0 | 1>(fixed);

  useEffect(() => {
    if (!mounted.current) return;
    if (calm) {
      setShown(id);
      return;
    }
    if (id === shown) {
      opacity.value = withTiming(1, { duration: 160, easing: ease.out });
      offset.value = withTiming(0, { duration: 160, easing: ease.out });
      return;
    }
    travel.current = direction;
    sideways.value = direction !== 0;
    offset.value = withTiming(out, { duration: 110, easing: ease.out });
    opacity.value = withTiming(0, { duration: 110, easing: ease.out }, (done) => {
      if (done) scheduleOnRN(setShown, id);
    });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (calm) {
      opacity.value = 1;
      offset.value = 0;
      return;
    }
    offset.value = travel.current ? 16 * travel.current : 10;
    offset.value = withTiming(0, { duration: 200, easing: ease.out });
    opacity.value = withTiming(1, { duration: 200, easing: ease.out });
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps

  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: sideways.value ? [{ translateX: offset.value }] : [{ translateY: offset.value }],
  }));
  // Each state mounts fresh (scroll starts at the top); the outgoing one stays as it was while it
  // leaves and ignores touches, so a second tap can't repeat the action that started the swap.
  return (
    <Animated.View style={[style, animated]} pointerEvents={shown === id ? 'auto' : 'none'}>
      <Fragment key={shown}>{shown === id ? children : frozen.current}</Fragment>
    </Animated.View>
  );
}
