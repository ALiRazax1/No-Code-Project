import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/services/supabase';
import { authService } from '@/services/authService';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  logout: () => void;
  updateUser: (u: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Initialize session on mount
    (async () => {
      const sessionToken = await authService.getSession();
      if (!mounted) return;
      if (sessionToken) {
        setToken(sessionToken);
        const u = await authService.getCurrentUser();
        if (mounted) setUser(u);
      }
      if (mounted) setIsLoading(false);
    })();

    // Listen for auth state changes (deadlock-safe async wrapper)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session) {
          setToken(session.access_token);
          const u = await authService.getCurrentUser();
          if (mounted) setUser(u);
        } else {
          setToken(null);
          setUser(null);
        }
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: u, token: t } = await authService.login(email, password);
    setUser(u);
    setToken(t);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { user: u, token: t } = await authService.register(name, email, password);
    setUser(u);
    setToken(t);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    const { message } = await authService.forgotPassword(email);
    return message;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setToken(null);
  }, []);

  const updateUser = useCallback((u: User) => setUser(u), []);

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!token, isLoading, login, register, forgotPassword, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
