import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  api,
  saveToken,
  getToken,
  clearToken,
  getHasCompletedOnboarding,
  setHasCompletedOnboarding,
  resetHasCompletedOnboarding,
  ApiError,
  onSessionExpired,
} from '../lib/api';

type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
};

type AuthContextType = {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboardingState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => onSessionExpired(() => {
    setToken(null);
    setUser(null);
    clearToken().catch(error => console.warn('Could not clear expired session', error));
  }), []);

  const refreshUser = async () => {
    const sessionToken = await getToken();
    try {
      const [meData, profileData] = await Promise.all([
        api.getMe(),
        api.getProfile().catch(() => null),
      ]);
      if (sessionToken !== await getToken()) return;
      const userData = meData?.user || profileData?.user;
      if (userData) {
        setUser({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          avatarUrl: profileData?.profile?.avatarUrl || userData.avatarUrl || null,
        });
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && sessionToken === await getToken()) {
        try { await clearToken(); }
        finally { setToken(null); setUser(null); }
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function bootstrap() {
      try {
        const [storedToken, onboarded] = await Promise.all([
          getToken().catch(() => null),
          getHasCompletedOnboarding().catch(() => false),
        ]);
        if (!isMounted) return;
        setToken(storedToken);
        setHasCompletedOnboardingState(onboarded);
        if (storedToken) {
          await refreshUser();
        }
      } catch (err) {
        console.warn('Auth bootstrap error:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    bootstrap();
    return () => {
      isMounted = false;
    };
  }, []);

  const completeOnboarding = async () => {
    await setHasCompletedOnboarding(true);
    setHasCompletedOnboardingState(true);
  };

  const resetOnboarding = async () => {
    await resetHasCompletedOnboarding();
    setHasCompletedOnboardingState(false);
  };

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    await saveToken(data.token);
    setToken(data.token);
    if (data.user) {
      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        avatarUrl: data.user.avatarUrl || null,
      });
    } else {
      await refreshUser();
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await api.register(name, email, password);
    try { await saveToken(data.token); }
    catch {
      throw new Error('Your account is ready, but this device could not save your session. Sign in to finish, or retry once device storage is available.');
    }
    setToken(data.token);
    if (data.user) {
      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        avatarUrl: data.user.avatarUrl || null,
      });
    } else {
      await refreshUser();
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Fail open
    }
    try { await clearToken(); }
    finally { setToken(null); setUser(null); }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoading,
        hasCompletedOnboarding,
        completeOnboarding,
        resetOnboarding,
        login,
        register,
        logout,
        refreshUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
