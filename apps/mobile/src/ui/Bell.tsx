import { router } from 'expo-router';
import { View } from 'react-native';
import { useColors } from '../theme';
import { Icon, Tappable, Txt } from './core';

export function Bell({ unread }: { unread: number }) {
  const c = useColors();
  return (
    <Tappable onPress={() => router.push('/activity')} accessibilityLabel={unread ? `Activity, ${unread} new` : 'Activity'} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="bell-outline" size={24} color={c.ink} />
      {unread > 0 && (
        <View style={{ position: 'absolute', top: 6, right: 4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
          <Txt variant="micro" color={c.onAccent} style={{ fontSize: 10, lineHeight: 12 }}>{unread > 9 ? '9+' : unread}</Txt>
        </View>
      )}
    </Tappable>
  );
}
