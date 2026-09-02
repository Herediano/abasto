import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Session } from './api';

const STORAGE_KEY = 'mayorista-erp-session';

type AuthContextValue = {
  session: Session | null;
  isAdmin: boolean;
  login: (session: Session) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readStoredSession);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAdmin: session?.user.role === 'admin',
      login: next => {
        setSession(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      },
      logout: () => {
        setSession(null);
        localStorage.removeItem(STORAGE_KEY);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
