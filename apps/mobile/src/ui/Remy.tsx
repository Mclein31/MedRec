import { Image } from 'expo-image';
import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { useCalmMotion } from '../prefs';

const POSES = {
  default: require('../../assets/remy/remy-default.png'),
  greeting: require('../../assets/remy/remy-greeting.png'),
  curious: require('../../assets/remy/remy-curious.png'),
  searching: require('../../assets/remy/remy-searching.png'),
  reading: require('../../assets/remy/remy-reading.png'),
  saved: require('../../assets/remy/remy-saved.png'),
};

export type RemyPose = keyof typeof POSES;
/**
 * idle: slow breathing bob. wave: friendly sway. hop: bouncy jump with squash (launch, onboarding).
 * read: calm sway while work is pending. search: looks side to side. cheer: little celebratory jumps.
 * peek: curious head tilt. none: entrance only.
 */
export type RemyMotion = 'idle' | 'wave' | 'hop' | 'read' | 'search' | 'cheer' | 'peek' | 'none';

const PERIOD: Record<RemyMotion, number> = { idle: 3200, wave: 2400, hop: 1700, read: 3600, search: 3000, cheer: 2200, peek: 3400, none: 1000 };

/** Pose at loop progress t (0..1), in units scaled by `k` (size / 120). */
function frame(motion: RemyMotion, t: number, k: number) {
  'worklet';
  const p = t * Math.PI * 2;
  let tx = 0;
  let ty = 0;
  let rot = 0;
  let sx = 1;
  let sy = 1;
  let lift = 0;
  if (motion === 'idle') {
    ty = -Math.sin(p) * 3 * k;
    rot = Math.sin(p) * 1.2;
    sy = 1 + Math.sin(p) * 0.012;
    lift = (Math.sin(p) + 1) / 2;
  } else if (motion === 'wave') {
    ty = -Math.abs(Math.sin(p)) * 5 * k;
    rot = Math.sin(p * 2) * 3.5;
    lift = Math.abs(Math.sin(p));
  } else if (motion === 'hop') {
    const up = t < 0.5 ? Math.sin(t * 2 * Math.PI) : 0;
    const land = t >= 0.5 && t < 0.64 ? Math.sin(((t - 0.5) / 0.14) * Math.PI) : 0;
    ty = -up * 16 * k;
    sy = 1 + up * 0.04 - land * 0.09;
    sx = 1 - up * 0.03 + land * 0.07;
    rot = up * 3 * Math.sin(p);
    lift = up;
  } else if (motion === 'read') {
    rot = Math.sin(p) * 2;
    ty = -Math.sin(p * 2) * 2 * k;
    lift = (Math.sin(p * 2) + 1) / 4;
  } else if (motion === 'search') {
    tx = Math.sin(p) * 7 * k;
    rot = Math.sin(p) * 4;
    ty = -Math.abs(Math.sin(p * 2)) * 2 * k;
    lift = Math.abs(Math.sin(p * 2)) / 2;
  } else if (motion === 'cheer') {
    const up = t < 0.35 ? Math.sin((t / 0.35) * Math.PI) : 0;
    ty = -up * 12 * k;
    rot = up * Math.sin(t * 40) * 3;
    sy = 1 + up * 0.04;
    lift = up;
  } else if (motion === 'peek') {
    const tilt = t < 0.4 ? Math.sin((t / 0.4) * Math.PI) : 0;
    rot = -tilt * 7;
    tx = -tilt * 3 * k;
    ty = -Math.sin(p) * 2 * k;
    lift = tilt / 2;
  }
  return { tx, ty, rot, sx, sy, lift };
}

export function Remy({
  pose = 'default',
  size = 120,
  motion = 'idle',
  delay = 0,
  ground = false,
  style,
}: {
  pose?: RemyPose;
  size?: number;
  motion?: RemyMotion;
  delay?: number;
  /** Soft shadow that shrinks as Remy rises. */
  ground?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const calm = useCalmMotion();
  const t = useSharedValue(0);
  const enter = useSharedValue(calm ? 1 : 0);
  const k = size / 120;

  useEffect(() => {
    cancelAnimation(t);
    t.value = 0;
    if (calm) {
      enter.value = withTiming(1, { duration: 180 });
      return;
    }
    enter.value = 0;
    enter.value = withDelay(delay, withTiming(1, { duration: 520, easing: Easing.out(Easing.back(1.7)) }));
    if (motion !== 'none') {
      t.value = withDelay(delay + 520, withRepeat(withTiming(1, { duration: PERIOD[motion], easing: Easing.linear }), -1, false));
    }
    return () => cancelAnimation(t);
  }, [calm, motion, delay, t, enter]);

  const body = useAnimatedStyle(() => {
    const f = frame(motion, t.value, k);
    const e = enter.value;
    const grow = 0.6 + 0.4 * e;
    return {
      opacity: Math.min(1, e * 1.5),
      transform: [{ translateX: f.tx }, { translateY: f.ty + (1 - e) * 14 * k }, { rotate: `${f.rot}deg` }, { scaleX: f.sx * grow }, { scaleY: f.sy * grow }],
    };
  });

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ width: size, height: size, alignItems: 'center' }, style]}>
      {ground && <Ground t={t} enter={enter} motion={motion} size={size} />}
      <Animated.View style={[{ width: size, height: size, transformOrigin: 'bottom' }, body]}>
        <Image source={POSES[pose]} style={{ width: size, height: size }} contentFit="contain" />
      </Animated.View>
    </View>
  );
}

function Ground({ t, enter, motion, size }: { t: SharedValue<number>; enter: SharedValue<number>; motion: RemyMotion; size: number }) {
  const style = useAnimatedStyle(() => {
    const f = frame(motion, t.value, size / 120);
    return { opacity: 0.16 * enter.value * (1 - f.lift * 0.5), transform: [{ scaleX: 1 - f.lift * 0.28 }] };
  });
  return <Animated.View style={[{ position: 'absolute', bottom: size * 0.085, width: size * 0.46, height: size * 0.07, borderRadius: size, backgroundColor: '#302238' }, style]} />;
}

const SPARKS = [
  { x: 0.06, y: 0.18, s: 10, c: '#F4CD63', d: 0 },
  { x: 0.88, y: 0.1, s: 8, c: '#F4B89A', d: 500 },
  { x: 0.94, y: 0.62, s: 12, c: '#E66E4F', d: 1100 },
  { x: 0.02, y: 0.7, s: 7, c: '#F4B89A', d: 800 },
  { x: 0.5, y: -0.04, s: 6, c: '#F4CD63', d: 1500 },
];

/** Twinkling diamonds around a large Remy. Decorative, launch and onboarding only. */
export function Sparkles({ width, height, delay = 0 }: { width: number; height: number; delay?: number }) {
  const calm = useCalmMotion();
  if (calm) return null;
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
      {SPARKS.map((s, i) => (
        <Spark key={i} left={s.x * width} top={s.y * height} size={s.s} color={s.c} delay={delay + s.d} />
      ))}
    </View>
  );
}

function Spark({ left, top, size, color, delay }: { left: number; top: number; size: number; color: string; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(t);
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: -t.value * 6 }, { rotate: '45deg' }, { scale: 0.5 + t.value * 0.6 }],
  }));
  return <Animated.View style={[{ position: 'absolute', left, top, width: size, height: size, borderRadius: 2, backgroundColor: color }, style]} />;
}
