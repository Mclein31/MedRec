import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!token}>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="record/add"
          options={{
            title: 'Add Record',
            presentation: 'modal',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="record/[id]"
          options={{
            title: 'Record Details',
            headerShown: true,
          }}
        />
      </Stack.Protected>

      <Stack.Protected guard={!token}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    'LexendDeca-Bold': require('../assets/fonts/Lexend_Deca/static/LexendDeca-Bold.ttf'),
    'LexendDeca-Regular': require('../assets/fonts/Lexend_Deca/static/LexendDeca-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}