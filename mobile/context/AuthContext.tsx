import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Alert, Platform } from 'react-native';
import { api, saveToken, getToken, clearToken } from '../lib/api';

// Safely load GoogleSignin native module. In Expo Go or stale development builds,
// TurboModuleRegistry throws synchronously if RNGoogleSignin is not linked in the native binary.
let GoogleSignin: any = null;
let statusCodes: any = {};

if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const googleSigninPkg = require('@react-native-google-signin/google-signin');
    GoogleSignin = googleSigninPkg?.GoogleSignin ?? null;
    statusCodes = googleSigninPkg?.statusCodes ?? {};

    if (GoogleSignin?.configure) {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        scopes: ['profile', 'email'],
      });
    }
  } catch (err) {
    // RNGoogleSignin is not registered in the currently running binary (e.g. Expo Go)
    console.warn('[GoogleSignin] Native module not registered in binary:', err);
    GoogleSignin = null;
    statusCodes = {};
  }
}

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
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const [meData, profileData] = await Promise.all([
        api.getMe().catch(() => null),
        api.getProfile().catch(() => null),
      ]);
      const userData = meData?.user || profileData?.user;
      if (userData) {
        setUser({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          avatarUrl: profileData?.profile?.avatarUrl || userData.avatarUrl || null,
        });
      }
    } catch {
      // Ignore background refresh errors
    }
  };

  useEffect(() => {
    getToken().then(async (stored) => {
      setToken(stored);
      if (stored) {
        await refreshUser();
      }
      setIsLoading(false);
    });
  }, []);

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

  const loginWithGoogle = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Google Sign-In', 'Google Sign-In is supported natively on iOS and Android devices.');
      return;
    }

    if (!GoogleSignin) {
      Alert.alert(
        'Google Sign-In Unavailable',
        'Native Google Sign-In requires a custom development build (npx expo run:ios or npx expo run:android) and cannot run inside standard Expo Go.\n\nPlease log in using your email and password or run the app in a native development build.'
      );
      return;
    }

    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      const response = await GoogleSignin.signIn();
      if (response.type === 'cancelled') {
        // User cancelled, cleanly exit without error alert
        return;
      }

      const idToken = response.data?.idToken;
      if (!idToken) {
        throw new Error('Google Sign-In succeeded but no ID token was returned.');
      }

      const data = await api.loginWithGoogle(idToken);
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
    } catch (err: any) {
      if (err?.code === statusCodes.SIGN_IN_CANCELLED) {
        // User dismissed the dialog
        return;
      }
      if (err?.code === statusCodes.IN_PROGRESS) {
        // Operation already in progress
        return;
      }
      if (err?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services is not available or outdated on this device.');
      }
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Fail open
    }
    await clearToken();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoading,
        login,
        register,
        loginWithGoogle,
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
