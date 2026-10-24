import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { router, Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, space, useColors } from '../../src/theme';
import { Icon, Tappable, Txt, type IconName } from '../../src/ui/core';

const TABS: Record<string, { label: string; icon: IconName; active: IconName }> = {
  index: { label: 'Records', icon: 'folder-outline', active: 'folder' },
  share: { label: 'Share', icon: 'qrcode', active: 'qrcode' },
  medical: { label: 'Medical ID', icon: 'medical-bag', active: 'medical-bag' },
  profile: { label: 'Profile', icon: 'account-circle-outline', active: 'account-circle' },
};

function TabBar({ state, navigation }: BottomTabBarProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const items = state.routes.map((route, index) => {
    const meta = TABS[route.name];
    if (!meta) return null;
    const focused = state.index === index;
    return (
      <Tappable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={meta.label}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 52 }}
      >
        <Icon name={focused ? meta.active : meta.icon} size={24} color={focused ? c.accent : c.ink3} />
        <Txt variant="micro" color={focused ? c.ink : c.ink3} numberOfLines={1}>
          {meta.label}
        </Txt>
      </Tappable>
    );
  });
  const add = (
    <Tappable key="add" onPress={() => router.push('/add')} haptic accessibilityLabel="Add a record" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="plus" size={28} color={c.onAccent} />
      </View>
    </Tappable>
  );
  const visible = items.filter(Boolean);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: Math.max(insets.bottom, space.md), paddingHorizontal: space.md }}>
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'center',
          width: '100%',
          maxWidth: 560,
          backgroundColor: c.surface,
          borderRadius: radius.lg + 6,
          borderWidth: 1,
          borderColor: c.line,
          paddingHorizontal: space.xs,
          paddingVertical: 6,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        }}
      >
        {visible.slice(0, 2)}
        {add}
        {visible.slice(2)}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="share" />
      <Tabs.Screen name="medical" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
