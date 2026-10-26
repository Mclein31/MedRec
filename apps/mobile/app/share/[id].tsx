import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { timeAgo } from '../../src/format';
import { api, type Share } from '../../src/lib/api';
import { messageFor } from '../../src/lib/errors';
import { space, useColors } from '../../src/theme';
import { useLoad } from '../../src/useLoad';
import { useTick } from '../../src/useTick';
import { Banner, Button, Icon, TextLink, Txt } from '../../src/ui/core';
import { Rule, Screen } from '../../src/ui/layout';
import { Rise } from '../../src/ui/motion';
import { Remy } from '../../src/ui/Remy';
import { ShareActions, ShareReceipt } from '../../src/ui/ShareCard';

/** QR receipt for one link; turns into "Access ended" once the server says it expired or was revoked. */
export default function ShareAccess() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, setData, error, loading, reload } = useLoad(async () => {
    const all = await api.shares();
    return [...all.active, ...all.history].find((s) => s.id === id) ?? null;
  }, [id]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const live = !!data && data.state === 'active' && new Date(data.expiresAt).getTime() > Date.now();
  useTick(live);

  const revoke = async (s: Share) => {
    setBusy(true);
    setActionError(null);
    try {
      setData((await api.revokeShare(s.id)).share);
    } catch (err) {
      setActionError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/share'));

  if (!data) {
    return (
      <Screen tabBar={false} nav={{ title: 'Share access', onBack: back }}>
        {error ? <Banner message={error} action={{ label: 'Retry', onPress: reload }} /> : loading ? <Remy pose="reading" motion="read" size={120} style={{ alignSelf: 'center' }} /> : <Banner message="This link wasn't found. It may have been removed." />}
      </Screen>
    );
  }

  if (!live) {
    const when = data.revokedAt ?? data.expiresAt;
    return (
      <Screen tabBar={false} nav={{ title: 'Access ended', onBack: back }} footer={<Button label="Create another link" onPress={() => router.replace('/share/new')} />}>
        <Rise>
          <Txt variant="hero" accessibilityRole="header">Access ended.</Txt>
        </Rise>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Icon name="lock-outline" size={44} color={c.ink} />
          <Remy pose="default" size={84} motion="idle" />
        </View>
        <Txt>This link no longer opens your records. You can create a new link when you need one.</Txt>
        <Rule />
        <View style={{ gap: 4 }}>
          <Txt variant="headline">{data.label ?? 'Share link'}</Txt>
          <Txt color={c.ink3}>{data.scopeLabel} · View only</Txt>
          <Txt color={c.ink3}>
            {data.state === 'revoked' ? 'Ended by you' : 'Expired'} {timeAgo(when).replace('Just now', 'just now')}
            {data.viewCount ? ` · opened ${data.viewCount}×` : ' · never opened'}
          </Txt>
        </View>
        <TextLink label="Return to Share" onPress={() => router.replace('/(tabs)/share')} />
      </Screen>
    );
  }

  return (
    <Screen tabBar={false} nav={{ title: 'Share access', onBack: back }}>
      {actionError && <Banner message={actionError} />}
      <Rise scale={0.94}>
        <ShareReceipt share={data} />
      </Rise>
      <ShareActions share={data} onRevoke={() => revoke(data)} revoking={busy} />
      <Txt variant="caption" color={c.ink3} style={{ marginTop: -space.sm }}>
        Anyone with this link can view the selected records until access ends.
      </Txt>
    </Screen>
  );
}
