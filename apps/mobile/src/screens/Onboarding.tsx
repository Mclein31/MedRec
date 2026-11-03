import { router, useFocusEffect } from 'expo-router';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { markOnboarded } from '../onboarded';
import { CalmMotionContext, useCalmMotion } from '../prefs';
import { GUTTER, space, useColors } from '../theme';
import { Wordmark } from '../ui/brand';
import { Banner, Button, Eyebrow, Icon, Tappable, Txt } from '../ui/core';
import { Rise } from '../ui/motion';
import { LaunchReadyContext } from '../ui/LaunchReady';
import { Remy } from '../ui/Remy';
import { StepPreview, type Preview } from './OnboardingParts';

const SCENES: { kind: Preview; eyebrow: string; title: string; accent: string; body: string; next: string; note: string }[] = [
  {
    kind: 'welcome', eyebrow: 'A LITTLE ORDER. A LITTLE PEACE OF MIND.',
    title: 'Your health.\n', accent: 'More in hand.',
    body: 'Your records, a clearer picture, and a little help from Remy. Welcome to MedRec.',
    next: 'Meet Remy', note: 'Made for the moments that matter.',
  },
  {
    kind: 'records', eyebrow: 'LESS SEARCHING. MORE LIVING.',
    title: 'All those papers.\n', accent: 'One calm place.',
    body: 'Lab results, prescriptions, visit notes. Keep them together and find the right one in seconds.',
    next: 'See how Remy helps', note: 'Your records stay private until you choose to share.',
  },
  {
    kind: 'understand', eyebrow: 'A LITTLE CLARITY GOES A LONG WAY.',
    title: 'Medical words.\n', accent: 'Human answers.',
    body: 'Ask Remy to find a record or explain a term. Keep the original close, and your next question ready.',
    next: 'Ready for your next visit?', note: 'AI can make mistakes. Your clinician guides your care.',
  },
  {
    kind: 'share', eyebrow: 'BETTER TOGETHER. ALWAYS YOUR CHOICE.',
    title: 'The right records.\n', accent: 'The right moment.',
    body: 'Let your doctor in with a temporary QR code. Choose what they see and when access ends.',
    next: 'Keep the essentials close', note: 'View-only access. End it whenever you need to.',
  },
  {
    kind: 'medical', eyebrow: 'A SMALL START. A LITTLE MORE PREPARED.',
    title: 'The essentials.\n', accent: 'Always together.',
    body: 'A Medical ID for allergies, medications and the person to call. Add your details when you’re ready.',
    next: 'Start my MedRec', note: 'Your public emergency page is off until you turn it on.',
  },
];
const COLUMN = 460;
const SETTLE = { damping: 30, stiffness: 270, mass: 1 };

export function Onboarding({ replay = false }: { replay?: boolean }) {
  const [paused, setPaused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [focused, setFocused] = useState(true);
  const [systemReduce, setSystemReduce] = useState(false);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (mounted) setSystemReduce(v); });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduce);
    const app = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => { mounted = false; motion.remove(); app.remove(); };
  }, []);
  return (
    <CalmMotionContext.Provider value={paused || !foreground || !focused || systemReduce}>
      <Tour replay={replay} paused={paused} toggleMotion={() => setPaused((v) => !v)} />
    </CalmMotionContext.Provider>
  );
}

