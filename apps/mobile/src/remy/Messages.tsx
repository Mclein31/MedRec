import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { formatDate } from '../format';
import type { HealthRecord } from '../lib/api';
import { useCalmMotion } from '../prefs';
import { CATEGORY_META, radius, space, useColors } from '../theme';
import { Button, Icon, Tappable, TextLink, Txt } from '../ui/core';
import { Rise } from '../ui/motion';
import { Remy } from '../ui/Remy';
import type { Reply } from './answer';

export function Question({ text }: { text: string }) {
  const c = useColors();
  return (
    <Rise from={8} duration={180}>
      <View style={{ backgroundColor: c.accent, borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: space.md, alignSelf: 'stretch' }} accessibilityLabel={`You asked: ${text}`}>
        <Txt color={c.onAccent}>{text}</Txt>
      </View>
    </Rise>
  );
}

function Speaker({ thinking = false }: { thinking?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <Remy pose="reading" size={40} motion={thinking ? 'read' : 'none'} />
      <Txt variant="label">Remy</Txt>
    </View>
  );
}

function SourceCard({ r }: { r: HealthRecord }) {
  const c = useColors();
  return (
    <Tappable
      onPress={() => router.push({ pathname: '/record/[id]', params: { id: r.id } })}
      accessibilityRole="link"
      accessibilityLabel={`Open source record: ${r.title}`}
      style={{ backgroundColor: c.surface, borderRadius: radius.md, padding: space.lg, gap: 4 }}
    >
      <Txt variant="headline" style={{ fontSize: 17 }}>{r.title}</Txt>
      <Txt variant="caption" color={c.ink3}>{CATEGORY_META[r.category]?.short} · {formatDate(r.eventDate, { year: true })}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
        <Txt variant="label">Open source record</Txt>
        <Icon name="arrow-right" size={16} color={c.ink} />
      </View>
    </Tappable>
  );
}

export function Answer({ reply }: { reply: Reply }) {
  const c = useColors();
  return (
    <Rise from={10} style={{ gap: space.md }}>
      <Speaker />
      {reply.kind === 'term' && <Txt variant="headline">{reply.term}</Txt>}
      <Txt color={reply.kind === 'urgent' ? c.danger : c.ink}>{reply.text}</Txt>
      {reply.kind === 'records' && (
        <>
          {reply.records.map((r) => <SourceCard key={r.id} r={r} />)}
          {reply.records.length === 1 && (
            <Button kind="gold" label="Share this record" onPress={() => router.push({ pathname: '/share/new', params: { recordId: reply.records[0]!.id } })} />
          )}
          <Txt variant="caption" color={c.ink3}>Check the original document for clinical details.</Txt>
        </>
      )}
      {reply.kind === 'term' && (
        <>
          {reply.source ? (
            <View style={{ backgroundColor: c.surface, borderRadius: radius.md, padding: space.lg, gap: 4 }}>
              <Txt variant="label">Found in your record</Txt>
              <Txt variant="caption" color={c.ink3}>{reply.source.title} · {formatDate(reply.source.eventDate, { year: true })}</Txt>
              <TextLink label="View the original" icon="arrow-right" onPress={() => router.push({ pathname: '/record/[id]', params: { id: reply.source!.id } })} />
            </View>
          ) : null}
          <Txt variant="caption" color={c.ink3}>
            {reply.general ? 'General information, not about your results. ' : 'From the AI reading saved with this record. '}
            AI can make mistakes. Confirm medical decisions with your clinician.
          </Txt>
        </>
      )}
      {reply.kind === 'help' && reply.link && <TextLink label={reply.link.label} onPress={() => router.push(reply.link!.href as Href)} />}
    </Rise>
  );
}

export function Thinking() {
  return (
    <View style={{ gap: space.sm }} accessibilityLabel="Remy is looking" accessible>
      <Speaker thinking />
      <View style={{ flexDirection: 'row', gap: 6, paddingLeft: 4 }}>
        {[0, 1, 2].map((i) => <Dot key={i} delay={i * 150} />)}
      </View>
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const c = useColors();
  const calm = useCalmMotion();
  const s = useSharedValue(0.4);
  useEffect(() => {
    if (calm) return;
    s.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 300 }), withTiming(0.4, { duration: 300 })), -1));
    return () => cancelAnimation(s);
  }, [calm, delay, s]);
  const style = useAnimatedStyle(() => ({ opacity: s.value, transform: [{ translateY: -(s.value - 0.4) * 5 }] }));
  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.ink3 }, style]} />;
}

export function Failed({ onRetry }: { onRetry: () => void }) {
  const c = useColors();
  return (
    <View style={{ gap: space.sm }} accessibilityRole="alert">
      <Speaker />
      <Txt color={c.danger}>I couldn't reach your records just now. Check your connection.</Txt>
      <TextLink label="Try again" icon="refresh" onPress={onRetry} />
    </View>
  );
}
