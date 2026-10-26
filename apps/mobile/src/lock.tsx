import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform, View } from 'react-native';
import { KEYS, secure } from './lib/storage';
import { space, useColors } from './theme';
import { Button, Txt } from './ui/core';
import { Remy } from './ui/Remy';

const RELOCK_AFTER_MS = 60_000;

interface LockApi {
  available: boolean;
  enabled: boolean;
  /** Verifies with biometrics/passcode before changing the setting. */
  setEnabled(next: boolean): Promise<boolean>;
}

const Ctx = createContext<LockApi>({ available: false, enabled: false, setEnabled: async () => false });
export const useAppLock = () => useContext(Ctx);

async function authenticate(prompt: string) {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: prompt, cancelLabel: 'Cancel', disableDeviceFallback: false });
  return result.success;
}

export function AppLockGate({ userId, children }: { userId: string | null; children: ReactNode }) {
  const c = useColors();
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabledState] = useState(false);
  const [locked, setLocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setChecking(true);
      if (Platform.OS === 'web' || !userId) {
        setAvailable(false);
        setEnabledState(false);
        setLocked(false);
        setChecking(false);
        return;
      }
      const [hardware, enrolled, level] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.getEnrolledLevelAsync(),
      ]);
      const ok = (hardware && enrolled) || level !== LocalAuthentication.SecurityLevel.NONE;
      const on = ok && (await secure.get(KEYS.appLock(userId))) === '1';
      if (cancelled) return;
      setAvailable(ok);
      setEnabledState(on);
      setLocked(on); // cold start
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') backgroundedAt.current = Date.now();
      if (next === 'active' && enabled && backgroundedAt.current && Date.now() - backgroundedAt.current > RELOCK_AFTER_MS) setLocked(true);
      if (next === 'active') backgroundedAt.current = null;
    });
    return () => sub.remove();
  }, [enabled]);

  const unlock = useCallback(async () => {
    if (await authenticate('Unlock MedRec')) setLocked(false);
  }, []);

  useEffect(() => {
    if (locked && AppState.currentState === 'active') void unlock();
  }, [locked, unlock]);

  const setEnabled = useCallback(
    async (next: boolean) => {
      if (!userId || !available) return false;
      if (!(await authenticate(next ? 'Turn on app lock' : 'Turn off app lock'))) return false;
      await secure.set(KEYS.appLock(userId), next ? '1' : '0');
      setEnabledState(next);
      return true;
    },
    [userId, available],
  );

  if (checking && userId) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  if (locked) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: space.xxl, gap: space.lg }}>
        <Remy pose="default" size={140} motion="idle" ground />
        <Txt variant="display">MedRec is locked</Txt>
        <Txt color={c.ink3} style={{ textAlign: 'center' }}>
          Unlock with Face ID, fingerprint or your device passcode.
        </Txt>
        <Button kind="dark" label="Unlock" icon="fingerprint" onPress={unlock} style={{ alignSelf: 'stretch', maxWidth: 360, width: '100%' }} />
      </View>
    );
  }
  return <Ctx.Provider value={{ available, enabled, setEnabled }}>{children}</Ctx.Provider>;
}
