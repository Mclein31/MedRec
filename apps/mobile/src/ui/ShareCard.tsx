import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Share as NativeShare, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Path } from 'react-native-svg';
import { timeLeft } from '../format';
import type { Share } from '../lib/api';
import { font, space } from '../theme';
import { Button, Txt } from './core';
import { Rule } from './layout';
import { Remy } from './Remy';

const TEETH = 28;
const DEPTH = 6;
/** Receipts are paper: they stay ink-on-white in every theme so the QR always scans. */
const PAPER = { bg: '#FFFFFF', ink: '#302238', muted: '#6F5B67', line: '#D9CBC6', live: '#AA283B' };

function paperPath(w: number, h: number) {
  const step = w / TEETH;
  let d = `M0 ${DEPTH}`;
  for (let i = 0; i < TEETH; i++) d += ` L${(i + 0.5) * step} 0 L${(i + 1) * step} ${DEPTH}`;
  d += ` L${w} ${h - DEPTH}`;
  for (let i = TEETH - 1; i >= 0; i--) d += ` L${(i + 0.5) * step} ${h} L${i * step} ${h - DEPTH}`;
  return `${d} Z`;
}

export const endsAt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
export const durationLabel = (s: Share) => {
  const m = Math.round((new Date(s.expiresAt).getTime() - new Date(s.createdAt).getTime()) / 60000);
  return m >= 60 && m % 60 === 0 ? `${m / 60} ${m === 60 ? 'hour' : 'hours'}` : `${m} minutes`;
};

/** QR access receipt: Remy + MedRec, zigzag tear edges top and bottom, untouched QR quiet zone. */
export function ShareReceipt({ share }: { share: Share }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const live = share.state === 'active' && new Date(share.expiresAt).getTime() > Date.now();
  return (
    <View
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={{ width: '100%', maxWidth: 342, alignSelf: 'center', paddingHorizontal: space.xl, paddingTop: space.xl + DEPTH, paddingBottom: space.xl + DEPTH, gap: space.lg }}
    >
      {size.w > 0 && (
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: 0, top: 0 }}>
          <Svg width={size.w} height={size.h}>
            <Path d={paperPath(size.w, size.h)} fill={PAPER.bg} stroke={PAPER.line} strokeWidth={1} />
          </Svg>
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Remy pose="default" size={34} motion="idle" />
          <Txt style={{ fontFamily: font.wordmark, fontSize: 20, lineHeight: 24 }} color={PAPER.ink}>MedRec</Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }} accessibilityLiveRegion="polite">
          <Txt variant="micro" color={live ? PAPER.live : PAPER.muted}>{live ? 'LIVE' : share.state === 'revoked' ? 'ENDED' : 'EXPIRED'}</Txt>
          {live && <Txt variant="micro" color={PAPER.ink}>{timeLeft(share.expiresAt).replace(' left', '').toUpperCase()}</Txt>}
        </View>
      </View>
      <Rule color={PAPER.line} />
      {live && share.url ? (
        <View style={{ alignSelf: 'center', padding: 14, backgroundColor: '#FFFFFF' }} accessible accessibilityRole="image" accessibilityLabel={`QR code for ${share.scopeLabel}`}>
          <QRCode value={share.url} size={176} color="#000000" backgroundColor="#FFFFFF" ecl="M" quietZone={8} />
        </View>
      ) : (
        <View style={{ height: 204, alignItems: 'center', justifyContent: 'center' }}>
          <Txt variant="label" color={PAPER.muted}>This code no longer opens your records.</Txt>
        </View>
      )}
      <Txt variant="headline" color={PAPER.ink} style={{ textAlign: 'center' }}>Scan to view selected records.</Txt>
      <Rule dashed color={PAPER.line} />
      <View style={{ flexDirection: 'row', gap: space.lg }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="micro" color={PAPER.muted}>WHAT'S SHARED</Txt>
          <Txt variant="headline" color={PAPER.ink}>{share.scopeLabel}</Txt>
          <Txt variant="caption" color={PAPER.muted}>View only{share.label ? ` · ${share.label}` : ''}</Txt>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="micro" color={PAPER.muted}>ACCESS ENDS</Txt>
          <Txt variant="headline" color={PAPER.ink}>{endsAt(share.expiresAt)}</Txt>
          <Txt variant="caption" color={PAPER.muted}>{durationLabel(share)}</Txt>
        </View>
      </View>
      <Txt variant="caption" color={PAPER.muted} style={{ textAlign: 'center' }}>
        {share.viewCount ? `Opened ${share.viewCount}× · each view appears in Activity` : 'Not opened yet'}
      </Txt>
    </View>
  );
}

export function ShareActions({ share, onRevoke, revoking }: { share: Share; onRevoke: () => void; revoking?: boolean }) {
  const [copied, setCopied] = useState(false);
  const url = share.url;
  if (!url) return null;
  return (
    <View style={{ gap: space.md }}>
      <Button
        kind="dark"
        icon={copied ? 'check' : undefined}
        label={copied ? 'Link copied' : 'Copy link'}
        onPress={async () => {
          await Clipboard.setStringAsync(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      />
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Button kind="secondary" label="Send" icon="export-variant" style={{ flex: 1 }} onPress={() => void NativeShare.share({ message: url, url })} />
        <Button kind="secondary" label="End access" style={{ flex: 1 }} onPress={onRevoke} loading={revoking} />
      </View>
    </View>
  );
}
