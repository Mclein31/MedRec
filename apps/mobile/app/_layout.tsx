import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/auth';
import { AppLockGate } from '../src/lock';
import { loadOnboarded, useOnboarded } from '../src/onboarded';
import { useColors } from '../src/theme';
import { Button, Txt } from '../src/ui/core';

void SplashScreen.preventAutoHideAsync();

export default function Root() {
  const [fontsLoaded] = useFonts({
    'LexendDeca-Regular': require('../assets/fonts/LexendDeca-Regular.ttf'),
    'LexendDeca-Medium': require('../assets/fonts/LexendDeca-Medium.ttf'),
    'LexendDeca-SemiBold': require('../assets/fonts/LexendDeca-SemiBold.ttf'),
    'LexendDeca-Bold': require('../assets/fonts/LexendDeca-Bold.ttf'),
  });
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>{fontsLoaded ? <Navigator /> : null}</AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Navigator() {
  const c = useColors();
  const { state, retry } = useAuth();
  const onboarded = useOnboarded();

  useEffect(() => {
    void loadOnboarded();
  }, []);
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(c.bg);
  }, [c.bg]);

  const ready = state.status !== 'loading' && onboarded !== null;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;

  if (state.status === 'offline') {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        <Txt variant="title">You're offline</Txt>
        <Txt color={c.ink3} style={{ textAlign: 'center', maxWidth: 320 }}>
          MedRec needs a connection to open your records. You're still signed in.
        </Txt>
        <Button label="Try again" onPress={retry} />
      </View>
    );
  }

  const signedIn = state.status === 'signedIn';
  return (
    <AppLockGate userId={signedIn ? state.user.id : null}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Protected guard={!signedIn && !onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="record/[id]" />
          <Stack.Screen name="share/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="activity" options={{ presentation: 'modal' }} />
          <Stack.Screen name="profile-edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="security" />
          <Stack.Screen name="tour" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="summary" options={{ presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
    </AppLockGate>
  );
}
