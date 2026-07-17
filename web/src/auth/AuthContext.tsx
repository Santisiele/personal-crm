import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchMe, login as loginRequest } from '@/api/auth';
import { clearTokens, hasSession, setTokens } from '@/api/tokens';
import { isPrivileged, type UserView } from '@/api/types';

interface AuthState {
  user: UserView | null;
  loading: boolean;
  privileged: boolean;
  login: (name: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserView | null>(null);
  // Start in loading only if there is a stored session to validate.
  const [loading, setLoading] = useState<boolean>(hasSession());

  const refreshUser = useCallback(async () => {
    if (!hasSession()) {
      setUser(null);
      return;
    }
    try {
      setUser(await fetchMe());
    } catch {
      // The token could not be validated or refreshed; treat as logged out.
      clearTokens();
      setUser(null);
    }
  }, []);

  // On first mount, hydrate the current user from a persisted session.
  useEffect(() => {
    void refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(
    async (name: string, password: string) => {
      const pair = await loginRequest(name, password);
      setTokens(pair);
      await refreshUser();
    },
    [refreshUser],
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      privileged: user ? isPrivileged(user.role) : false,
      login,
      logout,
      refreshUser,
    }),
    [user, loading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
