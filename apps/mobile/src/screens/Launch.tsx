import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { cancelAnimation, Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useCalmMotion } from '../prefs';
import { font, useColors } from '../theme';
import { Icon, Txt, type IconName } from '../ui/core';
import { LAUNCH_DURATION, type LaunchKind } from '../ui/launchFlow';
import { RecordSkeleton } from '../ui/RecordRow';
import { Remy } from '../ui/Remy';

const PLUM = '#492D48';
const IVORY = '#FFF9EF';
const GOLD = '#F4CD63';

/** Readiness and the short intro both finish before exit. No fabricated progress. */
export function Launch({ kind, reason = 'startup', done, splashReady = true, onGone }: {
  kind: LaunchKind | null;
  reason?: 'startup' | 'sign-in';
  done: boolean;
  splashReady?: boolean;
  onGone: () => void;
}) {
  const calm = useCalmMotion();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const first = kind !== 'returning';
  const compact = height < 720;
  const stageSize = Math.min(304, width - 48);
  const [settled, setSettled] = useState(false);
  const [laidOut, setLaidOut] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const finished = useRef(false);
  const progress = useSharedValue(calm ? 1 : 0);
  const leaving = useSharedValue(0);
  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onGone();
  }, [onGone]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!kind || !splashReady || !laidOut || !foreground) return;
    if (calm) {
      cancelAnimation(progress);
      progress.value = 1;
      setSettled(true);
      return;
    }
    if (settled) return;
    const remaining = LAUNCH_DURATION[kind] * (1 - progress.value);
    progress.value = withTiming(1, { duration: remaining, easing: Easing.linear });
    // Timing does not depend on receiving animation frames in a throttled tab.
    const timer = setTimeout(() => setSettled(true), remaining);
    return () => { clearTimeout(timer); cancelAnimation(progress); };
  }, [kind, splashReady, laidOut, calm, foreground, settled, progress]);

  useEffect(() => {
    if (!done || !settled) return;
    const duration = calm || !foreground ? 0 : first ? 240 : 180;
    leaving.value = withTiming(1, { duration, easing: Easing.inOut(Easing.cubic) }, (complete) => {
      if (complete) runOnJS(finish)();
    });
    const fallback = setTimeout(finish, duration + 160);
    return () => { clearTimeout(fallback); cancelAnimation(leaving); };
  }, [done, settled, calm, foreground, first, finish, leaving]);

  const root = useAnimatedStyle(() => ({ opacity: 1 - leaving.value }));
  const copy = useAnimatedStyle(() => ({
    opacity: kind === null ? 0 : calm ? 1 : interpolate(progress.value, [0, 0.18, 0.46], [0, 0, 1], 'clamp'),
    transform: [{ translateY: calm ? 0 : interpolate(progress.value, [0, 0.46], [8, 0], 'clamp') }],
  }));
  const halo = useAnimatedStyle(() => ({
    opacity: kind === null ? 0.15 : calm ? 1 : interpolate(progress.value, [0, 0.26, 0.58], [0.25, 0.6, 1], 'clamp'),
    transform: [{ scale: calm ? 1 : interpolate(progress.value, [0, 0.58], [0.78, 1], 'clamp') }],
  }));
  const remy = useAnimatedStyle(() => ({ opacity: kind === null ? 0 : calm ? 1 : interpolate(progress.value, [0, 0.2, 0.48], [0, 0, 1], 'clamp') }));
  const color = first ? IVORY : c.ink;
  const muted = first ? '#DECDD9' : c.ink3;

  return (
    <Animated.View
      onLayout={() => setLaidOut(true)}
      style={[StyleSheet.absoluteFill, { zIndex: 100, backgroundColor: first ? PLUM : c.bg, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'space-between' }, root]}
      accessible accessibilityRole="progressbar" accessibilityLabel={kind === 'first-use' ? 'Welcome to MedRec. Getting ready.' : reason === 'sign-in' && done ? 'Signed in. Opening MedRec.' : 'Opening MedRec.'}
    >
      <Txt color={color} style={{ fontFamily: font.wordmark, fontSize: 27, lineHeight: 34, letterSpacing: -0.6 }}>MedRec</Txt>
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ alignItems: 'center', width: '100%', maxWidth: 360, gap: compact ? 14 : 24 }}>
        <View style={{ width: stageSize, height: first ? compact ? 244 : 282 : 240, alignItems: 'center', justifyContent: 'center' }}>
          {first ? <>
            <Animated.View style={[{ position: 'absolute', width: 214, height: 214, borderRadius: 107, backgroundColor: GOLD, top: compact ? 21 : 42 }, halo]} />
            {kind !== null && <>
              <GatheringPage index={0} progress={progress} calm={calm} stageSize={stageSize} icon="flask-outline" />
              <GatheringPage index={1} progress={progress} calm={calm} stageSize={stageSize} icon="pill" />
              <GatheringPage index={2} progress={progress} calm={calm} stageSize={stageSize} icon="stethoscope" />
            </>}
            <Animated.View style={[{ position: 'absolute', top: compact ? 38 : 58 }, remy]}>
              <Remy pose="greeting" size={188} motion="wave" active={foreground} />
            </Animated.View>
          </> : <OpeningFolio progress={progress} calm={calm} width={stageSize} done={done} active={foreground} />}
        </View>
        <Animated.View style={[{ width: '100%', alignItems: 'center', gap: 12 }, copy]}>
          <Txt color={first ? GOLD : c.ink3} style={{ fontSize: 10, lineHeight: 16, letterSpacing: 1.7, fontFamily: 'DMSans-Bold', textAlign: 'center' }}>
            {first ? 'A LITTLE SPACE FOR WHAT MATTERS' : 'A LITTLE PEACE OF MIND'}
          </Txt>
          <Txt color={color} style={{ fontFamily: font.heading, fontSize: compact ? 26 : 29, lineHeight: compact ? 34 : 38, letterSpacing: -1, textAlign: 'center' }}>
            {first ? 'A little order.\nA little peace of mind.' : reason === 'sign-in' && done ? 'You’re in.' : 'Good to see you.'}
          </Txt>
          <Txt color={muted} style={{ fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 280 }}>
            {first ? 'Meet Remy. Let’s bring it all together.' : 'Opening your MedRec.'}
          </Txt>
        </Animated.View>
      </View>
      <Txt color={muted} style={{ fontSize: 12, lineHeight: 18, textAlign: 'center', paddingTop: 12 }}>
        {kind === null ? 'Getting things ready…' : first ? 'Your health. More in hand.' : 'Your records. Your space.'}
      </Txt>
    </Animated.View>
  );
}

