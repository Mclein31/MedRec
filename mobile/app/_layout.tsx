import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useResponsive } from '../hooks/useResponsive';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { token, isLoading, hasCompletedOnboarding } = useAuth();
  const { isTablet } = useResponsive();
  const segments = useSegments();
  const router = useRouter();

  // Automatic first-launch routing: show onboarding to brand new users
  useEffect(() => {
    if (!fontsLoaded || isLoading) return;

    const inOnboarding = segments[0] === 'onboarding';

    // If the user has no auth token and has never completed onboarding, route to onboarding
    if (!token && !hasCompletedOnboarding && !inOnboarding) {
      router.replace('/onboarding');
    }
  }, [fontsLoaded, isLoading, token, hasCompletedOnboarding, segments, router]);

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, isLoading]);

  // Safety fallback: ensure splash screen is never permanently stuck
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded || isLoading) {
    return null;
  }

  const initialRoute = token
    ? '(tabs)'
    : hasCompletedOnboarding
    ? 'login'
    : 'onboarding';

  return (
    <Stack
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      {/* 1. For brand-new patients: Onboarding is at root index 0 */}
      {!hasCompletedOnboarding ? (
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
            gestureEnabled: false,
            animation: 'fade',
          }}
        />
      ) : null}

      {/* 2. Authenticated Routes */}
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
            presentation: isTablet ? 'transparentModal' : 'modal',
            animation: isTablet ? 'fade' : 'default',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="record/[id]"
          options={{
            headerShown: false,
          }}
        />
      </Stack.Protected>

      {/* 3. Unauthenticated Routes (Login & Register) */}
      <Stack.Protected guard={!token}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>

      {/* 4. For returning or authenticated patients: Onboarding at trailing position for replay */}
      {hasCompletedOnboarding ? (
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
            gestureEnabled: false,
            animation: 'fade',
          }}
        />
      ) : null}
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'LexendDeca-Bold': require('../assets/fonts/Lexend_Deca/static/LexendDeca-Bold.ttf'),
    'LexendDeca-Regular': require('../assets/fonts/Lexend_Deca/static/LexendDeca-Regular.ttf'),
    'LexendDeca-SemiBold': require('../assets/fonts/Lexend_Deca/static/LexendDeca-SemiBold.ttf'),
  });

  const fontsReady = loaded || !!error;

  return (
    <AuthProvider>
      <NotificationProvider>
        <RootLayoutNav fontsLoaded={fontsReady} />
      </NotificationProvider>
    </AuthProvider>
  );
}