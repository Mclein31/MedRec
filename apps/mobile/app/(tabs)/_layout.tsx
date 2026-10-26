import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { router, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { motion, space, useColors } from '../../src/theme';
import { Icon, Tappable, Txt, type IconName } from '../../src/ui/core';

const TABS: Record<string, { label: string; icon: IconName; active: IconName }> = {
  index: { label: 'Records', icon: 'folder-outline', active: 'folder' },
  share: { label: 'Share', icon: 'qrcode', active: 'qrcode' },
  medical: { label: 'Medical ID', icon: 'heart-pulse', active: 'heart-pulse' },
  profile: { label: 'Profile', icon: 'account-outline', active: 'account' },
};

/** Short persimmon underline that grows in under the selected tab. */
function Underline({ on }: { on: boolean }) {
  const c = useColors();
  const p = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(on ? 1 : 0, { duration: motion.routine, easing: Easing.out(Easing.cubic) });
  }, [on, p]);
  const style = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scaleX: 0.3 + p.value * 0.7 }] }));
  return <Animated.View style={[{ width: 22, height: 3, borderRadius: 2, backgroundColor: c.persimmon }, style]} />;
}

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
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 64 }}
      >
        <Icon name={focused ? meta.active : meta.icon} size={24} color={focused ? c.ink : c.ink3} />
        <Txt variant="caption" color={focused ? c.ink : c.ink3} numberOfLines={2} style={{ fontSize: 12, lineHeight: 14, textAlign: 'center' }}>
          {meta.label}
        </Txt>
        <Underline on={focused} />
      </Tappable>
    );
  });
  const add = (
    <Tappable key="add" onPress={() => router.push('/add')} haptic accessibilityLabel="Add record" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 64 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="plus" size={26} color={c.onAccent} />
      </View>
      <Txt variant="caption" color={c.ink} numberOfLines={2} style={{ fontSize: 12, lineHeight: 14, textAlign: 'center' }}>
        Add record
      </Txt>
    </Tappable>
  );
  const visible = items.filter(Boolean);
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.line, paddingBottom: Math.max(insets.bottom, space.sm) }}>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'center', width: '100%', maxWidth: 560, paddingHorizontal: space.xs }}>
        {visible.slice(0, 2)}
        {add}
        {visible.slice(2)}
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
