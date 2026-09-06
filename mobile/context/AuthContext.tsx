import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, saveToken, getToken, clearToken } from '../lib/api';

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