function Tour({ replay, paused, toggleMotion }: { replay: boolean; paused: boolean; toggleMotion: () => void }) {
  const c = useColors();
  const calm = useCalmMotion();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finishing = useRef(false);
  const position = useSharedValue(0);
  const origin = useSharedValue(0);
  const last = page === SCENES.length - 1;
  const column = { width: '100%' as const, maxWidth: COLUMN + GUTTER * 2, alignSelf: 'center' as const, paddingHorizontal: GUTTER };

  const go = (target: number) => {
    const next = Math.max(0, Math.min(SCENES.length - 1, target));
    setPage(next);
    position.value = calm ? withTiming(next, { duration: 0 }) : withSpring(next, SETTLE);
  };
  useEffect(() => {
    if (calm) { cancelAnimation(position); position.value = page; }
  }, [calm, page, position]);

  const finish = async (to: '/(auth)/register' | '/(auth)/sign-in') => {
    if (finishing.current) return;
    if (replay) { router.back(); return; }
    finishing.current = true;
    setBusy(true);
    setError(null);
    try {
      await markOnboarded();
      router.replace(to);
    } catch {
      setError('Couldn’t save your progress. Please try again.');
      finishing.current = false;
      setBusy(false);
    }
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-18, 18]).failOffsetY([-16, 16])
    .onStart(() => { cancelAnimation(position); origin.value = position.value; })
    .onUpdate((e) => {
      if (calm) return;
      const raw = origin.value - e.translationX / width;
      position.value = raw < 0 ? raw * 0.15 : raw > SCENES.length - 1 ? SCENES.length - 1 + (raw - SCENES.length + 1) * 0.15 : raw;
    })
    .onEnd((e) => {
      const projected = (calm ? origin.value - e.translationX / width : position.value) - e.velocityX * 0.16 / width;
      const target = Math.max(0, Math.min(SCENES.length - 1, Math.max(Math.floor(origin.value) - 1, Math.min(Math.ceil(origin.value) + 1, Math.round(projected)))));
      position.value = calm ? withTiming(target, { duration: 0 }) : withSpring(target, { ...SETTLE, velocity: -e.velocityX / width });
      runOnJS(setPage)(target);
    })
    .onFinalize((_e, success) => {
      if (!success) position.value = calm ? withTiming(page, { duration: 0 }) : withSpring(page, SETTLE);
    });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.md }}>
      <View style={[column, { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: space.sm }]}>
        <Wordmark size={26} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          {page > 0 && <Tappable onPress={() => go(page - 1)} accessibilityLabel="Previous scene" style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}><Icon name="arrow-left" size={21} color={c.ink3} /></Tappable>}
          <Tappable onPress={toggleMotion} accessibilityLabel={paused ? 'Play animations' : 'Pause animations'} accessibilityState={{ selected: paused }} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.line, borderRadius: 22 }}>
            <Icon name={paused ? 'play-outline' : 'pause'} size={19} color={c.ink3} />
          </Tappable>
          {replay && <Tappable onPress={() => router.back()} accessibilityLabel="Close tour" style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}><Icon name="close" size={24} /></Tappable>}
        </View>
      </View>
      <GestureDetector gesture={pan}>
        <View style={{ flex: 1, overflow: 'hidden' }}>
          {SCENES.map((scene, index) => (
            <Scene key={scene.kind} scene={scene} index={index} page={page} position={position} />
          ))}
        </View>
      </GestureDetector>
      <View style={[column, { gap: space.sm, paddingTop: space.md }]}>
        {error && <Banner message={error} />}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 36 }}>
          <Remy pose={page === 2 ? 'reading' : page === 4 ? 'saved' : 'default'} size={30} motion="none" />
          <Txt variant="caption" color={c.ink3} style={{ flex: 1, fontSize: 12, lineHeight: 17 }}>{SCENES[page]!.note}</Txt>
        </View>
        <Button kind="dark" label={last && replay ? 'Back to MedRec' : SCENES[page]!.next} loading={busy} onPress={() => last ? void finish('/(auth)/register') : go(page + 1)} icon="arrow-right" style={{ borderRadius: 18, minHeight: 60 }} />
        {page === 0 && !replay && <View style={{ minHeight: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Txt variant="caption" color={c.ink3}>A fresh start for your records.</Txt>
          <Tappable onPress={() => void finish('/(auth)/sign-in')} accessibilityLabel="Already a member? Sign in" style={{ minHeight: 44, justifyContent: 'center', paddingLeft: 12 }}><Txt variant="label">Sign in</Txt></Tappable>
        </View>}
      </View>
    </View>
  );
}

function Scene({ scene, index, page, position }: { scene: typeof SCENES[number]; index: number; page: number; position: SharedValue<number> }) {
  const c = useColors();
  const calm = useCalmMotion();
  const { width, height, fontScale } = useWindowDimensions();
  const launchReady = useContext(LaunchReadyContext);
  const active = page === index;
  const welcome = scene.kind === 'welcome';
  const small = height < 760 || width < 375;
  const headline = small ? 31 : welcome ? 38 : 36;
  const style = useAnimatedStyle(() => {
    const distance = Math.abs(index - position.value);
    return {
      opacity: interpolate(distance, [0, 0.8, 1], [1, 0.7, 0], 'clamp'),
      transform: [{ translateX: calm ? 0 : (index - position.value) * width }],
    };
  });
  return (
    <Animated.View {...(Platform.OS === 'web' ? { inert: !active } : {})} aria-hidden={!active} pointerEvents={active ? 'auto' : 'none'} accessibilityElementsHidden={!active} importantForAccessibility={active ? 'auto' : 'no-hide-descendants'} style={[StyleSheet.absoluteFill, style]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: GUTTER, paddingTop: space.md, paddingBottom: space.xl, width: '100%', maxWidth: COLUMN + GUTTER * 2, alignSelf: 'center' }}>
        <View style={{ flex: 1, justifyContent: 'space-between', gap: small ? space.lg : space.xl }}>
          <Rise active={launchReady} from={18} delay={40} duration={540} style={{ gap: space.md }}>
            <Eyebrow color={c.ink3}>{scene.eyebrow}</Eyebrow>
            <Txt variant="hero" accessibilityRole="header" style={{ fontSize: headline, lineHeight: headline * 1.14, letterSpacing: -1.3 }}>
              {scene.title}<Txt variant="hero" color={c.ink3} style={{ fontSize: headline, lineHeight: headline * 1.14, letterSpacing: -1.3 }}>{scene.accent}</Txt>
            </Txt>
            <Txt color={c.ink2} style={{ fontSize: 15, lineHeight: 22, maxWidth: 400 }}>{scene.body}</Txt>
          </Rise>
          <View style={{ gap: space.md, paddingTop: fontScale > 1.2 ? space.lg : 0 }}>
            <StepPreview kind={scene.kind} active={active && launchReady} />
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}
