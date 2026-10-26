import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useCalmMotion } from '../prefs';
import { font, space } from '../theme';
import { Txt } from '../ui/core';
import { Remy, Sparkles } from '../ui/Remy';

const AUBERGINE = '#492D48';
const REMY = 188;

/**
 * Animated preload shown only while the session and first-launch state load.
 * It never waits on a timer: once `done` is true it plays a short exit and calls `onGone`.
 */
export function Launch({ done, onGone }: { done: boolean; onGone: () => void }) {
  const calm = useCalmMotion();
  const title = useSharedValue(calm ? 1 : 0);
  const tag = useSharedValue(calm ? 1 : 0);
  const exit = useSharedValue(0);

  useEffect(() => {
    if (calm) return;
    title.value = withDelay(60, withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }));
    tag.value = withDelay(160, withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }));
  }, [calm, title, tag]);

  useEffect(() => {
    if (!done) return;
    const duration = calm ? 160 : 380;
    exit.value = withTiming(1, { duration, easing: Easing.in(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(onGone)();
    });
    // Frames can be throttled (background tab, low-power mode); never let the overlay outlive its exit.
    const fallback = setTimeout(onGone, duration + 250);
    return () => clearTimeout(fallback);
  }, [done, calm, exit, onGone]);

  const root = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));
  const stage = useAnimatedStyle(() => ({ transform: [{ translateY: -exit.value * 40 }, { scale: 1 + exit.value * 0.12 }] }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: title.value, transform: [{ translateY: (1 - title.value) * 14 }] }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tag.value, transform: [{ translateY: (1 - tag.value) * 10 }] }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: AUBERGINE, alignItems: 'center', justifyContent: 'center', padding: space.xxl }, root]} accessibilityLabel="MedRec is opening" accessible>
      <Animated.View style={[{ alignItems: 'center' }, stage]}>
        <View style={{ width: REMY + 60, height: REMY, alignItems: 'center' }}>
          <Sparkles width={REMY + 60} height={REMY} delay={500} />
          <Remy pose="greeting" size={REMY} motion="hop" ground />
        </View>
        <Animated.View style={titleStyle}>
          <Txt style={{ fontFamily: font.wordmark, fontSize: 40, lineHeight: 48, marginTop: space.lg }} color="#FFF9EF">
            MedRec
          </Txt>
        </Animated.View>
        <Animated.View style={tagStyle}>
          <Txt color="#FFF9EF" style={{ textAlign: 'center' }}>Medical records, together.</Txt>
        </Animated.View>
        <Dots />
      </Animated.View>
    </Animated.View>
  );
}

/** Three pulsing dots: work is pending, without pretending to know how far along it is. */
function Dots() {
  const calm = useCalmMotion();
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: space.xxl, height: 10 }}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} delay={i * 160} still={calm} color={['#F4CD63', '#F4B89A', '#E66E4F'][i]!} />
      ))}
    </View>
  );
}

function Dot({ delay, still, color }: { delay: number; still: boolean; color: string }) {
  const s = useSharedValue(still ? 1 : 0.4);
  useEffect(() => {
    if (still) return;
    s.value = withDelay(700 + delay, withRepeat(withSequence(withTiming(1, { duration: 360 }), withTiming(0.4, { duration: 360 })), -1, false));
    return () => cancelAnimation(s);
  }, [delay, still, s]);
  const style = useAnimatedStyle(() => ({ opacity: s.value, transform: [{ scale: 0.6 + s.value * 0.4 }] }));
  return <Animated.View style={[{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }, style]} />;
}
