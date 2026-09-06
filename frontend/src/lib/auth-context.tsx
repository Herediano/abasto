import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type Session } from './api';

const STORAGE_KEY = 'abasto-session';

type AuthContextValue = {
  session: Session | null;
  /** ¿Tiene el usuario actual esta clave del catálogo (ver permissions.catalog.ts en el backend)? */
  can: (permission: string) => boolean;
  login: (session: Session) => void;
  logout: () => void;
  /** Vuelve a pedir /auth/me y actualiza la sesión (rango, permisos, sucursal). */
  refresh: () => Promise<void>;
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

  const refresh = useMemo(
    () => async () => {
      const token = readStoredSession()?.accessToken;
      if (!token) return;
      try {
        const fresh = await api<{ user: Session['user']; tenant: Session['tenant'] }>('/auth/me', {}, token);
        setSession(prev => (prev ? { ...prev, user: fresh.user, tenant: fresh.tenant } : prev));
      } catch {
        // token inválido o backend caído: se mantiene lo que había
      }
    },
    [],
  );

  // La sesión no vence: si un supervisor te cambió el rango hace un rato, te
  // enterás al abrir la app de nuevo, sin tener que desloguearte a mano.
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      can: permission => !!session?.user.permissions?.includes(permission),
      login: next => {
        setSession(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      },
      logout: () => {
        setSession(null);
        localStorage.removeItem(STORAGE_KEY);
      },
      refresh,
    }),
    [session, refresh],
  );

  useEffect(() => {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
