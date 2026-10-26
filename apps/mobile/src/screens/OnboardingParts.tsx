import { useEffect, useState } from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useCalmMotion } from '../prefs';
import { radius, space, useColors } from '../theme';
import { Eyebrow, Icon, Txt } from '../ui/core';
import { Rule } from '../ui/layout';
import { Rise } from '../ui/motion';
import { Remy, type RemyPose } from '../ui/Remy';

export type Preview = 'records' | 'understand' | 'share' | 'medical';

const RIDER = 40;
const POSES: RemyPose[] = ['default', 'reading', 'greeting', 'saved'];

/** Four-segment progress bar with Remy hopping along to the current step. */
export function ProgressTrail({ count, page }: { count: number; page: number }) {
  const calm = useCalmMotion();
  const [w, setW] = useState(0);
  const gap = 6;
  const seg = w ? (w - gap * (count - 1)) / count : 0;
  const target = seg ? page * (seg + gap) + seg / 2 - RIDER / 2 : 0;
  const x = useSharedValue(target);
  const hop = useSharedValue(0);

  useEffect(() => {
    if (!seg) return;
    if (calm) {
      x.value = target;
      return;
    }
    x.value = withTiming(target, { duration: 420, easing: Easing.inOut(Easing.cubic) });
    hop.value = 0;
    hop.value = withTiming(1, { duration: 420, easing: Easing.linear });
  }, [target, seg, calm, x, hop]);

  const rider = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: -Math.sin(hop.value * Math.PI) * 14 }, { rotate: `${Math.sin(hop.value * Math.PI * 2) * 8}deg` }],
  }));

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} accessible accessibilityRole="progressbar" accessibilityLabel={`Step ${page + 1} of ${count}`}>
      <View style={{ height: RIDER }}>
        {seg > 0 && (
          <Animated.View style={[{ position: 'absolute', left: 0, bottom: -2 }, rider]}>
            <Remy pose={POSES[page] ?? 'default'} size={RIDER} motion="idle" />
          </Animated.View>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap }}>
        {Array.from({ length: count }, (_, i) => (
          <Segment key={i} filled={i <= page} />
        ))}
      </View>
    </View>
  );
}

function Segment({ filled }: { filled: boolean }) {
  const c = useColors();
  const p = useSharedValue(filled ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(filled ? 1 : 0, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [filled, p]);
  const fill = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: c.line, overflow: 'hidden' }}>
      <Animated.View style={[{ height: 4, backgroundColor: c.accent }, fill]} />
    </View>
  );
}

function SampleDoc({ title, meta, active, delay }: { title: string; meta: string; active: boolean; delay: number }) {
  const c = useColors();
  return (
    <Rise active={active} delay={delay} x={28}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.xl, backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line }}>
        <Icon name="file-document-outline" size={24} color={c.ink} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="headline">{title}</Txt>
          <Txt variant="caption" color={c.ink3}>{meta}</Txt>
        </View>
        <Icon name="chevron-right" size={22} color={c.ink} />
      </View>
    </Rise>
  );
}

/** Illustrative step previews. They are labelled examples, never the user's data. */
export function StepPreview({ kind, active }: { kind: Preview; active: boolean }) {
  const c = useColors();
  if (kind === 'records') {
    return (
      <View style={{ gap: space.md }} accessibilityLabel="Example records list" accessible>
        <SampleDoc title="Complete blood count" meta="Lab result · example" active={active} delay={120} />
        <SampleDoc title="Annual checkup" meta="Visit note · example" active={active} delay={220} />
      </View>
    );
  }
  if (kind === 'understand') {
    return (
      <Rise active={active} delay={120} scale={0.96}>
        <View style={{ backgroundColor: c.surfaceSunken, borderRadius: radius.lg, padding: space.xl, gap: space.md }} accessible accessibilityLabel="Example plain-language explanation">
          <Eyebrow>Plain-language explanation</Eyebrow>
          <Txt variant="title" style={{ fontFamily: 'DMSans-SemiBold' }}>Complete blood count</Txt>
          <Rule />
          <Rise active={active} delay={320}>
            <Txt>Understand what your record contains and prepare questions for your doctor.</Txt>
          </Rise>
          <Rise active={active} delay={440}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Txt variant="label">View the original document</Txt>
              <Icon name="arrow-top-right" size={16} color={c.ink} />
            </View>
          </Rise>
        </View>
      </Rise>
    );
  }
  if (kind === 'share') {
    return (
      <Rise active={active} delay={120} scale={0.96}>
        <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.xl, gap: space.lg }} accessible accessibilityLabel="Example temporary access code: 8 lab results, view only, 15 minutes">
          <Eyebrow>Temporary record access</Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xl }}>
            <Rise active={active} delay={260} scale={0.6} from={0}>
              <View style={{ backgroundColor: '#FFFFFF', padding: 4 }}>
                <QRCode value="MedRec onboarding example. Not a real share link." size={112} color="#000000" backgroundColor="#FFFFFF" />
              </View>
            </Rise>
            <View style={{ flex: 1, gap: space.sm }}>
              <Rise active={active} delay={380}><Txt variant="headline">8 lab results</Txt></Rise>
              <Rise active={active} delay={460}><Txt variant="caption" color={c.ink3}>View only</Txt></Rise>
              <Rise active={active} delay={540}><Txt variant="headline">15 minutes</Txt></Rise>
            </View>
          </View>
          <Txt variant="caption" color={c.ink3}>You can end access at any time.</Txt>
        </View>
      </Rise>
    );
  }
  return (
    <Rise active={active} delay={120} from={28} scale={0.94}>
      <View style={{ backgroundColor: c.panel, borderRadius: radius.lg, padding: space.xl, gap: space.md }} accessible accessibilityLabel="Example Medical ID for a sample profile">
        <Eyebrow color={c.onPanel}>Medical ID  /  Sample profile</Eyebrow>
        <Txt variant="display" color={c.onPanel} style={{ fontSize: 26 }}>Alex Morgan</Txt>
        <View style={{ borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }} />
        <View style={{ flexDirection: 'row', gap: space.xxl }}>
          <View style={{ gap: 2 }}>
            <Eyebrow color={c.onPanel}>Blood type</Eyebrow>
            <Txt variant="display" color={c.onPanel} style={{ fontSize: 24 }}>O+</Txt>
          </View>
          <View style={{ gap: 2 }}>
            <Eyebrow color={c.onPanel}>Allergy</Eyebrow>
            <Txt variant="headline" color={c.onPanel}>Penicillin</Txt>
          </View>
        </View>
        <Txt variant="caption" color={c.onPanel}>Emergency contact: Jamie Morgan</Txt>
      </View>
    </Rise>
  );
}
