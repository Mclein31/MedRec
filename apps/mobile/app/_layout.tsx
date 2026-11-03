import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/auth';
import { AppLockGate } from '../src/lock';
import { loadOnboarded, useOnboarded } from '../src/onboarded';
import { loadPrefs, useCalmMotion } from '../src/prefs';
import { Launch } from '../src/screens/Launch';
import { useColors } from '../src/theme';
import { Button, Txt } from '../src/ui/core';
import { LaunchReadyContext } from '../src/ui/LaunchReady';
import { launchPresentation } from '../src/ui/launchFlow';

void SplashScreen.preventAutoHideAsync();

export default function Root() {
  const [splashReady, setSplashReady] = useState(false);
  const [fontsLoaded] = useFonts({
    'DMSans-Regular': require('../assets/fonts/DMSans_400Regular.ttf'),
    'DMSans-Medium': require('../assets/fonts/DMSans_500Medium.ttf'),
    'DMSans-SemiBold': require('../assets/fonts/DMSans_600SemiBold.ttf'),
    'DMSans-Bold': require('../assets/fonts/DMSans_700Bold.ttf'),
    'Sora-SemiBold': require('../assets/fonts/Sora_600SemiBold.ttf'),
    'Sora-Bold': require('../assets/fonts/Sora_700Bold.ttf'),
    'Manrope-ExtraBold': require('../assets/fonts/Manrope_800ExtraBold.ttf'),
  });
  // The native splash (Remy on aubergine) covers font loading; the animated Launch takes over after.
  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync().catch(() => undefined).finally(() => setSplashReady(true));
  }, [fontsLoaded]);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>{fontsLoaded ? <Navigator splashReady={splashReady} /> : null}</AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Navigator({ splashReady }: { splashReady: boolean }) {
  const c = useColors();
  const { state } = useAuth();
  const onboarded = useOnboarded();

  const [launchGone, setLaunchGone] = useState(false);
  const [enteredUser, setEnteredUser] = useState<string | null>(null);
  const userId = state.status === 'signedIn' ? state.user.id : null;

  useEffect(() => {
    void loadOnboarded();
    void loadPrefs();
  }, []);
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(c.bg);
  }, [c.bg]);

  const ready = state.status !== 'loading' && onboarded !== null;
  useEffect(() => { if (userId === null) setEnteredUser(null); }, [userId]);
  const presentation = launchPresentation({ startupComplete: launchGone, completedUser: enteredUser, status: state.status, onboarded, userId });
  const onGone = useCallback(() => { setEnteredUser(userId); setLaunchGone(true); }, [userId]);
  const launch = presentation ? <Launch key={presentation.key} kind={presentation.kind} reason={presentation.reason} done={presentation.done} splashReady={splashReady} onGone={onGone} /> : null;
  return (
    <View style={{ flex: 1, backgroundColor: ready ? c.bg : '#492D48' }}>
      <LaunchReadyContext.Provider value={!presentation}>{ready && <Routes />}</LaunchReadyContext.Provider>
      {launch}
      <StatusBar style={presentation && presentation.kind !== 'returning' ? 'light' : 'auto'} />
    </View>
  );
}

function Routes() {
  const c = useColors();
  const { state, retry } = useAuth();
  const onboarded = useOnboarded();
  const calm = useCalmMotion();

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
  // Movement says where a screen lives: drill-downs push from the side, tasks rise from below.
  // Root swaps (auth <-> app) and every route under reduced motion cross-fade instead.
  const fade = { animation: 'fade', animationDuration: 180 } as const;
  const push = calm ? fade : ({ animation: 'default' } as const);
  const rise = { animation: Platform.OS === 'android' ? ('slide_from_bottom' as const) : ('default' as const) };
  // Routes using `sheet` must also be listed in SHEET_ROUTES (src/ui/layout.tsx) for their top inset.
  const sheet = { presentation: 'modal' as const, ...(calm ? fade : rise) };
  const cover = { presentation: 'fullScreenModal' as const, ...(calm ? fade : ({ animation: 'slide_from_bottom' } as const)) };
  return (
    <AppLockGate userId={signedIn ? state.user.id : null}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'fade', animationDuration: 180 }}>
        <Stack.Protected guard={!signedIn && !onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add" options={cover} />
          <Stack.Screen name="record/[id]" options={push} />
          <Stack.Screen name="record/explain" options={push} />
          <Stack.Screen name="remy" options={sheet} />
          <Stack.Screen name="preferences" options={push} />
          <Stack.Screen name="share/new" options={push} />
          <Stack.Screen name="share/[id]" options={push} />
          <Stack.Screen name="activity" options={sheet} />
          <Stack.Screen name="profile-edit" options={sheet} />
          <Stack.Screen name="security" options={push} />
          <Stack.Screen name="tour" options={cover} />
          <Stack.Screen name="summary" options={sheet} />
        </Stack.Protected>
      </Stack>
    </AppLockGate>
  );
}
