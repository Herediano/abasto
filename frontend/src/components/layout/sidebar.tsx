import { useEffect, useRef, useState } from 'react';
import { House, List, X } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth-context';
import { gridModules, hueFor } from '@/lib/modules';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/lib/sidebar';
import { SidebarItem } from './SidebarItem';

/**
 * El riel lateral: un complemento opcional del escritorio, no el centro. Todas
 * las opciones viven en el escritorio (que es el home); esto solo da saltos
 * rápidos a los módulos, cada uno con el color de su tarjeta.
 *
 * El botón que lo despliega es la cabeza del propio riel: queda fijo arriba a
 * la izquierda y el riel crece hacia abajo desde él —una rejilla de `0fr` a
 * `1fr`, el mismo gesto con el que cada módulo se expande a la derecha en
 * hover—, y los módulos entran en cascada. Flota por encima del contenido (no
 * lo empuja) y en mobile no existe. Su estado es de este dispositivo
 * (`lib/sidebar.ts`).
 */
export function Sidebar() {
  const { can } = useAuth();
  const { open, toggle } = useSidebar();

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

  const mods = gridModules(can).filter(m => !['vencimientos', 'reposicion'].includes(m.key));
  const label = open ? 'Ocultar barra lateral' : 'Mostrar barra lateral';

  return (
    <div className="fixed left-4 top-4 z-30 hidden md:block">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={open}
        aria-label={label}
        title={label}
        className={cn(
          'sidebar-btn grid size-14 place-items-center transition-colors',
          open
            ? 'bg-accent text-accent-foreground'
            : 'bg-sidebar text-sidebar-foreground hover:text-foreground',
        )}
      >
        {open ? <X className="size-7" /> : <List className="size-7" />}
      </button>

      <div
        className="sidebar-reveal mt-2 grid"
        data-cascade={cascade ? 'true' : 'false'}
        style={{ gridTemplateRows: open ? '1fr' : '0fr', opacity: open ? 1 : 0 }}
      >
        <div className={cn('min-h-0', settled ? 'overflow-visible' : 'overflow-hidden')}>
          <nav
            inert={!open}
            className="sidebar-nav flex w-14 flex-col gap-1.5 p-1.5"
          >
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
    </div>
  );
}
