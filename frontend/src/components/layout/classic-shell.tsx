import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { House, type Icon } from '@phosphor-icons/react';
import { CommandPalette } from '@/components/command-palette';
import { useAuth } from '@/lib/auth-context';
import { gridModules, hueFor } from '@/lib/modules';
import { cn } from '@/lib/utils';
import { PaletteContext } from '@/components/layout/escritorio-shell';
import { SidebarItem } from './SidebarItem';
import { RailToggle } from './rail-toggle';
import { useSidebarToggle } from './useSidebarToggle';

/**
 * La interfaz clásica: barra lateral fija. Es un complemento, no el centro:
 * todas las opciones viven en el escritorio (que es el home), y este riel solo
 * da saltos rápidos —buscar, el mostrador y los módulos— sin repetir la marca,
 * la cuenta ni la sucursal que ya están en el escritorio. Se elige por usuario
 * en Ajustes ("Interfaz").
 *
 * Los atajos son los mismos que en el escritorio: `Esc` vuelve al escritorio y
 * `Ctrl/Cmd + K` abre el buscador.
 */
export function ClassicShell() {
  const { session, can } = useAuth();
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

  if (!session || !can) return null;

  const mods = gridModules(can).filter(m => !['vencimientos', 'reposicion'].includes(m.key));
  const { collapsed } = useSidebarToggle();

  return (
    <PaletteContext.Provider value={() => setPalette(true)}>
      <div className="flex min-h-screen">
        <aside className={cn(
          'pointer-events-none fixed left-4 top-4 z-20',
          collapsed && 'hidden'
        )}>
          <div className="pointer-events-auto flex w-11 flex-col gap-1 overflow-visible rounded-[5px] border border-[rgba(0,0,255,0.2)] bg-card p-1 shadow-lg shadow-black/15 rail-in">
            <RailToggle />
            <SidebarItem to="/" icon={House} hue="var(--color-primary)" label="Escritorio" />
            {mods.map(m => (
              <SidebarItem
                key={m.key}
                to={m.path}
                icon={m.Icon}
                hue={hueFor(m.key)}
                label={m.label}
              />
            ))}
          </div>
        </aside>

        <div className={cn(
          'flex min-w-0 flex-1 flex-col',
          !collapsed && 'ml-16'
        )}>
          <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
            <Outlet />
          </main>

          <footer className="px-6 pb-8 text-right">
            <p className="font-display text-h3 font-semibold tracking-tight text-sidebar-foreground">
              abasto<span className="text-primary">.ai</span>
            </p>
          </footer>
        </div>

        <CommandPalette open={palette} onOpenChange={setPalette} />
      </div>
    </PaletteContext.Provider>
  );
}