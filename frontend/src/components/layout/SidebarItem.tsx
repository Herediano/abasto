import { type CSSProperties } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { type Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface SidebarItemProps {
  to: string;
  icon: Icon;
  label: string;
  /** El matiz del módulo (el mismo que su tarjeta en el escritorio). */
  hue: string;
  /** Posición en la lista, para la cascada de entrada. */
  index?: number;
}

/**
 * Un salto del riel. En reposo es solo el ícono, teñido con el matiz de su
 * módulo —el mismo color que su tarjeta en el escritorio, para reconocerlo sin
 * leer (contorno inactivo, relleno activo)—: el ítem está recortado a `max-w-9`
 * y el nombre queda afuera. Al pasar el mouse —o al enfocar con teclado— el
 * ítem se expande a la derecha (`max-width` hasta 14rem), se levanta con
 * `z-index` y desborda el riel sin empujar a los otros. El activo suma un
 * lavado del matiz y una franja al costado, igual que en el escritorio.
 */
export function SidebarItem({ to, icon: Icon, label, hue, index = 0 }: SidebarItemProps) {
  const { pathname } = useLocation();
  const active = pathname === to || pathname.startsWith(to + '/');

  const style = { '--i': index } as CSSProperties;
  if (active) style.background = `color-mix(in srgb, ${hue} 14%, transparent)`;

  return (
    <NavLink
      to={to}
      aria-current={active ? 'page' : undefined}
      style={style}
      className={cn(
        'sidebar-item group/item relative flex h-12 w-full items-center justify-center rounded-md',
        'hover:bg-sidebar-hover focus-visible:bg-sidebar-hover',
        active
          ? 'text-foreground'
          : 'text-sidebar-foreground hover:text-foreground focus-visible:text-foreground',
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-0 w-0.5 rounded-full"
          style={{ background: hue }}
        />
      )}
      <Icon className="size-7 shrink-0" weight={active ? 'fill' : 'regular'} style={{ color: hue }} />
      <span className="pointer-events-none absolute left-[calc(100%+0.5rem)] top-1/2 z-20 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-card px-2.5 py-1 text-chico text-foreground shadow-float opacity-0 transition-opacity duration-150 group-hover/item:opacity-100 group-focus-visible/item:opacity-100">
        {label}
      </span>
    </NavLink>
  );
}