/** Abstract document art, not fabricated health data or app screens. */
function GatheringPage({ index, progress, calm, stageSize, icon }: { index: number; progress: SharedValue<number>; calm: boolean; stageSize: number; icon: IconName }) {
  const positions = [{ x: -88, y: -12, r: -19 }, { x: 84, y: 4, r: 17 }, { x: -8, y: -76, r: -5 }];
  const from = positions[index]!;
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const gather = interpolate(p, [0.18 + index * 0.05, 0.63 + index * 0.03], [0, 1], 'clamp');
    const eased = Easing.inOut(Easing.cubic)(gather);
    return {
      opacity: calm ? 0 : interpolate(p, [0, 0.09, 0.58, 0.76], [0, 1, 1, 0], 'clamp'),
      transform: [{ translateX: from.x * (1 - eased) }, { translateY: from.y * (1 - eased) + eased * 24 }, { rotate: `${from.r * (1 - eased)}deg` }, { scale: 1 - eased * 0.2 }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: stageSize / 2 - 48, top: 66, width: 96, height: 122, borderRadius: 12, padding: 14, gap: 12, backgroundColor: IVORY, borderWidth: 1, borderColor: '#D7BBC8', boxShadow: '0 7px 18px #25172B25' }, style]}>
      <Icon name={icon} size={23} color={PLUM} />
      <View style={{ gap: 7 }}>
        {[1, 0.76, 0.9].map((fraction, i) => <View key={i} style={{ height: 4, width: `${fraction * 100}%`, borderRadius: 2, backgroundColor: i === 0 ? '#BCA3B3' : '#E0D2D8' }} />)}
      </View>
    </Animated.View>
  );
}

/** Same placeholders used by Records; never exposes private records. */
function OpeningFolio({ progress, calm, width, done, active }: { progress: SharedValue<number>; calm: boolean; width: number; done: boolean; active: boolean }) {
  const c = useColors();
  const paper = useAnimatedStyle(() => ({
    opacity: calm ? 1 : interpolate(progress.value, [0.08, 0.62], [0, 1], 'clamp'),
    transform: [{ translateY: calm ? 0 : interpolate(progress.value, [0, 0.8], [24, 0], 'clamp') }],
  }));
  const cover = useAnimatedStyle(() => ({
    opacity: calm ? 0 : interpolate(progress.value, [0, 0.22, 0.7], [1, 1, 0], 'clamp'),
    transform: [{ translateY: calm ? 0 : interpolate(progress.value, [0.1, 0.74], [0, 56], 'clamp') }],
  }));
  const remy = useAnimatedStyle(() => ({ opacity: calm ? 1 : interpolate(progress.value, [0.24, 0.8], [0, 1], 'clamp') }));
  return (
    <View style={{ width, height: 228 }}>
      <View style={{ position: 'absolute', top: 25, left: 8, width: 96, height: 34, borderTopLeftRadius: 13, borderTopRightRadius: 13, backgroundColor: c.gold }} />
      <View style={{ position: 'absolute', top: 40, width, height: 174, borderRadius: 22, backgroundColor: '#E7D5DE', transform: [{ rotate: '-3deg' }] }} />
      <Animated.View style={[{ position: 'absolute', top: 35, width, minHeight: 170, borderRadius: 20, padding: 20, paddingRight: 70, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, gap: 4 }, paper]}>
        <Txt variant="headline" style={{ fontSize: 18 }}>Your records.</Txt>
        <RecordSkeleton rows={2} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', top: 40, width, height: 174, borderRadius: 20, backgroundColor: PLUM, padding: 24, justifyContent: 'space-between' }, cover]}>
        <Icon name="folder-outline" size={30} color={GOLD} />
        <Txt color={IVORY} style={{ fontFamily: font.wordmark, fontSize: 25, lineHeight: 32 }}>MedRec</Txt>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', right: -2, bottom: -4 }, remy]}>
        <Remy pose={done ? 'greeting' : 'reading'} size={118} motion={done ? 'wave' : 'read'} active={active} />
      </Animated.View>
    </View>
  );
}
