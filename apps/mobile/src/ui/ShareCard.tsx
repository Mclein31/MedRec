import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Share as NativeShare, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { timeLeft } from '../format';
import type { Share } from '../lib/api';
import { radius, space, useColors } from '../theme';
import { Button, Txt } from './core';

export function ShareCard({ share, onRevoke }: { share: Share; onRevoke: () => void }) {
  const c = useColors();
  const [copied, setCopied] = useState(false);
  if (!share.url) return null;
  const url = share.url;
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: space.xl, gap: space.lg, alignItems: 'center' }}>
      <View style={{ padding: space.md, backgroundColor: '#FFFFFF', borderRadius: radius.md }} accessible accessibilityLabel={`QR code for ${share.scopeLabel}`}>
        <QRCode value={url} size={208} color="#14211D" backgroundColor="#FFFFFF" ecl="M" />
      </View>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Txt variant="headline" style={{ textAlign: 'center' }}>{share.label ?? share.scopeLabel}</Txt>
        <Txt variant="title" color={c.accent} accessibilityLiveRegion="polite">{timeLeft(share.expiresAt)}</Txt>
        <Txt variant="caption" color={c.ink3}>{share.viewCount ? `Opened ${share.viewCount}× · you'll see each view in Activity` : 'Not opened yet'}</Txt>
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm, alignSelf: 'stretch' }}>
        <Button
          kind="secondary"
          icon={copied ? 'check' : 'content-copy'}
          label={copied ? 'Copied' : 'Copy link'}
          style={{ flex: 1 }}
          onPress={async () => {
            await Clipboard.setStringAsync(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        />
        <Button kind="secondary" icon="export-variant" label="Send" style={{ flex: 1 }} onPress={() => void NativeShare.share({ message: url, url })} />
      </View>
      <Button kind="danger" label="Turn off now" onPress={onRevoke} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}
