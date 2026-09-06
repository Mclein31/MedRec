import React from 'react';
import { View, Pressable, StyleSheet, Image } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { TabletLandscapeNavRail } from '../../components/navigation/TabletLandscapeNavRail';

const GREEN = Colors.teal;

const TAB_A11Y_LABELS: Record<string, string> = {
  index: 'Records tab',
  share: 'Share tab',
  add: 'Add health record',
  scan: 'Scan tab',
  profile: 'Profile tab',
};

function CustomTabBar(_props?: BottomTabBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isTablet, isLandscape, insets } = useResponsive();
  const { user } = useAuth();

  // Tablet Landscape: Render Purpose-Built Left Navigation Rail (88pt)
  if (isTablet && isLandscape) {
    return <TabletLandscapeNavRail />;
  }

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
      hitSlop={!isTablet ? { top: 35 } : undefined}
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
            onPress={() => {
              if (isAdd) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push(tab.route as any);
              } else {
                Haptics.selectionAsync();
                if (_props?.navigation) {
                  _props.navigation.navigate(tab.name);
                } else {
                  router.push(tab.route as any);
                }
              }
            }}
            style={({ pressed }) => [
              styles.navItem,
              isAdd && !isTablet && styles.addNavItem,
              pressed && styles.navItemPressed,
            ]}
            hitSlop={isAdd && !isTablet ? { top: 42, bottom: 8, left: 8, right: 8 } : 8}
            accessibilityRole={isAdd ? 'button' : 'tab'}
            accessibilityState={isAdd ? undefined : { selected: isActive }}
            accessibilityLabel={TAB_A11Y_LABELS[tab.name] || `${tab.name} tab`}
          >
            {isAdd ? (
              isTablet ? (
                <View style={styles.tabletAddButton}>
                  <Ionicons name="add" size={28} color="#FFFFFF" />
                </View>
              ) : (
                <View style={styles.protrusionContainer} pointerEvents="none">
                  <View style={styles.domeCircle} />
                  <View style={styles.newAddButton}>
                    <Ionicons name="add" size={30} color="#FFFFFF" />
                  </View>
                </View>
              )
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
    overflow: 'visible',
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
  addNavItem: {
    overflow: 'visible',
    position: 'relative',
  },
  navItemPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  protrusionContainer: {
    position: 'absolute',
    top: -35,
    width: 74,
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
  },
  domeCircle: {
    position: 'absolute',
    top: 0,
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#FFFFFF',
  },
  newAddButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabletAddButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GREEN,
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
});