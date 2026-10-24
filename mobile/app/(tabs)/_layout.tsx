import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { TabletLandscapeNavRail } from '../../components/navigation/TabletLandscapeNavRail';

const destinations = [
  { name: 'index', label: 'Records', icon: 'documents-outline', activeIcon: 'documents', route: '/(tabs)', hint: 'Browse and organize your health history' },
  { name: 'share', label: 'Share', icon: 'qr-code-outline', activeIcon: 'qr-code', route: '/(tabs)/share', hint: 'Give a doctor temporary access to your records' },
  { name: 'add', label: 'Add', icon: 'add', activeIcon: 'add', route: '/record/add', hint: 'Add a document or visit note' },
  { name: 'scan', label: 'Scan', icon: 'scan-outline', activeIcon: 'scan', route: '/(tabs)/scan', hint: 'View records shared with a QR code' },
  { name: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person', route: '/(tabs)/profile', hint: 'Your Medical ID, account, and settings' },
] as const;

function CustomTabBar(props: BottomTabBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isTablet, isLandscape, insets } = useResponsive();
  if (isTablet && isLandscape) return <TabletLandscapeNavRail />;
  const current = props.state.routes[props.state.index]?.name;
  return <View style={[styles.position, { bottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
    <View style={[styles.bar, isTablet && { maxWidth: 480 }]}>
      {destinations.map(tab => {
        const add = tab.name === 'add';
        const selected = !add && (current ? current === tab.name : tab.name === 'index' ? pathname === '/' : pathname.includes(tab.name));
        return <Pressable key={tab.name} onPress={() => {
          if (add) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); router.push('/record/add'); return; }
          const route = props.state.routes.find(route => route.name === tab.name);
          const event = props.navigation.emit({ type: 'tabPress', target: route?.key, canPreventDefault: true });
          if (!event.defaultPrevented) { Haptics.selectionAsync().catch(() => {}); props.navigation.navigate(tab.name); }
        }} onLongPress={() => { if (!add) props.navigation.emit({ type: 'tabLongPress', target: props.state.routes.find(route => route.name === tab.name)?.key }); }} style={({ pressed }) => [styles.item, selected && styles.selected, pressed && styles.pressed]} accessibilityRole={add ? 'button' : 'tab'} accessibilityState={add ? undefined : { selected }} accessibilityLabel={add ? 'Add health record' : `${tab.label} tab`} accessibilityHint={tab.hint}>
          <View style={add ? styles.addIcon : styles.icon}><Ionicons name={selected ? tab.activeIcon : tab.icon} size={add ? 25 : 22} color={add ? Colors.white : selected ? Colors.teal : Colors.muted} /></View>
          <Text style={[styles.label, selected && styles.selectedLabel]} maxFontSizeMultiplier={1.3}>{tab.label}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}

export default function TabsLayout() {
  return <Tabs tabBar={props => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
    <Tabs.Screen name="index" options={{ title: 'Records' }} />
    <Tabs.Screen name="share" options={{ title: 'Share' }} />
    <Tabs.Screen name="scan" options={{ title: 'Scan' }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
  </Tabs>;
}

const styles = StyleSheet.create({
  position: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  bar: { flexDirection: 'row', width: '100%', padding: 6, gap: 2, backgroundColor: Colors.surface, borderRadius: 24, borderWidth: 1, borderColor: Colors.border, shadowColor: Colors.ink, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.09, shadowRadius: 20, elevation: 8 },
  item: { flex: 1, minWidth: 44, minHeight: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 18, gap: 4, paddingVertical: 6 },
  selected: { backgroundColor: Colors.tealLight },
  pressed: { opacity: 0.7 },
  icon: { height: 28, justifyContent: 'center' },
  addIcon: { width: 36, height: 28, backgroundColor: Colors.teal, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  label: { fontFamily: 'LexendDeca-SemiBold', fontSize: 10, lineHeight: 15, color: Colors.muted },
  selectedLabel: { color: Colors.teal },
});
