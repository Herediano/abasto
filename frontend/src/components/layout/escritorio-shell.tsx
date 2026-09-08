import { createContext, useContext, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CommandPalette } from '@/components/command-palette';
import { useAuth } from '@/lib/auth-context';
import { RailToggle } from './rail-toggle';

/** Abre el buscador de Ctrl+K desde cualquier pantalla (botón "Preguntar" del escritorio, etc.). */
export const PaletteContext = createContext<() => void>(() => {});
export const usePalette = () => useContext(PaletteContext);

/**
 * El marco de la app: sin riel. El escritorio (`/`) es la navegación; cada
 * módulo se abre desde ahí y trae su propia cabecera con "← Escritorio".
 * Ver docs/diseno.md.
 *
 * Acá viven las dos cosas globales que quedan: `Esc` para volver al escritorio
 * y `Ctrl/Cmd + K` para el buscador.
 */
export function EscritorioShell() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const enEscritorio = pathname === '/';
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette(p => !p);
        return;
      }
      if (e.key === 'Escape' && !enEscritorio) {
        // El Esc primero cierra lo que esté abierto: un diálogo, un menú de
        // Radix, el Ctrl+K. Recién sin nada abierto, el Esc vuelve al
        // escritorio. Radix deja el contenedor del popper montado aun cerrado,
        // así que se mira el `data-state="open"` de la capa, no el contenedor.
        if (e.defaultPrevented) return;
        if (document.querySelector(
          '[data-state="open"][role="dialog"], [data-state="open"][role="menu"], [data-state="open"][role="listbox"], [data-radix-popper-content-wrapper] [data-state="open"]',
        )) return;
        navigate('/', { viewTransition: true });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enEscritorio, navigate]);

  if (!session) return null;

  return (
    <PaletteContext.Provider value={() => setPalette(true)}>
      <div className="min-h-screen">
        <div className="fixed left-4 top-4 z-20 w-[34px] rail-in">
          <RailToggle />
        </div>
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
    </PaletteContext.Provider>
  );
}
