import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GREEN = '#1D9E75';
const GREEN_BG = '#e8f5f0';
const INACTIVE = '#aaa';

const TABS = [
  { name: 'index', route: '/(tabs)', label: 'Records', icon: 'document-text-outline' as const },
  { name: 'share', route: '/(tabs)/share', label: 'Share', icon: 'qr-code-outline' as const },
  { name: 'scan', route: '/(tabs)/scan', label: 'Scan', icon: 'camera-outline' as const },
];

function CustomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.pill}>
        {TABS.map((tab) => {
          const isActive =
            tab.name === 'index'
              ? pathname === '/' || pathname === '/(tabs)'
              : pathname.includes(tab.name);

          return (
            <Pressable
              key={tab.name}
              onPress={() => router.push(tab.route as any)}
              style={styles.tabItem}
            >
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <Ionicons
                  name={tab.icon}
                  size={27.5}
                  color={isActive ? GREEN : INACTIVE}
                />
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Records' }} />
      <Tabs.Screen name="share" options={{ title: 'Share' }} />
      <Tabs.Screen name="scan" options={{ title: 'Scan' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: -25,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 50,
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 8,
    borderWidth: 0.5,
    borderColor: '#9FE1CB',
    shadowColor: '#0F6E56',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    gap: 3,
  },
  iconWrap: {
    width: 110,
    height: 40,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: GREEN_BG,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: INACTIVE,
  },
  labelActive: {
    color: GREEN,
    fontWeight: '600',
  },
});