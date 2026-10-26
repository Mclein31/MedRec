import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { font, space, useColors } from '../theme';
import { Icon, Tappable, Txt } from './core';
import { Remy } from './Remy';

/** Plain MedRec wordmark. Headers never put a logo or mascot beside it. */
export function Wordmark({ size = 24, color }: { size?: number; color?: string }) {
  const c = useColors();
  return (
    <Txt accessibilityRole="header" aria-level={1} style={{ fontFamily: font.wordmark, fontSize: size, lineHeight: size * 1.25, letterSpacing: -0.4 }} color={color ?? c.ink}>
      MedRec
    </Txt>
  );
}

/** Top-right Ask Remy launcher: 40×40 greeting Remy beside a visible label, 124×52 tap area. */
export function AskRemy({ recordId }: { recordId?: string }) {
  const c = useColors();
  return (
    <Tappable
      onPress={() => router.push(recordId ? { pathname: '/remy', params: { recordId } } : '/remy')}
      accessibilityLabel="Ask Remy"
      accessibilityHint="Find records, understand terms and get help with MedRec"
      style={{ minWidth: 124, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}
    >
      <Remy pose="greeting" size={40} motion="wave" />
      <Txt variant="label" color={c.ink}>Ask Remy</Txt>
    </Tappable>
  );
}

/** Main tab header: wordmark left, Ask Remy right. */
export function BrandHeader({ right }: { right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 }}>
      <Wordmark />
      {right ?? <AskRemy />}
    </View>
  );
}

/** Secondary screen header: back arrow and a small title, optional right action. */
export function NavHeader({ title, onBack, back = 'arrow-left', right, fallback = '/(tabs)' }: { title?: string; onBack?: () => void; back?: 'arrow-left' | 'close'; right?: ReactNode; fallback?: Href }) {
  const c = useColors();
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace(fallback)));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, gap: space.sm }}>
      <Tappable onPress={goBack} accessibilityLabel={back === 'close' ? 'Close' : 'Back'} hitSlop={8} style={{ width: 44, height: 44, justifyContent: 'center' }}>
        <Icon name={back} size={24} color={c.ink} />
      </Tappable>
      {title ? (
        <Txt variant="headline" accessibilityRole="header" style={{ flex: 1 }} numberOfLines={1}>
          {title}
        </Txt>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {right}
    </View>
  );
}
