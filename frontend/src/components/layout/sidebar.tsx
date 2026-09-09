import { useEffect, useRef, useState } from 'react';
import { House } from '@phosphor-icons/react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { gridModules, hueFor } from '@/lib/modules';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/lib/sidebar';
import { SidebarItem } from './SidebarItem';

/**
 * El botón que despliega el riel. Vive en el header unificado del escritorio y
 * en el header de cada módulo; ambos son sticky y el riel cuelga de él.
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
        'sidebar-btn grid h-10 w-12 place-items-center transition-colors',
        open ? 'bg-accent text-accent-foreground' : 'bg-sidebar text-sidebar-foreground hover:text-foreground',
        className,
      )}
    >
      {/* Hamburguesa ⇄ X: tres líneas que se transforman (las de los bordes
          rotan 45° hacia el centro, la del medio se desvanece). */}
      <span aria-hidden="true" className="relative block size-5">
        <span
          className={cn(
            'absolute left-0 top-[2.5px] h-[2px] w-full rounded-full bg-current transition-all duration-300 ease-out',
            open && 'top-[9px] rotate-45',
          )}
        />
        <span
          className={cn(
            'absolute left-0 top-[9px] h-[2px] w-full rounded-full bg-current transition-opacity duration-200',
            open && 'opacity-0',
          )}
        />
        <span
          className={cn(
            'absolute left-0 top-[15.5px] h-[2px] w-full rounded-full bg-current transition-all duration-300 ease-out',
            open && 'top-[9px] -rotate-45',
          )}
        />
      </span>
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
        <nav inert={!open} className="sidebar-nav flex w-12 flex-col gap-2 p-1.5">
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
 * El riel lateral. Siempre cuelga del botón del header que lo monta: el
 * unificado del escritorio (`AppHeader`) o el header de cada módulo
 * (`PageHeader`), a través de la prop `inHeader`. Sin header no hay riel
 * (POS y Caja quedan en pantalla completa; Esc vuelve).
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

  if (!inHeader) return null;

  // El riel siempre cuelga del botón del header que lo monta, debajo de la
  // barra. En el escritorio se ancla al header (left-4); en un módulo, al
  // wrapper relativo que rodea al toggle en el PageHeader.
  return (
    <div className={`absolute top-full z-30 hidden pt-1 md:block ${enEscritorio ? 'left-4' : 'left-0'}`}>
      {riel}
    </div>
  );
}
