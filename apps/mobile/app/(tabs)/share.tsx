import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { timeAgo, timeLeft } from '../../src/format';
import { api, type Share } from '../../src/lib/api';
import { messageFor } from '../../src/lib/errors';
import { space, useColors } from '../../src/theme';
import { useLoad } from '../../src/useLoad';
import { Banner, Button, Txt } from '../../src/ui/core';
import { Empty, Group, Row, Screen, Section } from '../../src/ui/layout';
import { ShareCard } from '../../src/ui/ShareCard';

/** Re-renders every second while a link is open, so countdowns stay true. */
function useTick(active: boolean) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => set((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
}

export default function ShareTab() {
  const c = useColors();
  const { data, error, refreshing, refresh, reload, setData } = useLoad(() => api.shares(), []);
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

  const revoke = async (s: Share) => {
    try {
      const { share } = await api.revokeShare(s.id);
      setData((d) => (d ? { active: d.active.filter((x) => x.id !== s.id), history: [share, ...d.history] } : d));
    } catch (err) {
      setActionError(messageFor(err));
    }
  };

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
    Alert.alert('Turn off all links?', 'Anyone with an open link will lose access right away.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Turn off all', style: 'destructive', onPress: () => void go() },
    ]);
  };

  const [hero, ...others] = active;

  return (
    <Screen title="Share" subtitle="Show a QR code to your doctor. Links end on their own." refreshing={refreshing} onRefresh={refresh}>
      {(error || actionError) && <Banner message={(actionError ?? error)!} action={{ label: 'Retry', onPress: reload }} />}

      {hero ? (
        <ShareCard share={hero} onRevoke={() => revoke(hero)} />
      ) : (
        data && (
          <Empty
            icon="qrcode"
            title="No open links"
            message="Create a link for a consultation. You choose which records it covers and how long it lasts."
          />
        )
      )}
      <Button label={hero ? 'Create another link' : 'Create a share link'} kind={hero ? 'secondary' : 'primary'} icon="plus" onPress={() => router.push('/share/new')} />

      {others.length > 0 && (
        <Section title="Also open" action={{ label: 'Turn off all', onPress: revokeAll }}>
          <Group>
            {others.map((s) => (
              <Row key={s.id} icon="link-variant" title={s.label ?? s.scopeLabel} subtitle={`${timeLeft(s.expiresAt)} · ${s.viewCount ? `opened ${s.viewCount}×` : 'not opened yet'}`} accessory={<Button kind="ghost" label="Turn off" onPress={() => revoke(s)} style={{ minHeight: 36, paddingHorizontal: space.sm }} />} />
            ))}
          </Group>
        </Section>
      )}

      {!!data?.history.length && (
        <Section title="History">
          <View style={{ gap: space.lg }}>
            {data.history.slice(0, 20).map((s) => (
              <View key={s.id} style={{ gap: 2 }}>
                <Txt variant="headline">{s.label ?? s.scopeLabel}</Txt>
                <Txt variant="caption" color={c.ink3}>
                  {timeAgo(s.createdAt)} · {s.state === 'revoked' ? 'Turned off' : 'Expired'} · {s.viewCount ? `opened ${s.viewCount}×` : 'never opened'}
                </Txt>
              </View>
            ))}
          </View>
        </Section>
      )}
    </Screen>
  );
}
