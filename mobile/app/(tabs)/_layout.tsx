import { View, Pressable, StyleSheet, Image } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GREEN = '#159A83';

function CustomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
        {
          paddingBottom: insets.bottom,
        },
      ]}
    >

      {tabs.map((tab) => {

        const isAdd = tab.name === 'add';

        const isActive =
          tab.name === 'index'
            ? pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index'
            : pathname.includes(tab.name);


        return (
          <Pressable
            key={tab.name}
            onPress={() => router.push(tab.route as any)}
            style={styles.navItem}
          >

            {isAdd ? (

              <Image
                source={tab.icon}
                style={styles.addIcon}
              />

            ) : (

              <Image
                source={
                  isActive
                    ? tab.activeIcon
                    : tab.inactiveIcon
                }
                style={[
                  styles.navIcon,
                  isActive && styles.activeIcon,
                ]}
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
      tabBar={() => <CustomTabBar />}
      screenOptions={{
        headerShown:false,
      }}
    >

      <Tabs.Screen
        name="index"
        options={{
          title:'Records',
        }}
      />

      <Tabs.Screen
        name="share"
        options={{
          title:'Share',
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          title:'Scan',
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title:'Profile',
        }}
      />

    </Tabs>
  );
}



const styles = StyleSheet.create({
  navbar: {
    position:'absolute',
    bottom:0,
    left:0,
    right:0,
    height:85,
    paddingTop: 15, 
    backgroundColor:'#FFFFFF',
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-around',
    borderTopWidth:1,
    borderTopColor:'#EEF3F2',
    elevation:10,
    shadowColor:'#000',
    shadowOffset:{
      width:0,
      height:-3,
    },
    shadowOpacity:0.08,
    shadowRadius:10,
  },


  navItem: {
    flex:1,
    height:'100%',
    alignItems:'center',
    justifyContent:'center',
  },


  navIcon: {
    width:28,
    height:28,
    resizeMode:'contain',
  },


  activeIcon: {
    transform:[
      {
        scale:1.05,
      }
    ],
  },


  addIcon: {
    width:28,
    height:28,
    resizeMode:'contain',
  },
});