import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from './AuthContext';

type LockState = { accountId: string | null; enabled: boolean; locked: boolean };
type AppLockValue = {
  enabled: boolean;
  ready: boolean;
  blocked: boolean;
  busy: boolean;
  available: boolean;
  hint: string;
  error: string | null;
  setEnabled: (enabled: boolean) => Promise<void>;
  unlock: () => Promise<void>;
};

const AppLockContext = createContext<AppLockValue | undefined>(undefined);
const native = Platform.OS !== 'web';
const emptyState: LockState = { accountId: null, enabled: false, locked: false };
// Encode all characters so SecureStore keys remain valid, without conflating account IDs.
const preferenceKey = (id: string) => `medrec_app_lock_${Array.from(id, c => c.codePointAt(0)!.toString(16)).join('-')}`;

function authenticationError(error: LocalAuthentication.LocalAuthenticationError): string {
  if (['user_cancel', 'app_cancel', 'system_cancel', 'user_fallback'].includes(error)) {
    return 'Identity verification was canceled. Try again when you are ready.';
  }
  if (error === 'lockout') return 'Biometrics are temporarily locked. Use your device passcode in the system prompt, or sign out.';
  if (error === 'not_enrolled' || error === 'passcode_not_set') {
    return 'Set up biometrics and a device passcode in Settings, then try again. You can also sign out.';
  }
  return 'Your device could not verify your identity. Try again or sign out.';
}

export function AppLockProvider({ children }: { children: ReactNode }) {
  const { token, user, isLoading, refreshUser } = useAuth();
  const [state, setState] = useState<LockState>(emptyState);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(false);
  const [hint, setHint] = useState(native ? 'Checking device security…' : 'Available in the iOS and Android app.');
  const [error, setError] = useState<string | null>(null);
  const identity = useRef({ token, accountId: user?.id ?? null });
  identity.current = { token, accountId: user?.id ?? null };
  const stateRef = useRef(state);
  stateRef.current = state;
  const appStateRef = useRef(appState);
  const authenticating = useRef(false);
  const backgroundRevision = useRef(0);

  const checkCapability = useCallback(async () => {
    if (!native) return false;
    try {
      const [hardware, enrolled, types] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
      ]);
      const supported = hardware && enrolled;
      setAvailable(supported);
      const method = Platform.OS === 'ios'
        ? types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) ? 'Face ID' : 'Touch ID'
        : 'your biometrics';
      setHint(supported
        ? `Use ${method} or your device passcode when you return to MedRec.`
        : hardware ? 'Set up biometrics in your device Settings to enable app lock.' : 'Biometric authentication is unavailable on this device.');
      return supported;
    } catch {
      setAvailable(false);
      setHint('Device security is unavailable. Reopen this screen to check again.');
      return false;
    }
  }, []);

  const loadPreference = useCallback(async (accountId: string) => {
    const sessionToken = identity.current.token;
    try {
      const stored = await SecureStore.getItemAsync(preferenceKey(accountId));
      if (identity.current.accountId !== accountId || identity.current.token !== sessionToken || !sessionToken) return;
      if (stored !== null && stored !== 'enabled' && stored !== 'disabled') {
        throw new Error('Invalid device security preference');
      }
      const enabled = stored === 'enabled';
      setState({ accountId, enabled, locked: enabled });
      setError(null);
    } catch {
      if (identity.current.accountId === accountId && identity.current.token === sessionToken && sessionToken) {
        // Storage failure must not silently bypass a previously enabled lock.
        setError('We could not read your device security preference. Retry or sign out to continue.');
      }
    }
  }, []);

  useEffect(() => {
    setState(emptyState);
    setError(null);
    if (native && token && user?.id && !isLoading) void loadPreference(user.id);
  }, [token, user?.id, isLoading, loadPreference]);

  useEffect(() => {
    void checkCapability();
    const subscription = AppState.addEventListener('change', next => {
      appStateRef.current = next;
      setAppState(next);
      if (next === 'background') {
        backgroundRevision.current += 1;
        if (stateRef.current.enabled) setState(current => ({ ...current, locked: true }));
      }
      if (next === 'active') void checkCapability();
    });
    return () => subscription.remove();
  }, [checkCapability]);

  const authenticate = async (promptMessage: string) => {
    const accountId = identity.current.accountId;
    const currentToken = identity.current.token;
    const revision = backgroundRevision.current;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      promptDescription: 'Verify your identity to access your health records.',
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use device passcode',
      disableDeviceFallback: false,
      biometricsSecurityLevel: 'strong',
    });
    if (!result.success) throw new Error(authenticationError(result.error));
    if (identity.current.accountId !== accountId || identity.current.token !== currentToken || backgroundRevision.current !== revision) {
      throw new Error('Your session changed. Unlock MedRec again to continue.');
    }
  };

  const setEnabled = async (enabled: boolean) => {
    const accountId = identity.current.accountId;
    const sessionToken = identity.current.token;
    const revision = backgroundRevision.current;
    if (!native || !accountId || !token || authenticating.current) return;
    authenticating.current = true;
    setBusy(true);
    try {
      if (enabled && !(await checkCapability())) throw new Error('Set up supported biometrics in your device Settings first.');
      await authenticate(enabled ? 'Enable MedRec app lock' : 'Turn off MedRec app lock');
      await SecureStore.setItemAsync(preferenceKey(accountId), enabled ? 'enabled' : 'disabled');
      if (identity.current.accountId === accountId && identity.current.token === sessionToken) {
        setState({ accountId, enabled, locked: enabled && (appStateRef.current === 'background' || revision !== backgroundRevision.current) });
        setError(null);
      } else if (identity.current.accountId === accountId && identity.current.token) {
        // If the same account signs in again during the write, re-read the
        // preference and require a fresh unlock for that new session.
        await loadPreference(accountId);
      }
    } finally {
      authenticating.current = false;
      setBusy(false);
    }
  };

  const ready = !isLoading && (!token || !native || (!!user && state.accountId === user.id));
  const unlock = async () => {
    if (!native || authenticating.current) return;
    authenticating.current = true;
    setBusy(true);
    setError(null);
    try {
      if (!user) {
        await refreshUser();
        setError('If your session cannot be restored, sign out and sign in again.');
      } else if (!ready) {
        await loadPreference(user.id);
      } else {
        await authenticate('Unlock MedRec');
        setState(current => ({ ...current, locked: false }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to unlock MedRec. Try again or sign out.');
    } finally {
      authenticating.current = false;
      setBusy(false);
    }
  };

  return (
    <AppLockContext.Provider value={{
      enabled: state.accountId === user?.id && state.enabled,
      ready,
      blocked: native && !!token && (!ready || (state.enabled && (state.locked || appState !== 'active'))),
      busy, available, hint, error, setEnabled, unlock,
    }}>
      {children}
    </AppLockContext.Provider>
  );
}

export function useAppLock() {
  const value = useContext(AppLockContext);
  if (!value) throw new Error('useAppLock must be used within an AppLockProvider');
  return value;
}
