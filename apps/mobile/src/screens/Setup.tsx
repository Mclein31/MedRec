import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { markOnboarded } from '../onboarded';
import { firstName, GOAL_ORDER, GOALS, pinnedCategories, toggleCategory, type Goal, type Personal } from '../personal';
import { setPrefs, useCalmMotion, usePrefs, type Prefs } from '../prefs';
import { CATEGORIES, CATEGORY_META, GUTTER, radius, space, useColors } from '../theme';
import { Wordmark } from '../ui/brand';
import { Banner, Button, Eyebrow, Icon, Tappable, Txt } from '../ui/core';
import { Chip, Choice, Field, TextTabs, Toggle } from '../ui/form';
import { Group, Row } from '../ui/layout';
import { LaunchReadyContext } from '../ui/LaunchReady';
import { ease, Rise, Swap } from '../ui/motion';
import { Remy, Sparkles, type RemyMotion, type RemyPose } from '../ui/Remy';

type Step = 'welcome' | 'name' | 'goal' | 'records' | 'comfort' | 'ready';
const FIRST_USE: Step[] = ['welcome', 'name', 'goal', 'records', 'comfort', 'ready'];
/** Re-running from Profile: the account already has a name, and there is nothing to welcome. */
const REPLAY: Step[] = ['goal', 'records', 'comfort', 'ready'];
const COLUMN = 460;
const APPEARANCE: { key: Prefs['appearance']; label: string }[] = [
  { key: 'system', label: 'Device' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];
const HEAD: Record<Exclude<Step, 'welcome' | 'ready'>, { eyebrow: string; title: string; accent: string; body: string }> = {
  name: { eyebrow: 'FIRST, HELLO', title: 'What should I\n', accent: 'call you?', body: "I'll use it to greet you and to fill in your sign-up form." },
  goal: { eyebrow: 'YOUR MAIN REASON', title: 'What brings you\n', accent: 'to MedRec?', body: 'Pick one. It decides what your home screen puts first.' },
  records: { eyebrow: 'YOUR PAPERS', title: 'What do you\n', accent: 'keep most?', body: 'Pick any. Your first two get their own tabs on Records.' },
  comfort: { eyebrow: 'MAKE IT COMFORTABLE', title: 'Easy on\n', accent: 'your eyes.', body: 'Try them. MedRec changes as you tap.' },
};
const REMY: Record<Step, { pose: RemyPose; motion: RemyMotion }> = {
  welcome: { pose: 'greeting', motion: 'wave' },
  name: { pose: 'greeting', motion: 'idle' },
  goal: { pose: 'curious', motion: 'idle' },
  records: { pose: 'searching', motion: 'search' },
  comfort: { pose: 'reading', motion: 'read' },
  ready: { pose: 'saved', motion: 'cheer' },
};

/**
 * First-use setup: a welcome, four optional questions and a finish that shows what the answers changed.
 * Every answer does something real (see src/personal.ts); skipping keeps the defaults.
 */
export function Setup({ replay = false }: { replay?: boolean }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const prefs = usePrefs();
  const steps = replay ? REPLAY : FIRST_USE;
  const questions = steps.filter((s) => s !== 'welcome' && s !== 'ready');
  const [index, setIndex] = useState(0);
  const [personal, setPersonal] = useState<Personal>(prefs.personal);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finishing = useRef(false);
  const step = steps[index]!;
  const first = firstName(personal.name);
  const pinned = pinnedCategories(personal.categories, CATEGORIES);
  const column = { width: '100%' as const, maxWidth: COLUMN + GUTTER * 2, alignSelf: 'center' as const, paddingHorizontal: GUTTER };

  const update = (patch: Partial<Personal>) => setPersonal((p) => ({ ...p, ...patch }));
  const go = (target: number) => {
    const next = Math.max(0, Math.min(steps.length - 1, target));
    // Answers are kept as soon as a step is left, so closing the app mid-way loses nothing.
    void setPrefs({ personal: { ...personal, name: personal.name.trim() } }).catch(() => undefined);
    if (steps[next] === 'ready' && Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIndex(next);
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (index === 0) return false;
      setIndex((i) => Math.max(0, i - 1));
      return true;
    });
    return () => sub.remove();
  }, [index]);

  const finish = async (to: '/(auth)/register' | '/(auth)/sign-in') => {
    if (finishing.current) return;
    finishing.current = true;
    setBusy(true);
    setError(null);
    try {
      await setPrefs({ personal: { ...personal, name: personal.name.trim() } });
      if (replay) { router.back(); return; }
      // Leave first, then close the door: marking onboarded removes this route, and the
      // navigator's own fallback (sign-in) would otherwise win over the screen we asked for.
      router.replace(to);
      await markOnboarded();
    } catch {
      setError('Couldn’t save your setup. Please try again.');
      finishing.current = false;
      setBusy(false);
    }
  };

  const answered = step === 'name' ? !!personal.name.trim() : step === 'goal' ? !!personal.goal : step === 'records' ? personal.categories.length > 0 : true;
  const label = step === 'welcome' ? 'Set up my MedRec' : step === 'comfort' ? 'Looks good' : step === 'ready' ? (replay ? 'Done' : 'Create my account') : answered ? 'Continue' : 'Skip for now';
  const says =
    step === 'welcome' ? "Four quick questions and I'll set MedRec up around you."
    : step === 'name' ? (first ? `Nice to meet you, ${first}.` : 'A first name is plenty. It stays on this phone until you sign up.')
    : step === 'goal' ? (personal.goal ? GOALS[personal.goal].reaction : 'Pick what matters most. You can change it later in Profile.')
    : step === 'records' ? (personal.categories.length ? `${CATEGORY_META[pinned[0]]!.label} and ${CATEGORY_META[pinned[1]]!.label} get their own tabs.` : 'No wrong answers. Skip it and I’ll use the usual tabs.')
    : step === 'comfort' ? 'You can change these any time in Profile.'
    : replay ? 'Your home and tabs are updated.' : 'Next, a quick account so your records stay safe.';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.md }}>
        <View style={[column, { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.md }]}>
          {index > 0 ? (
            <Tappable onPress={() => setIndex(index - 1)} accessibilityLabel="Previous question" style={{ width: 44, height: 44, justifyContent: 'center', marginLeft: -10, alignItems: 'center' }}>
              <Icon name="arrow-left" size={22} color={c.ink} />
            </Tappable>
          ) : !replay ? <Wordmark size={26} /> : null}
          <View style={{ flex: 1 }}>
            {step !== 'welcome' && <Progress total={questions.length} done={step === 'ready' ? questions.length : questions.indexOf(step) + 1} />}
          </View>
          {replay && (
            <Tappable onPress={() => router.back()} accessibilityLabel="Close" style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginRight: -10 }}>
              <Icon name="close" size={24} color={c.ink} />
            </Tappable>
          )}
        </View>

        <Swap id={step} order={steps} style={{ flex: 1 }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[column, { flexGrow: 1, paddingTop: space.lg, paddingBottom: space.xl, gap: space.xl }]}>
            {step === 'welcome' ? (
              <Welcome />
            ) : step === 'ready' ? (
              <Ready first={first} replay={replay} goal={personal.goal} pinned={pinned} prefs={prefs} />
            ) : (
              <>
                <Heading {...HEAD[step]} />
                {step === 'name' && (
                  <Field
                    label="Your name"
                    value={personal.name}
                    onChangeText={(name) => update({ name })}
                    placeholder="e.g. Alex"
                    autoComplete="name"
                    textContentType="name"
                    autoCapitalize="words"
                    autoCorrect={false}
                    maxLength={80}
                    returnKeyType="next"
                    onSubmitEditing={() => go(index + 1)}
                  />
                )}
                {step === 'goal' && (
                  <View style={{ gap: space.md }} accessibilityRole="radiogroup">
                    {GOAL_ORDER.map((key: Goal) => (
                      <Choice key={key} title={GOALS[key].title} subtitle={GOALS[key].subtitle} selected={personal.goal === key} onPress={() => update({ goal: personal.goal === key ? null : key })} />
                    ))}
                  </View>
                )}
                {step === 'records' && (
                  <>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                      {CATEGORIES.map((k) => (
                        <Chip key={k} label={CATEGORY_META[k]!.label} selected={personal.categories.includes(k)} onPress={() => update({ categories: toggleCategory(personal.categories, k) })} />
                      ))}
                    </View>
                    <Preview label={`Your Records tabs: All, ${CATEGORY_META[pinned[0]]!.label}, ${CATEGORY_META[pinned[1]]!.label}, More`}>
                      <TextTabs
                        active="all"
                        onSelect={() => undefined}
                        items={[{ key: 'all', label: 'All' }, { key: pinned[0], label: CATEGORY_META[pinned[0]]!.label }, { key: pinned[1], label: CATEGORY_META[pinned[1]]!.label }, { key: 'more', label: 'More' }]}
                      />
                    </Preview>
                  </>
                )}
                {step === 'comfort' && (
                  <Group bare>
                    <View style={{ paddingBottom: space.lg, gap: space.md }}>
                      <Txt variant="headline">Appearance</Txt>
                      <View style={{ flexDirection: 'row', gap: space.sm }} accessibilityRole="radiogroup">
                        {APPEARANCE.map((a) => (
                          <View key={a.key} style={{ flex: 1 }}>
                            <Chip label={a.label} selected={prefs.appearance === a.key} onPress={() => void setPrefs({ appearance: a.key })} />
                          </View>
                        ))}
                      </View>
                      <Txt variant="caption" color={c.ink3}>Device follows your phone's light or dark setting.</Txt>
                    </View>
                    <Row inset={false} icon="format-size" title="Larger text" subtitle="About 15% larger, on top of your phone's setting" chevron={false} accessory={<Toggle value={prefs.largerText} onValueChange={(v) => void setPrefs({ largerText: v })} accessibilityLabel="Larger text" />} />
                    <Row inset={false} icon="tune-variant" title="Gentler motion" subtitle="Remy and screens move less" chevron={false} accessory={<Toggle value={prefs.gentleMotion} onValueChange={(v) => void setPrefs({ gentleMotion: v })} accessibilityLabel="Gentler motion" />} />
                  </Group>
                )}
              </>
            )}
          </ScrollView>
        </Swap>

        <View style={[column, { gap: space.md, paddingTop: space.sm }]}>
          {error && <Banner message={error} />}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 60 }}>
            {step !== 'welcome' && step !== 'ready' && <Remy pose={REMY[step].pose} motion={REMY[step].motion} size={56} />}
            <View accessibilityLiveRegion="polite" style={{ flex: 1, backgroundColor: c.surfaceSunken, borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: space.md }}>
              <Swap id={says}>
                <Txt variant="caption" color={c.ink2} style={{ fontSize: 14, lineHeight: 20 }}>{says}</Txt>
              </Swap>
            </View>
          </View>
          <Button
            kind={step === 'ready' ? 'primary' : 'dark'}
            label={label}
            loading={busy}
            icon={step === 'ready' ? 'check' : 'arrow-right'}
            onPress={() => (step === 'ready' ? void finish('/(auth)/register') : go(index + 1))}
            style={{ borderRadius: 18, minHeight: 60 }}
          />
          {step === 'welcome' && (
            <View style={{ minHeight: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Txt variant="caption" color={c.ink3}>Takes about a minute.</Txt>
              <Tappable onPress={() => void finish('/(auth)/sign-in')} accessibilityLabel="Already a member? Sign in" style={{ minHeight: 44, justifyContent: 'center', paddingLeft: 12 }}><Txt variant="label">Sign in</Txt></Tappable>
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Heading({ eyebrow, title, accent, body }: { eyebrow: string; title: string; accent: string; body: string }) {
  const c = useColors();
  const { width, height } = useWindowDimensions();
  const size = height < 760 || width < 375 ? 28 : 32;
  const hero = { fontSize: size, lineHeight: size * 1.14, letterSpacing: -1 };
  return (
    <View style={{ gap: space.md }}>
      <Eyebrow color={c.ink3}>{eyebrow}</Eyebrow>
      <Txt variant="hero" accessibilityRole="header" style={hero}>
        {title}<Txt variant="hero" color={c.ink3} style={hero}>{accent}</Txt>
      </Txt>
      <Txt color={c.ink2} style={{ fontSize: 15, lineHeight: 22, maxWidth: 400 }}>{body}</Txt>
    </View>
  );
}

function Welcome() {
  const launchReady = useContext(LaunchReadyContext);
  const { height } = useWindowDimensions();
  const size = height < 760 ? 170 : 220;
  return (
    <View style={{ flex: 1, justifyContent: 'space-between', gap: space.xl }}>
      <Rise active={launchReady} from={18} delay={40} duration={540}>
        <Heading eyebrow="A LITTLE ORDER. A LITTLE PEACE OF MIND." title={'Your health.\n'} accent="More in hand." body="Your records, a clearer picture, and a little help from Remy. Let's make MedRec yours." />
      </Rise>
      <Rise active={launchReady} from={24} delay={180} duration={540} style={{ alignSelf: 'center', width: size + 60, height: size, alignItems: 'center' }}>
        <Sparkles width={size + 60} height={size} delay={500} />
        <Remy pose="greeting" motion="wave" size={size} active={launchReady} ground />
      </Rise>
    </View>
  );
}

/** The finish: what the answers changed, revealed one line at a time. */
function Ready({ first, replay, goal, pinned, prefs }: { first: string; replay: boolean; goal: Goal | null; pinned: [string, string]; prefs: Prefs }) {
  const c = useColors();
  const look = [
    prefs.appearance === 'system' ? "Following your phone's light and dark" : prefs.appearance === 'dark' ? 'Dark look' : 'Light look',
    prefs.largerText ? 'larger text' : null,
    prefs.gentleMotion ? 'gentler motion' : null,
  ].filter(Boolean).join(', ');
  const points: { icon: 'home-heart' | 'folder-outline' | 'eye-outline' | 'lock-outline'; text: string }[] = [
    { icon: 'home-heart', text: goal ? GOALS[goal].summary : 'Home ready for your first record' },
    { icon: 'folder-outline', text: `${CATEGORY_META[pinned[0]]!.label} and ${CATEGORY_META[pinned[1]]!.label} on your Records tabs` },
    { icon: 'eye-outline', text: look },
    { icon: 'lock-outline', text: 'Private until you choose to share' },
  ];
  return (
    <>
      <View style={{ alignSelf: 'center', width: 220, height: 150, alignItems: 'center' }}>
        <Sparkles width={220} height={150} delay={200} />
        <Remy pose="saved" motion="cheer" size={150} ground />
      </View>
      <Heading eyebrow={replay ? 'UPDATED' : 'YOUR MEDREC IS READY'} title={`All set${first && !replay ? `, ${first}` : ''}.\n`} accent="Made around you." body="Here's what I set up from your answers." />
      <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, paddingHorizontal: space.lg, paddingVertical: space.sm }}>
        {points.map((p, i) => (
          <Rise key={p.icon} delay={260 + i * 140} from={10} duration={380}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <Icon name={p.icon} size={22} color={c.ink} />
              <Txt style={{ flex: 1, fontSize: 15, lineHeight: 21 }}>{p.text}</Txt>
              <Icon name="check-circle" size={20} color={c.persimmon} />
            </View>
          </Rise>
        ))}
      </View>
    </>
  );
}

/** A real component shown as a live example: visible, described, never interactive. */
function Preview({ label, children }: { label: string; children: ReactNode }) {
  const c = useColors();
  return (
    <View accessible accessibilityLabel={label} style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xs, gap: 2 }}>
      <Txt variant="micro" color={c.ink3}>YOUR RECORDS TABS</Txt>
      <View {...(Platform.OS === 'web' ? { inert: true } : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const })} pointerEvents="none">{children}</View>
    </View>
  );
}

/** One segment per question; each fills as its step is reached. */
function Progress({ total, done }: { total: number; done: number }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={`Step ${Math.min(done, total)} of ${total}`} accessibilityValue={{ min: 0, max: total, now: done }} style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: total }, (_, i) => <Segment key={i} on={i < done} />)}
    </View>
  );
}

function Segment({ on }: { on: boolean }) {
  const c = useColors();
  const calm = useCalmMotion();
  const p = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    p.value = calm ? (on ? 1 : 0) : withTiming(on ? 1 : 0, { duration: 320, easing: ease.out });
  }, [on, calm, p]);
  const fill = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: c.line, overflow: 'hidden' }}>
      <Animated.View style={[{ height: 4, borderRadius: 2, backgroundColor: c.persimmon }, fill]} />
    </View>
  );
}
