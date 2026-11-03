import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { router, Tabs } from 'expo-router';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space, useColors } from '../../src/theme';
import { Icon, Tappable, Txt, type IconName } from '../../src/ui/core';
import { useSlidingMarker } from '../../src/ui/motion';

const UNDERLINE = 22;
/** Every item shares one structure (40pt icon slot, label, 3pt underline row) so all five labels share a baseline. */
const ITEM = { alignItems: 'center', justifyContent: 'flex-start', gap: 3, minHeight: 64 } as const;
const SLOT = { height: 40, alignItems: 'center', justifyContent: 'center' } as const;

const TABS: Record<string, { label: string; icon: IconName; active: IconName }> = {
  index: { label: 'Records', icon: 'folder-outline', active: 'folder' },
  share: { label: 'Share', icon: 'qrcode', active: 'qrcode' },
  medical: { label: 'Medical ID', icon: 'heart-pulse', active: 'heart-pulse' },
  profile: { label: 'Profile', icon: 'account-outline', active: 'account' },
};

function TabBar({ state, navigation }: BottomTabBarProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const marker = useSlidingMarker(state.routes[state.index]?.key, UNDERLINE);
  const items = state.routes.map((route, index) => {
    const meta = TABS[route.name];
    if (!meta) return null;
    const focused = state.index === index;
    return (
      <View key={route.key} style={{ flex: 1 }} onLayout={marker.item(route.key)}>
        <Tappable
          accessibilityRole="tab"
          accessibilityState={{ selected: focused }}
          accessibilityLabel={meta.label}
          onPress={() => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          }}
          style={ITEM}
        >
          <View style={SLOT}>
            <Icon name={focused ? meta.active : meta.icon} size={24} color={focused ? c.ink : c.ink3} />
          </View>
          <Txt variant="caption" color={focused ? c.ink : c.ink3} numberOfLines={2} style={{ fontSize: 12, lineHeight: 14, textAlign: 'center' }}>
            {meta.label}
          </Txt>
          <View onLayout={marker.bar(route.key)} style={{ width: UNDERLINE, height: 3 }} />
        </Tappable>
      </View>
    );
  });
  const add = (
    <Tappable key="add" onPress={() => router.push('/add')} haptic accessibilityLabel="Add record" style={[ITEM, { flex: 1 }]}>
      <View style={[SLOT, { width: 40, borderRadius: 12, backgroundColor: c.accent }]}>
        <Icon name="plus" size={26} color={c.onAccent} />
      </View>
      <Txt variant="caption" color={c.ink} numberOfLines={2} style={{ fontSize: 12, lineHeight: 14, textAlign: 'center' }}>
        Add record
      </Txt>
      <View style={{ width: UNDERLINE, height: 3 }} />
    </Tappable>
  );
  const visible = items.filter(Boolean);
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.line, paddingBottom: Math.max(insets.bottom, space.sm) }}>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'center', width: '100%', maxWidth: 560, paddingHorizontal: space.xs }}>
        {visible.slice(0, 2)}
        {add}
        {visible.slice(2)}
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: UNDERLINE, height: 3, borderRadius: 2, backgroundColor: c.persimmon }, marker.style]} />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, animation: 'fade' }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="share" />
      <Tabs.Screen name="medical" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
