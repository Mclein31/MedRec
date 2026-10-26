import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { timeAgo, timeLeft } from '../../src/format';
import { api } from '../../src/lib/api';
import { messageFor } from '../../src/lib/errors';
import { radius, space, useColors } from '../../src/theme';
import { useLoad } from '../../src/useLoad';
import { useTick } from '../../src/useTick';
import { Banner, Button, TextLink, Txt } from '../../src/ui/core';
import { Rule, Screen, Section } from '../../src/ui/layout';
import { endsAt } from '../../src/ui/ShareCard';

export default function ShareTab() {
  const c = useColors();
  const { data, error, refreshing, refresh, reload } = useLoad(() => api.shares(), []);
  const [actionError, setActionError] = useState<string | null>(null);
  const active = (data?.active ?? []).filter((s) => new Date(s.expiresAt).getTime() > Date.now());
  useTick(active.length > 0);

  // A link that just ran out moves to history; reload once per snapshot so clock skew can't loop.
  const reloadedFor = useRef<unknown>(null);
  useEffect(() => {
    if (data && active.length !== data.active.length && reloadedFor.current !== data) {
      reloadedFor.current = data;
      void reload();
    }
  });

  const revokeAll = () => {
    const go = async () => {
      try {
        await api.revokeAllShares();
        await reload();
      } catch (err) {
        setActionError(messageFor(err));
      }
    };
    if (Platform.OS === 'web') return void go();
    Alert.alert('End all access?', 'Anyone with an open link will lose access right away.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End all', style: 'destructive', onPress: () => void go() },
    ]);
  };

  return (
    <Screen brand title="Share with your doctor." refreshing={refreshing} onRefresh={refresh}>
      {(error || actionError) && <Banner message={(actionError ?? error)!} action={{ label: 'Retry', onPress: reload }} />}

      <View style={{ backgroundColor: c.panel, borderRadius: radius.lg, padding: space.xl, gap: space.xl, overflow: 'hidden' }}>
        <Txt variant="display" color={c.onPanel}>{'Choose records.\nSet a time limit.'}</Txt>
        <Button kind="gold" label="Create a share link" onPress={() => router.push('/share/new')} />
      </View>

      <Section title="Active access" action={active.length > 1 ? { label: 'End all', onPress: revokeAll } : undefined}>
        {active.length === 0 && data && <Txt color={c.ink3}>No open links right now.</Txt>}
        {active.map((s, i) => (
          <View key={s.id} style={{ flexDirection: 'row', gap: space.lg }}>
            <Txt variant="numeral" style={{ width: 46 }}>{String(i + 1).padStart(2, '0')}</Txt>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="headline">{s.label ?? 'Share link'}</Txt>
              <Txt variant="caption" color={c.ink3} accessibilityLiveRegion="polite">
                {s.scopeLabel} · ends {endsAt(s.expiresAt)}
              </Txt>
              <Txt variant="caption" color={c.ink3}>{timeLeft(s.expiresAt).replace('left', 'remaining')}{s.viewCount ? ` · opened ${s.viewCount}×` : ''}</Txt>
              <TextLink label="Open QR pass" onPress={() => router.push({ pathname: '/share/[id]', params: { id: s.id } })} />
            </View>
          </View>
        ))}
        <Rule />
        <Txt variant="caption" color={c.ink3}>You can end access whenever you choose.</Txt>
      </Section>

      {!!data?.history.length && (
        <Section title="Past access">
          <View style={{ gap: space.lg }}>
            {data.history.slice(0, 20).map((s) => (
              <View key={s.id} style={{ gap: 2 }}>
                <Txt variant="headline">{s.label ?? s.scopeLabel}</Txt>
                <Txt variant="caption" color={c.ink3}>
                  {s.scopeLabel} · {timeAgo(s.createdAt)} · {s.state === 'revoked' ? 'Ended by you' : 'Expired'} · {s.viewCount ? `opened ${s.viewCount}×` : 'never opened'}
                </Txt>
              </View>
            ))}
          </View>
        </Section>
      )}
    </Screen>
  );
}
