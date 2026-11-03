import { Image } from 'expo-image';
import { useEffect, useId, useRef, useState } from 'react';
import { AppState, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useDerivedValue, useSharedValue, withDelay, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { useCalmMotion } from '../prefs';
import { ACTING_CYCLE_MS, actingSeed, minorFrameAt, privacyFrameAt, type RemyAttention, type RemyMotion, type RemyPose } from './remyActing';
import { ATLAS_BOUNDS, fittedSprite, ORIGINAL_BOUNDS } from './remyGeometry';

export type { RemyAttention, RemyMotion, RemyPose } from './remyActing';
export { formAttention } from './remyActing';

const POSES = {
  default: require('../../assets/remy/remy-default.png'),
  greeting: require('../../assets/remy/remy-greeting.png'),
  curious: require('../../assets/remy/remy-curious.png'),
  searching: require('../../assets/remy/remy-searching.png'),
  reading: require('../../assets/remy/remy-reading.png'),
  saved: require('../../assets/remy/remy-saved.png'),
};
const ATLASES = {
  default: require('../../assets/remy/acting/remy-default-atlas.png'),
  greeting: require('../../assets/remy/acting/remy-greeting-atlas.png'),
  curious: require('../../assets/remy/acting/remy-curious-atlas.png'),
  searching: require('../../assets/remy/acting/remy-searching-atlas.png'),
  reading: require('../../assets/remy/acting/remy-reading-atlas.png'),
  saved: require('../../assets/remy/acting/remy-saved-atlas.png'),
};
const PRIVACY = require('../../assets/remy/acting/remy-privacy-atlas.png');
const PEEK = require('../../assets/remy/acting/remy-peek-atlas.png');

/**
 * Actual face/hand drawings do the acting. The folder and feet stay planted.
 * `attention` is a focus/busy signal only; this component never receives field values.
 */
export function Remy({
  pose = 'default', size = 120, motion = 'idle', attention, active = true, delay = 0, ground = false, style,
}: {
  pose?: RemyPose;
  size?: number;
  motion?: RemyMotion;
  attention?: RemyAttention;
  active?: boolean;
  delay?: number;
  ground?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const calm = useCalmMotion();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [readyPose, setReadyPose] = useState<RemyPose | null>(null);
  const [privacyReady, setPrivacyReady] = useState(false);
  const [peekReady, setPeekReady] = useState(false);
  const elapsed = useSharedValue(0);
  const enter = useSharedValue(calm ? 1 : 0);
  const cover = useSharedValue(0);
  const peek = useSharedValue(0);
  const entered = useRef(false);
  const seed = actingSeed(useId());
  const intent = attention ?? 'idle';
  const atlas = size >= 44 && motion !== 'none';
  const ready = atlas && readyPose === pose;
  const original = fittedSprite(ORIGINAL_BOUNDS[pose], size, 0, 600);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => sub.remove();
  }, []);

  // One entrance per mounted character. Focus, pose, and motion changes never replay a pop-in.
  useEffect(() => {
    if (calm) { entered.current = true; cancelAnimation(enter); enter.value = 1; return; }
    if (entered.current) { enter.value = 1; return; }
    entered.current = true;
    enter.value = withDelay(delay, withTiming(1, { duration: 340, easing: Easing.out(Easing.cubic) }));
    return () => cancelAnimation(enter);
  }, [calm, delay, enter]);

  useEffect(() => {
    cancelAnimation(elapsed);
    elapsed.value = 0;
    if (!calm && active && foreground && atlas) {
      elapsed.value = withDelay(delay + 340, withRepeat(withTiming(ACTING_CYCLE_MS, { duration: ACTING_CYCLE_MS, easing: Easing.linear }), -1, false));
    }
    return () => cancelAnimation(elapsed);
  }, [active, foreground, calm, atlas, delay, pose, motion, elapsed]);

  useEffect(() => {
    const target = (intent === 'private' || intent === 'peek') && active && privacyReady ? 1 : 0;
    cover.value = withTiming(target, { duration: calm || !foreground || !active ? 0 : 420, easing: Easing.inOut(Easing.cubic) });
    return () => cancelAnimation(cover);
  }, [intent, active, foreground, privacyReady, calm, cover]);

  useEffect(() => {
    const target = intent === 'peek' && active && privacyReady && peekReady ? 1 : 0;
    peek.value = withTiming(target, { duration: calm || !foreground || !active ? 0 : 320, easing: Easing.inOut(Easing.cubic) });
    return () => cancelAnimation(peek);
  }, [intent, active, foreground, privacyReady, peekReady, calm, peek]);

  const body = useAnimatedStyle(() => ({
    opacity: calm ? 1 : enter.value,
    transform: [{ translateY: calm ? 0 : (1 - enter.value) * 6 * (size / 120) }],
  }));
  const frameIndex = useDerivedValue(() => calm || !active || !foreground ? 0 : minorFrameAt(elapsed.value, pose, motion, intent, seed));
  const privateIndex = useDerivedValue(() => privacyFrameAt(cover.value));
  const peekIndex = useDerivedValue(() => privacyFrameAt(peek.value));
  const frame = useAnimatedStyle(() => {
    const index = frameIndex.value;
    const fit = fittedSprite(ATLAS_BOUNDS[pose][index] ?? ATLAS_BOUNDS[pose][0], size);
    return { transform: [{ translateX: fit.x }, { translateY: fit.y }, { scale: fit.scale * 512 / size }] };
  });
  const privateFrame = useAnimatedStyle(() => {
    const index = privateIndex.value;
    const fit = fittedSprite(ATLAS_BOUNDS.privacy[index] ?? ATLAS_BOUNDS.privacy[0], size);
    return { transform: [{ translateX: fit.x }, { translateY: fit.y }, { scale: fit.scale * 512 / size }] };
  });
  const peekFrame = useAnimatedStyle(() => {
    const index = peekIndex.value;
    const fit = fittedSprite(ATLAS_BOUNDS.peek[index] ?? ATLAS_BOUNDS.peek[0], size);
    return { transform: [{ translateX: fit.x }, { translateY: fit.y }, { scale: fit.scale * 512 / size }] };
  });
  const cell = useAnimatedStyle(() => ({ transform: [{ translateX: -(frameIndex.value % 3) * size }, { translateY: -Math.floor(frameIndex.value / 3) * size }] }));
  const privateCell = useAnimatedStyle(() => ({ transform: [{ translateX: -(privateIndex.value % 3) * size }, { translateY: -Math.floor(privateIndex.value / 3) * size }] }));
  const peekCell = useAnimatedStyle(() => ({ transform: [{ translateX: -(peekIndex.value % 3) * size }, { translateY: -Math.floor(peekIndex.value / 3) * size }] }));
  const primaryOpacity = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, cover.value * 5) }));
  const privateOpacity = useAnimatedStyle(() => ({ opacity: Math.min(1, cover.value * 5) * (1 - Math.min(1, peek.value * 5)) }));
  const peekOpacity = useAnimatedStyle(() => ({ opacity: Math.min(1, cover.value * 5) * Math.min(1, peek.value * 5) }));

  return (
    <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={[{ width: size, height: size, alignItems: 'center' }, style]}>
      {ground && <Ground enter={enter} size={size} />}
      <Animated.View style={[{ width: size, height: size }, body]}>
        <Animated.View style={[StyleSheet.absoluteFill, primaryOpacity]}>
          <Image source={POSES[pose]} style={{ width: size, height: size, opacity: ready ? 0 : 1, transformOrigin: 'top left', transform: [{ translateX: original.x }, { translateY: original.y }, { scale: original.scale * 600 / size }] }} contentFit="fill" transition={0} />
          {/* Clip the source cell before fitting it. Clipping the fitted slot cuts off wide hands. */}
          {atlas && <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width: size, height: size, overflow: 'hidden', transformOrigin: 'top left', opacity: ready ? 1 : 0 }, frame]}>
            <Animated.View style={[{ width: size * 3, height: size * 2 }, cell]}>
              <Image source={ATLASES[pose]} onLoad={() => setReadyPose(pose)} style={{ width: size * 3, height: size * 2 }} contentFit="fill" transition={0} />
            </Animated.View>
          </Animated.View>}
        </Animated.View>
        {attention !== undefined && atlas && <Animated.View style={[StyleSheet.absoluteFill, privateOpacity]}>
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width: size, height: size, overflow: 'hidden', transformOrigin: 'top left' }, privateFrame]}>
            <Animated.View style={[{ width: size * 3, height: size * 2 }, privateCell]}>
              <Image source={PRIVACY} onLoad={() => setPrivacyReady(true)} style={{ width: size * 3, height: size * 2 }} contentFit="fill" transition={0} />
            </Animated.View>
          </Animated.View>
        </Animated.View>}
        {attention !== undefined && atlas && <Animated.View style={[StyleSheet.absoluteFill, peekOpacity]}>
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width: size, height: size, overflow: 'hidden', transformOrigin: 'top left' }, peekFrame]}>
            <Animated.View style={[{ width: size * 3, height: size * 2 }, peekCell]}>
              <Image source={PEEK} onLoad={() => setPeekReady(true)} style={{ width: size * 3, height: size * 2 }} contentFit="fill" transition={0} />
            </Animated.View>
          </Animated.View>
        </Animated.View>}
      </Animated.View>
    </View>
  );
}

function Ground({ enter, size }: { enter: SharedValue<number>; size: number }) {
  const style = useAnimatedStyle(() => ({ opacity: 0.13 * enter.value }));
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
