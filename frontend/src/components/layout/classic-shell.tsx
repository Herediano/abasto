import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CashRegister, House, MagnifyingGlass, type Icon } from '@phosphor-icons/react';
import { CommandPalette } from '@/components/command-palette';
import { Kbd } from '@/components/ui/kbd';
import { useAuth } from '@/lib/auth-context';
import { gridModules, settingsModules, hueFor, MODULES } from '@/lib/modules';
import { cn } from '@/lib/utils';
import { PaletteContext } from '@/components/layout/escritorio-shell';

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

  const mods = gridModules(can);
  const sistema = settingsModules(can);
  const ajustes = MODULES.find(m => m.key === 'ajustes')!;
  const canCaja = can('caja.operar');

  return (
    <PaletteContext.Provider value={() => setPalette(true)}>
      <div className="flex min-h-screen">
        <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
          {/* Complemento: buscar y el mostrador, y después la navegación. Sin
              marca ni cuenta/sucursal — eso vive en el escritorio. */}
          <nav className="flex-1 overflow-y-auto px-3 py-3">
            <div className="grid gap-1.5">
              <button
                onClick={() => setPalette(true)}
                className="flex h-9 items-center gap-2.5 rounded-lg border border-sidebar-border bg-sidebar px-3 text-chico font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-hover hover:text-foreground"
              >
                <MagnifyingGlass className="size-4" /> Buscar
                <Kbd className="ml-auto">K</Kbd>
              </button>
              {canCaja && (
                <NavLink
                  to="/ventas"
                  end
                  className="flex h-9 items-center gap-2.5 rounded-lg bg-primary px-3 text-chico font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <CashRegister weight="fill" className="size-4" /> Mostrador
                </NavLink>
              )}
              <Item to="/" icon={House} hue="var(--color-primary)" label="Escritorio" />
            </div>

            <div role="presentation" className="my-3 h-px bg-sidebar-border" />

            <div className="grid gap-0.5">
              {mods.map(m => (
                <Item key={m.key} to={m.path} icon={m.Icon} hue={hueFor(m.key)} label={m.label} />
              ))}
            </div>

            {sistema.length > 0 && (
              <>
                <div role="presentation" className="my-3 h-px bg-sidebar-border" />
                <div className="grid gap-0.5">
                  <Item to={ajustes.path} icon={ajustes.Icon} hue={hueFor(ajustes.key)} label={ajustes.label} />
                  {sistema.map(m => (
                    <Item key={m.key} to={m.path} icon={m.Icon} hue={hueFor(m.key)} label={m.label} />
                  ))}
                </div>
              </>
            )}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
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

/** Ítem de navegación: monocromo hasta que está activo, y entonces la pastilla
 *  suave de cian, la barrita y el ícono del matiz del módulo. */
function Item({ to, end, icon: Icon, hue, label }: { to: string; end?: boolean; icon: Icon; hue: string; label: string }) {
  const { pathname } = useLocation();
  const activo = end ? pathname === to : pathname === to || pathname.startsWith(to + '/');
  return (
    <NavLink
      to={to}
      end={end}
      aria-current={activo ? 'page' : undefined}
      className={cn(
        'relative flex h-9 items-center gap-2.5 rounded-lg px-3 text-chico font-medium transition-colors',
        activo ? 'bg-sidebar-active text-sidebar-active-foreground' : 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground',
      )}
    >
      <span
        aria-hidden
        className={cn('absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full transition-opacity', activo ? 'opacity-100' : 'opacity-0')}
        style={{ background: hue }}
      />
      <Icon className="size-4 shrink-0" weight={activo ? 'fill' : 'regular'} style={activo ? { color: hue } : undefined} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </NavLink>
  );
}