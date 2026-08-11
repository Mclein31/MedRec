import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GREEN = '#159A83';
const GREEN_BG = '#DDF5EE';
const INACTIVE = '#64748B';

const TABS = [
  { name: 'index', route: '/(tabs)', label: 'Records', activeIcon: require('../../assets/icons/records-active.png'), inactiveIcon: require('../../assets/icons/records-inactive.png') },
  { name: 'share', route: '/(tabs)/share', label: 'Share', activeIcon: require('../../assets/icons/share-active.png'), inactiveIcon: require('../../assets/icons/share-inactive.png') },
  { name: 'scan', route: '/(tabs)/scan', label: 'Scan', activeIcon: require('../../assets/icons/scan-active.png'), inactiveIcon: require('../../assets/icons/scan-inactive.png') },
  { name: 'profile', route: undefined, label: 'Profile', activeIcon: require('../../assets/icons/profile-active.png'), inactiveIcon: require('../../assets/icons/profile-inactive.png') },
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
              onPress={() => tab.route && router.push(tab.route as any)}
              disabled={!tab.route}
              style={styles.tabItem}
            >
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <Image source={isActive ? tab.activeIcon : tab.inactiveIcon} style={styles.tabIcon} />
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
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 4,
    backgroundColor: 'transparent',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 7,
    paddingHorizontal: 14,
    gap: 3,
    borderWidth: 0,
    shadowColor: '#159A83',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 15,
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    gap: 3,
  },
  iconWrap: {
    width: 62,
    height: 31,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: GREEN_BG,
  },
  tabIcon: { width: 21, height: 21, resizeMode: 'contain' },
  label: {
    fontSize: 8,
    fontWeight: '500',
    color: INACTIVE,
  },
  labelActive: {
    color: GREEN,
    fontWeight: '600',
  },
});
