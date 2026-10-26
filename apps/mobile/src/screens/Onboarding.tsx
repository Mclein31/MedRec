import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { markOnboarded } from '../onboarded';
import { GUTTER, radius, space, useColors } from '../theme';
import { Wordmark } from '../ui/brand';
import { Button, Eyebrow, Icon, Tappable, TextLink, Txt } from '../ui/core';
import { Rise } from '../ui/motion';
import { Remy, Sparkles } from '../ui/Remy';
import { ProgressTrail, StepPreview, type Preview } from './OnboardingParts';

const STEPS: { title: string; body: string; note: string; preview: Preview }[] = [
  {
    title: 'All your records.\nOne secure place.',
    body: 'Save lab results, prescriptions and visit notes together. Find them by name, date or type.',
    note: 'Your records are private until you choose to share them.',
    preview: 'records',
  },
  {
    title: 'A clearer view\nof your results.',
    body: 'Get a plain-language explanation without losing sight of the original.',
    note: 'AI can make mistakes. Always confirm medical decisions with your clinician.',
    preview: 'understand',
  },
  {
    title: 'Share with\nconfidence.',
    body: 'Choose the records your doctor can see and how long access lasts.',
    note: 'No permanent access is created by default.',
    preview: 'share',
  },
  {
    title: 'Key details.\nReady when needed.',
    body: 'Keep allergies, medications and an emergency contact in one Medical ID.',
    note: 'You can add these details later from your profile.',
    preview: 'medical',
  },
];

const COLUMN = 480;

function Welcome({ onStart, onSignIn }: { onStart: () => void; onSignIn: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const stage = Math.min(width - GUTTER * 2, COLUMN);
  const art = Math.min(220, stage * 0.62);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.lg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, gap: space.xl, width: '100%', maxWidth: COLUMN + GUTTER * 2, alignSelf: 'center' }}>
        <View style={{ minHeight: 52, justifyContent: 'center' }}>
          <Wordmark />
        </View>
        <Rise delay={80}>
          <Txt variant="hero" accessibilityRole="header">{'Health records.\nLess hassle.'}</Txt>
        </Rise>
        <Rise delay={180}>
          <Txt color={c.ink3}>Keep your medical history together, ready for your next visit.</Txt>
        </Rise>
        <Rise delay={260} scale={0.94}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: radius.lg, alignItems: 'center', paddingTop: space.xl, paddingBottom: space.lg, gap: space.sm }}>
            <View style={{ width: art + 80, height: art, alignItems: 'center' }}>
              <Sparkles width={art + 80} height={art} delay={700} />
              <Remy pose="greeting" size={art} motion="wave" delay={320} ground />
            </View>
            <Txt variant="caption" color="#302238">A little help keeping it all together.</Txt>
          </View>
        </Rise>
        <Rise delay={380}>
          <Tappable onPress={onSignIn} accessibilityRole="link" accessibilityLabel="Already a member? Sign in" style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
            <Txt variant="label">Already a member? Sign in</Txt>
          </Tappable>
        </Rise>
      </ScrollView>
      <View style={{ paddingHorizontal: GUTTER, width: '100%', maxWidth: COLUMN + GUTTER * 2, alignSelf: 'center' }}>
        <Button label="Get started" onPress={onStart} />
      </View>
    </View>
  );
}

export function Onboarding({ replay = false }: { replay?: boolean }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pager = useRef<ScrollView>(null);
  const [welcome, setWelcome] = useState(!replay);
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState(1);
  const last = page === STEPS.length - 1;

  const finish = async (to: '/(auth)/register' | '/(auth)/sign-in') => {
    if (replay) return router.back();
    await markOnboarded();
    router.replace(to);
  };
  const go = (i: number) => {
    setDir(i >= page ? 1 : -1);
    pager.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== page) {
      setDir(next > page ? 1 : -1);
      setPage(next);
    }
  };

  if (welcome) return <Welcome onStart={() => setWelcome(false)} onSignIn={() => finish('/(auth)/sign-in')} />;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.lg }}>
      <View style={{ paddingHorizontal: GUTTER, gap: space.md, width: '100%', maxWidth: COLUMN + GUTTER * 2, alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 52 }}>
          <Wordmark />
          {replay ? (
            <Tappable onPress={() => router.back()} accessibilityLabel="Close tour" hitSlop={10} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="close" size={24} color={c.ink} />
            </Tappable>
          ) : (
            <Icon name="shield-check-outline" size={26} color={c.ink} />
          )}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Eyebrow>{`Step ${page + 1} of ${STEPS.length}`}</Eyebrow>
          {!replay && (
            <Tappable onPress={() => finish('/(auth)/register')} accessibilityLabel="Skip intro" hitSlop={10} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Txt variant="caption" color={c.ink}>Skip intro</Txt>
            </Tappable>
          )}
        </View>
        <ProgressTrail count={STEPS.length} page={page} />
      </View>

      <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} style={{ flex: 1 }}>
        {STEPS.map((s, i) => {
          const active = i === page;
          return (
            <ScrollView
              key={s.title}
              style={{ width }}
              contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: space.lg, paddingBottom: space.lg }}
              accessibilityElementsHidden={!active}
              importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
            >
              <View style={{ maxWidth: COLUMN, width: '100%', alignSelf: 'center', gap: space.xl }}>
                <Rise active={active} x={24 * dir} from={0}>
                  <Txt variant="hero" accessibilityRole="header" style={{ fontSize: 30, lineHeight: 36 }}>{s.title}</Txt>
                </Rise>
                <StepPreview kind={s.preview} active={active} />
                <Rise active={active} delay={300}>
                  <View style={{ gap: space.md }}>
                    <Txt>{s.body}</Txt>
                    <Txt variant="caption" color={c.ink3}>{s.note}</Txt>
                  </View>
                </Rise>
              </View>
            </ScrollView>
          );
        })}
      </ScrollView>

      <View style={{ paddingHorizontal: GUTTER, gap: space.sm, maxWidth: COLUMN + GUTTER * 2, width: '100%', alignSelf: 'center' }}>
        <Button label={last ? (replay ? 'Done' : 'Get started') : 'Next'} onPress={() => (last ? finish('/(auth)/register') : go(page + 1))} />
        {page > 0 && <TextLink label="Back" icon={null} onPress={() => go(page - 1)} />}
      </View>
    </View>
  );
}
