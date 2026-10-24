import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { markOnboarded } from '../onboarded';
import { GUTTER, radius, space, useColors } from '../theme';
import { Button, Icon, Tappable, Txt, type IconName } from '../ui/core';
import { Enter } from '../ui/layout';

const STEPS: { title: string; body: string; next: string; preview: 'records' | 'share' | 'medical' | 'code' }[] = [
  {
    title: 'Every record, in one place',
    body: 'Photograph a lab result or prescription. MedRec reads the page and files it by type and date, so you can find it in seconds.',
    next: 'Next: sharing',
    preview: 'records',
  },
  {
    title: 'Your doctor sees only what you choose',
    body: 'Show a QR code at your consultation. The link opens in any browser, covers only the records you picked, and stops working on its own.',
    next: 'Next: Medical ID',
    preview: 'share',
  },
  {
    title: 'Medical ID for emergencies',
    body: 'Blood type, allergies and an emergency contact on one page responders can open. You decide whether it is on, and you see each time it is viewed.',
    next: 'Next: security',
    preview: 'medical',
  },
  {
    title: 'Only you can open it',
    body: 'Every new sign-in needs your password and a 6-digit code sent to your email. Add Face ID or a fingerprint for this phone.',
    next: 'Create your vault',
    preview: 'code',
  },
];

function PreviewRow({ icon, title, meta }: { icon: IconName; title: string; meta: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10 }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={c.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="label">{title}</Txt>
        <Txt variant="caption" color={c.ink3}>{meta}</Txt>
      </View>
    </View>
  );
}

function Preview({ kind }: { kind: (typeof STEPS)[number]['preview'] }) {
  const c = useColors();
  const frame = { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: space.lg, gap: 2 };
  return (
    <View style={{ gap: space.sm }}>
      <Txt variant="micro" color={c.ink3}>EXAMPLE</Txt>
      {kind === 'records' && (
        <View style={frame}>
          <Enter index={0}><PreviewRow icon="flask-outline" title="Complete blood count" meta="Lab results · Mar 14" /></Enter>
          <Enter index={1}><PreviewRow icon="pill" title="Amoxicillin 500 mg" meta="Prescriptions · Feb 2" /></Enter>
          <Enter index={2}><PreviewRow icon="radiology-box-outline" title="Chest X-ray" meta="Imaging · Jan 20" /></Enter>
        </View>
      )}
      {kind === 'share' && (
        <View style={[frame, { alignItems: 'center', gap: space.md }]}>
          <View style={{ width: 132, height: 132, borderRadius: 16, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="qrcode" size={104} color={c.ink} />
          </View>
          <Txt variant="label">Lab results and Imaging</Txt>
          <Txt variant="caption" color={c.ink3}>Link ends in 15 minutes</Txt>
        </View>
      )}
      {kind === 'medical' && (
        <View style={frame}>
          <PreviewRow icon="water-outline" title="Blood type O+" meta="Shown to responders" />
          <PreviewRow icon="alert-octagon-outline" title="Allergic to penicillin" meta="Highlighted first" />
          <PreviewRow icon="phone-outline" title="Call Ana (sister)" meta="One tap from the page" />
        </View>
      )}
      {kind === 'code' && (
        <View style={[frame, { gap: space.md }]}>
          <Txt variant="caption" color={c.ink3}>Code sent to ad•••@gmail.com</Txt>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {'482915'.split('').map((d, i) => (
              <View key={i} style={{ flex: 1, aspectRatio: 0.86, borderRadius: 10, borderWidth: 1.5, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
                <Txt variant="title">{d}</Txt>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function Dot({ active }: { active: boolean }) {
  const c = useColors();
  const style = useAnimatedStyle(() => ({ width: withTiming(active ? 22 : 8, { duration: 200 }) }));
  return <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: active ? c.accent : c.line }, style]} />;
}

export function Onboarding({ replay = false }: { replay?: boolean }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pager = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const last = page === STEPS.length - 1;

  const finish = async (to: '/(auth)/register' | '/(auth)/sign-in') => {
    if (replay) return router.back();
    await markOnboarded();
    router.replace(to);
  };
  const go = (i: number) => {
    pager.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: GUTTER, minHeight: 44 }}>
        <Txt variant="headline" color={c.accent}>MedRec</Txt>
        {!last && (
          <Tappable onPress={() => (replay ? router.back() : go(STEPS.length - 1))} accessibilityLabel={replay ? 'Close tour' : 'Skip to the last step'} hitSlop={10}>
            <Txt variant="label" color={c.ink3}>{replay ? 'Close' : 'Skip'}</Txt>
          </Tappable>
        )}
      </View>
      <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} style={{ flex: 1 }}>
        {STEPS.map((s, i) => (
          <View key={s.title} style={{ width, paddingHorizontal: GUTTER, justifyContent: 'center', gap: space.xxl }} accessibilityElementsHidden={i !== page} importantForAccessibility={i === page ? 'auto' : 'no-hide-descendants'}>
            <View style={{ maxWidth: 480, width: '100%', alignSelf: 'center', gap: space.xxl }}>
              {i === page && <Preview kind={s.preview} />}
              <View style={{ gap: space.md }}>
                <Txt variant="display" accessibilityRole="header">{s.title}</Txt>
                <Txt color={c.ink2}>{s.body}</Txt>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: GUTTER, gap: space.lg, maxWidth: 480 + GUTTER * 2, width: '100%', alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }} accessibilityLabel={`Step ${page + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => <Dot key={s.title} active={i === page} />)}
        </View>
        <Button label={replay && last ? 'Done' : STEPS[page]!.next} onPress={() => (last ? finish('/(auth)/register') : go(page + 1))} />
        {!replay && (
          <Button kind="ghost" label="I already have an account" onPress={() => finish('/(auth)/sign-in')} />
        )}
      </View>
    </View>
  );
}
