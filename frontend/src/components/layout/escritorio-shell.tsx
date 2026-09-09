import { createContext, useContext, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CommandPalette } from '@/components/command-palette';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { EscritorioSummary } from '@/lib/escritorio';
import { backTargetFor } from '@/lib/modules';
import { AppHeader } from './app-header';
import { Sidebar } from './sidebar';

/** Abre el buscador de Ctrl+K desde cualquier pantalla (botón "Preguntar" del escritorio, etc.). */
export const PaletteContext = createContext<() => void>(() => {});
export const usePalette = () => useContext(PaletteContext);

/** El resumen del escritorio (lo que muestra la campana de la barra). Lo
 *  levanta el shell mientras se está en `/`; la página y la barra lo comparten. */
const SummaryContext = createContext<EscritorioSummary | null>(null);
export const useEscritorioSummary = () => useContext(SummaryContext);

/**
 * El marco de la app. El escritorio (`/`) es la navegación; cada módulo se abre
 * desde ahí y trae su propia cabecera con "← nivel anterior". Ver docs/diseno.md.
 *
 * En `/` la barra unificada (`AppHeader`) se extiende a lo ancho de la
 * pantalla, pegada arriba, con el riel de navegación colgando de su botón. El
 * único agregado en el resto es el riel lateral (`Sidebar`), que queda fijo
 * arriba a la izquierda. Acá viven además las dos cosas globales: `Esc` para
 * volver y `Ctrl/Cmd + K` para el buscador.
 */
export function EscritorioShell() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const enEscritorio = pathname === '/';
  const [palette, setPalette] = useState(false);
  const [summary, setSummary] = useState<EscritorioSummary | null>(null);

  const token = session?.accessToken;
  useEffect(() => {
    if (!enEscritorio || !token) {
      setSummary(null);
      return;
    }
    let vivo = true;
    api<EscritorioSummary>('/escritorio', {}, token)
      .then(s => vivo && setSummary(s))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [enEscritorio, token]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette(p => !p);
        return;
      }
      if (e.key === 'Escape' && !enEscritorio) {
        // El Esc primero cierra lo que esté abierto: un diálogo, un menú de
        // Radix, el Ctrl+K. Recién sin nada abierto, el Esc vuelve al nivel
        // anterior de la jerarquía (ej. Usuarios → Ajustes, no al escritorio).
        // Radix deja el contenedor del popper montado aun cerrado, así que se
        // mira el `data-state="open"` de la capa, no el contenedor.
        if (e.defaultPrevented) return;
        if (document.querySelector(
          '[data-state="open"][role="dialog"], [data-state="open"][role="menu"], [data-state="open"][role="listbox"], [data-radix-popper-content-wrapper] [data-state="open"]',
        )) return;
        navigate(backTargetFor(pathname).path, { viewTransition: true });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enEscritorio, pathname, navigate]);

  if (!session) return null;

  return (
    <PaletteContext.Provider value={() => setPalette(true)}>
      <SummaryContext.Provider value={summary}>
        <div className="min-h-screen">
          {enEscritorio && <AppHeader summary={summary} />}
          <Sidebar />
          <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 pb-16">
            <Outlet />
          </div>
          <footer className="mx-auto flex max-w-6xl justify-end px-6 pb-10">
            <p className="font-display text-h3 font-semibold tracking-tight text-muted-foreground">
              abasto<span className="text-primary">.ai</span>
            </p>
          </footer>
          <CommandPalette open={palette} onOpenChange={setPalette} />
        </div>
      </SummaryContext.Provider>
    </PaletteContext.Provider>
  );
}
