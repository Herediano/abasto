import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type Session } from './api';

// Varias cuentas con la sesión iniciada en el mismo dispositivo: se guarda la
// lista y cuál está activa. `abasto-session` (una sola sesión) es el formato
// viejo — se migra a la lista la primera vez.
const ACCOUNTS_KEY = 'abasto-accounts';
const ACTIVE_KEY = 'abasto-active';
const LEGACY_KEY = 'abasto-session';

type AuthContextValue = {
  session: Session | null;
  /** Todas las cuentas con sesión abierta en este dispositivo (la activa incluida). */
  accounts: Session[];
  /** ¿Tiene el usuario actual esta clave del catálogo (ver permissions.catalog.ts en el backend)? */
  can: (permission: string) => boolean;
  /** Inicia sesión y la deja activa; si esa cuenta ya estaba, la reemplaza. */
  login: (session: Session) => void;
  /** Cierra la sesión de la cuenta activa nada más; si quedan otras, pasa a la primera. */
  logout: () => void;
  /** Alterna a otra cuenta ya logueada, sin volver a pedir contraseña. */
  switchAccount: (userId: string) => void;
  /** Vuelve a pedir /auth/me para la cuenta activa y la actualiza (rango, permisos, sucursal, empresa). */
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readAccounts(): Session[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Session[];
      if (Array.isArray(parsed)) return parsed.filter(s => s?.accessToken && s?.user?.id);
    }
    // Migración del formato viejo (una sola sesión).
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const s = JSON.parse(legacy) as Session;
      if (s?.accessToken && s?.user?.id) return [s];
    }
  } catch {
    // Sin persistencia: no hay sesión guardada.
  }
  return [];
}

function persist(accounts: Session[], activeId: string | null) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
    else localStorage.removeItem(ACTIVE_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Modo privado: la sesión vale para esta pestaña y nada más.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Session[]>(readAccounts);
  const [activeId, setActiveId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_KEY) ?? readAccounts()[0]?.user.id ?? null;
    } catch {
      return null;
    }
  });

  const session = useMemo(
    () => accounts.find(a => a.user.id === activeId) ?? accounts[0] ?? null,
    [accounts, activeId],
  );

  useEffect(() => {
    persist(accounts, session?.user.id ?? null);
  }, [accounts, session]);

  const refresh = useMemo(
    () => async () => {
      const current = readAccounts().find(a => a.user.id === (localStorage.getItem(ACTIVE_KEY) ?? '')) ?? readAccounts()[0];
      if (!current) return;
      try {
        const fresh = await api<{ user: Session['user']; tenant: Session['tenant'] }>('/auth/me', {}, current.accessToken);
        setAccounts(prev => prev.map(a => (a.user.id === current.user.id ? { ...a, user: fresh.user, tenant: fresh.tenant } : a)));
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
      accounts,
      can: permission => !!session?.user.permissions?.includes(permission),
      login: next => {
        setAccounts(prev => [...prev.filter(a => a.user.id !== next.user.id), next]);
        setActiveId(next.user.id);
      },
      logout: () => {
        setAccounts(prev => {
          const rest = prev.filter(a => a.user.id !== session?.user.id);
          setActiveId(rest[0]?.user.id ?? null);
          return rest;
        });
      },
      switchAccount: userId => {
        if (accounts.some(a => a.user.id === userId)) setActiveId(userId);
      },
      refresh,
    }),
    [session, accounts, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
