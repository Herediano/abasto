import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type UiMode = 'blocks' | 'classic';

export function useSidebarToggle() {
  const { session, refresh } = useAuth();
  const serverMode = session?.user.preferences?.uiMode ?? 'blocks';
  const [localCollapsed, setLocalCollapsed] = useState(
    session ? (serverMode !== 'classic') : true
  );

  // Load from localStorage on mount (only for current device)
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      setLocalCollapsed(saved === 'true');
    }
  }, []);

  // Persist to localStorage when changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(localCollapsed));
  }, [localCollapsed]);

  async function toggle() {
    const next = !localCollapsed;
    setLocalCollapsed(next);

    if (session && session.user.preferences?.uiMode !== (next ? 'blocks' : 'classic')) {
      try {
        await api('/auth/me', {
          method: 'PATCH',
          body: JSON.stringify({ preferences: { uiMode: next ? 'blocks' : 'classic' } }),
        }, session.accessToken);
        await refresh();
      } catch (err) {
        setLocalCollapsed(!next);
        console.error('No se pudo actualizar la interfaz del servidor', err);
      }
    }
  }

  return {
    collapsed: localCollapsed,
    toggle,
    showSidebar: !localCollapsed,
  };
}
