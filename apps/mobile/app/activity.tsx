import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { timeAgo } from '../src/format';
import { api } from '../src/lib/api';
import { space, useColors } from '../src/theme';
import { useLoad } from '../src/useLoad';
import { Banner, Icon, Tappable, Txt, type IconName } from '../src/ui/core';
import { Empty, Screen } from '../src/ui/layout';

const ICONS: Record<string, IconName> = {
  share_viewed: 'eye-outline',
  emergency_viewed: 'medical-bag',
  share_created: 'qrcode',
  share_revoked: 'link-variant-off',
  sign_in: 'login',
  password_changed: 'shield-key-outline',
  record_added: 'file-document-plus-outline',
  record_deleted: 'trash-can-outline',
  emergency_updated: 'medical-bag',
};

export default function Activity() {
  const c = useColors();
  const { data, error, reload, refreshing, refresh } = useLoad(() => api.activity(), []);
  useEffect(() => {
    if (data?.unread) void api.markSeen().catch(() => undefined);
  }, [data?.unread]);

  return (
    <Screen
      title="Activity"
      subtitle="Sign-ins, shares and who opened your links."
      tabBar={false}
      refreshing={refreshing}
      onRefresh={refresh}
      right={
        <Tappable onPress={() => router.back()} accessibilityLabel="Close" hitSlop={10} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={24} color={c.ink} />
        </Tappable>
      }
    >
      {error && <Banner message={error} action={{ label: 'Retry', onPress: reload }} />}
      {data && !data.items.length && <Empty icon="bell-outline" title="Nothing yet" message="When a doctor opens a link you shared, you'll see it here." />}
      <View style={{ gap: space.lg }}>
        {(data?.items ?? []).map((a) => (
          <View key={a.id} style={{ flexDirection: 'row', gap: space.md }} accessible accessibilityLabel={`${a.title}${a.detail ? ', ' + a.detail : ''}, ${timeAgo(a.createdAt)}${a.unread ? ', new' : ''}`}>
            <Icon name={ICONS[a.kind] ?? 'information-outline'} size={20} color={a.kind.endsWith('_viewed') ? c.accent : c.ink3} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="headline">{a.title}</Txt>
              {a.detail && <Txt variant="caption" color={c.ink2}>{a.detail}</Txt>}
              <Txt variant="caption" color={c.ink3}>{timeAgo(a.createdAt)}{a.unread ? ' · New' : ''}</Txt>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}
