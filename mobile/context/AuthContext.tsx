import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, saveToken, getToken, clearToken } from '../lib/api';

type AuthUser = {
  id: string;
  name: string;
  email: string;
};

type AuthContextType = {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      if (data?.user) {
        setUser({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
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
        try {
          const data = await api.getMe();
          if (data?.user) {
            setUser({
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
            });
          }
        } catch {
          // Token might be invalid/expired
        }
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
      });
    } else {
      await refreshUser();
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Fail open — if the network call fails, still log the user out of this
      // device. Worst case the token stays valid server-side until natural
      // expiry.
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

