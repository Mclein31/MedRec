import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { api, type AuthStep, type Challenge, type User } from './lib/api';
import { ApiError, onSessionExpired, restoreSession, setSession } from './lib/http';
import { KEYS, secure } from './lib/storage';

type State = { status: 'loading' } | { status: 'offline' } | { status: 'signedOut'; reason?: 'expired' } | { status: 'signedIn'; user: User };

interface AuthApi {
  state: State;
  /** Password step. Returns a code challenge, or null when a trusted device signed straight in. */
  signIn(email: string, password: string): Promise<Challenge | null>;
  register(name: string, email: string, password: string): Promise<Challenge>;
  verify(challenge: Challenge, code: string, trustDevice: boolean, email: string): Promise<void>;
  signOut(): Promise<void>;
  retry(): void;
  setUser(user: User): void;
}

const Ctx = createContext<AuthApi | null>(null);

export const deviceLabel = () => (Platform.OS === 'ios' ? 'iPhone or iPad' : Platform.OS === 'android' ? 'Android device' : 'Web browser');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const mounted = useRef(true);

  const boot = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      if (!(await restoreSession())) return setState({ status: 'signedOut' });
      const { user } = await api.me();
      setState({ status: 'signedIn', user });
    } catch (err) {
      // Offline at launch keeps the stored session and offers a retry instead of signing out.
      if (err instanceof ApiError && err.status === 0) setState({ status: 'offline' });
      else setState({ status: 'signedOut' });
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const off = onSessionExpired(() => mounted.current && setState({ status: 'signedOut', reason: 'expired' }));
    void boot();
    return () => {
      mounted.current = false;
      off();
    };
  }, [boot]);

  const finish = useCallback(async (step: AuthStep & { status: 'signed_in' }, email: string) => {
    await setSession(step.session);
    if (step.deviceToken) await secure.set(KEYS.deviceToken(email), step.deviceToken);
    setState({ status: 'signedIn', user: step.user });
  }, []);

  const value = useMemo<AuthApi>(
    () => ({
      state,
      async signIn(email, password) {
        const deviceToken = (await secure.get(KEYS.deviceToken(email))) ?? undefined;
        const step = await api.login(email.trim(), password, deviceToken);
        if (step.status === 'signed_in') {
          await finish(step, email);
          return null;
        }
        return step.challenge;
      },
      async register(name, email, password) {
        const step = await api.register(name.trim(), email.trim(), password);
        if (step.status === 'signed_in') throw new Error('unexpected');
        return step.challenge;
      },
      async verify(challenge, code, trustDevice, email) {
        const purpose = challenge.purpose === 'verify_email' ? 'verify_email' : 'login';
        await finish(await api.verify(challenge.challengeId, code, purpose, trustDevice, deviceLabel()), email);
      },
      async signOut() {
        await api.logout().catch(() => undefined);
        await setSession(null);
        setState({ status: 'signedOut' });
      },
      setUser(user) {
        setState({ status: 'signedIn', user });
      },
      retry: () => void boot(),
    }),
    [state, finish, boot],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
