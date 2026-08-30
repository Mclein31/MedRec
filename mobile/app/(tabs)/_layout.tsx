import { View, Pressable, StyleSheet, Image } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';

const GREEN = Colors.teal;

function CustomTabBar(_props?: BottomTabBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isTablet, insets } = useResponsive();
  const { user } = useAuth();

  const tabs = [
    {
      name: 'index',
      route: '/(tabs)',
      activeIcon: require('../../assets/icons/records-active.png'),
      inactiveIcon: require('../../assets/icons/records-inactive.png'),
    },
    {
      name: 'share',
      route: '/(tabs)/share',
      activeIcon: require('../../assets/icons/share-active.png'),
      inactiveIcon: require('../../assets/icons/share-inactive.png'),
    },
    {
      name: 'add',
      route: '/record/add',
      icon: require('../../assets/icons/add-record.png'),
    },
    {
      name: 'scan',
      route: '/(tabs)/scan',
      activeIcon: require('../../assets/icons/scan-active.png'),
      inactiveIcon: require('../../assets/icons/scan-inactive.png'),
    },
    {
      name: 'profile',
      route: '/(tabs)/profile',
      activeIcon: require('../../assets/icons/profile-active.png'),
      inactiveIcon: require('../../assets/icons/profile-inactive.png'),
    },
  ];

  return (
    <View
      style={[
        styles.navbar,
        isTablet
          ? [
              styles.tabletNavbar,
              {
                bottom: Math.max(insets.bottom, 12) + 8,
              },
            ]
          : {
              paddingBottom: insets.bottom,
            },
      ]}
    >
      {tabs.map((tab) => {
        const isAdd = tab.name === 'add';
        const isProfile = tab.name === 'profile';

        const isActive =
          tab.name === 'index'
            ? pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index'
            : pathname.includes(tab.name);

        return (
          <Pressable
            key={tab.name}
            onPress={() => router.push(tab.route as any)}
            style={styles.navItem}
            hitSlop={8}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${tab.name.charAt(0).toUpperCase() + tab.name.slice(1)} tab`}
          >
            {isAdd ? (
              <Image source={tab.icon} style={styles.addIcon} />
            ) : isProfile && user?.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={[
                  styles.profileAvatarIcon,
                  isActive && styles.profileAvatarIconActive,
                ]}
              />
            ) : (
              <Image
                source={isActive ? tab.activeIcon : tab.inactiveIcon}
                style={styles.navIcon}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Records',
        }}
      />
      <Tabs.Screen
        name="share"
        options={{
          title: 'Share',
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  navbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 85,
    paddingTop: 15,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#EEF3F2',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  tabletNavbar: {
    left: 'auto',
    right: 'auto',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    height: 68,
    paddingTop: 0,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5F0EE',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  profileAvatarIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    resizeMode: 'cover',
  },
  profileAvatarIconActive: {
    borderWidth: 1.5,
    borderColor: GREEN,
  },
  addIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
});