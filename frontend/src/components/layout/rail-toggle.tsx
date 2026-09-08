import { useState } from 'react';
import { List } from '@phosphor-icons/react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

type UiMode = 'blocks' | 'classic';

/**
 * La misma opción "Interfaz" de Ajustes, pero accionada desde el riel: se
 * guarda en la cuenta, así que vale en cualquier dispositivo.
 */
export function useUiMode() {
  const { session, refresh } = useAuth();
  const mode: UiMode = session?.user.preferences?.uiMode ?? 'blocks';

  async function setMode(next: UiMode) {
    if (!session || next === mode) return;
    await api('/auth/me', { method: 'PATCH', body: JSON.stringify({ preferences: { uiMode: next } }) }, session.accessToken);
    await refresh();
  }

  return { mode, setMode };
}

/**
 * Botón hamburguesa (tres barras). Arriba del riel colapsa la barra y deja
 * solo este botón; flotando solo, la vuelve a desplegar.
 */
export function RailToggle({ className }: { className?: string }) {
  const { mode, setMode } = useUiMode();
  const [busy, setBusy] = useState(false);
  const collapsed = mode !== 'classic';

  async function onClick() {
    if (busy) return;
    setBusy(true);
    try {
      await setMode(collapsed ? 'classic' : 'blocks');
    } catch (err) {
      // Si falla, queda como estaba y se ve en la consola (antes era silencio total).
      console.error('No se pudo cambiar la interfaz', err);
    } finally {
      setBusy(false);
    }
  }

  const label = collapsed ? 'Mostrar barra lateral' : 'Ocultar barra lateral';
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={busy}
      title={label}
      aria-label={label}
      aria-pressed={!collapsed}
      className={cn(
        'grid h-10 w-full place-items-center rounded-[5px] border border-[rgba(0,0,255,0.2)] bg-card/80 text-muted-foreground transition-all duration-200 hover:bg-white hover:text-black hover:shadow-md disabled:opacity-50',
        className,
      )}
    >
      <List className="size-5" />
    </button>
  );
}
