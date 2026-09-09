import { useEffect, useRef, useState } from 'react';
import { House, List, X } from '@phosphor-icons/react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { gridModules, hueFor } from '@/lib/modules';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/lib/sidebar';
import { SidebarItem } from './SidebarItem';

/**
 * El botón que despliega el riel. En el escritorio vive dentro del header
 * unificado (sticky); en el resto queda fijo arriba a la izquierda, formando
 * parte del propio riel.
 */
export function SidebarToggle({ className }: { className?: string }) {
  const { open, toggle } = useSidebar();
  const label = open ? 'Ocultar barra lateral' : 'Mostrar barra lateral';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={open}
      aria-label={label}
      title={label}
      className={cn(
        'sidebar-btn grid size-14 place-items-center transition-colors',
        open ? 'bg-accent text-accent-foreground' : 'bg-sidebar text-sidebar-foreground hover:text-foreground',
        className,
      )}
    >
      {open ? <X className="size-7" /> : <List className="size-7" />}
    </button>
  );
}

/** La lista de saltos del riel, con su cascada de entrada. */
function NavRiel({ open, settled, cascade }: { open: boolean; settled: boolean; cascade: boolean }) {
  const { can } = useAuth();
  if (!can) return null;
  const mods = gridModules(can).filter(m => !['vencimientos', 'reposicion'].includes(m.key));
  return (
    <div
      className="sidebar-reveal grid"
      data-cascade={cascade ? 'true' : 'false'}
      style={{ gridTemplateRows: open ? '1fr' : '0fr', opacity: open ? 1 : 0 }}
    >
      <div className={cn('min-h-0', settled ? 'overflow-visible' : 'overflow-hidden')}>
        <nav inert={!open} className="sidebar-nav flex w-14 flex-col gap-1.5 p-1.5">
          <SidebarItem to="/" icon={House} label="Escritorio" hue="var(--color-primary)" index={0} />
          {mods.map((m, i) => (
            <SidebarItem
              key={m.key}
              to={m.path}
              icon={m.Icon}
              label={m.label}
              hue={hueFor(m.key)}
              index={i + 1}
            />
          ))}
        </nav>
      </div>
    </div>
  );
}

/**
 * El riel lateral. En el escritorio el botón vive en el header unificado y el
 * riel cuelga de él (abosluto, siempre pegado abajo aunque el header sea
 * sticky); acá se pasa `inHeader`. En el resto de las páginas el riel se
 * despliega en el mismo lugar que antes: botón fijo arriba a la izquierda.
 */
export function Sidebar({ inHeader = false }: { inHeader?: boolean }) {
  const { can } = useAuth();
  const { open } = useSidebar();
  const { pathname } = useLocation();

  // Mientras el riel se despliega, el contenedor recorta para que la rejilla
  // 0fr→1fr se lea. Ya abierto del todo, se deja desbordar: así el ítem que se
  // expande en hover puede salir por la derecha sin que lo corten.
  const [settled, setSettled] = useState(open);
  // La cascada de entrada corre solo cuando el usuario abre el riel, nunca al
  // cargar la página (docs/diseno.md: sin animaciones de entrada al cargar).
  const wasOpen = useRef(open);
  const [cascade, setCascade] = useState(false);

  useEffect(() => {
    if (open && !wasOpen.current) setCascade(true);
    if (!open) setCascade(false);
    wasOpen.current = open;

    if (!open) {
      setSettled(false);
      return;
    }
    const t = setTimeout(() => setSettled(true), 320);
    return () => clearTimeout(t);
  }, [open]);

  if (!can) return null;

  const riel = <NavRiel open={open} settled={settled} cascade={cascade} />;
  const enEscritorio = pathname === '/';

  if (enEscritorio) {
    // El riel lo monta el header del escritorio (escritorio-page): cuelga del
    // botón, debajo del header, y sigue a la vista cuando el header se pega.
    if (!inHeader) return null;
    return <div className="absolute left-4 top-full z-30 hidden pt-1 md:block">{riel}</div>;
  }

  return (
    <div className="fixed left-4 top-4 z-30 hidden md:block">
      <SidebarToggle />
      <div className="mt-2">{riel}</div>
    </div>
  );
}
