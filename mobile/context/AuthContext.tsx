import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, saveToken, getToken, clearToken } from '../lib/api';

type AuthContextType = {
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On app start, check if a token is already saved from a previous session.
  useEffect(() => {
  getToken().then((stored) => {
      setToken(stored);
      setIsLoading(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    await saveToken(data.token);
    setToken(data.token);
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await api.register(name, email, password);
    await saveToken(data.token);
    setToken(data.token);
  };

  const logout = async () => {
    await clearToken();
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isLoading, login, register, logout }}>
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
