import type { ReactNode } from 'react';
import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/**
 * Lista de filas del sistema "Yerba": un solo recuadro, las filas separadas por
 * la línea suave. Para colecciones cortas cuyas filas llevan dos renglones de
 * texto y varias acciones y no entran cómodas en una <Table> (sucursales,
 * sesiones). Las tablas de datos siguen siendo <Table>.
 */
export function RowList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('divide-y divide-border-soft overflow-hidden rounded-md border border-border', className)}>
      {children}
    </div>
  );
}

/**
 * Una fila. `leading` (un <Avatar/>, por ejemplo) gana sobre `icon`. `title` va
 * en `text-sm` como las celdas de tabla; `meta` en `text-chico` apagado.
 */
export function RowListItem({
  icon: IconCmp,
  iconClassName,
  leading,
  title,
  badge,
  meta,
  actions,
  muted,
  className,
}: {
  icon?: Icon;
  iconClassName?: string;
  leading?: ReactNode;
  title: ReactNode;
  badge?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3 px-4 py-3', muted && 'bg-muted/40', className)}>
      {leading ?? (IconCmp && <IconCmp weight="fill" className={cn('size-4 shrink-0 text-muted-foreground', iconClassName)} />)}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{title}</span>
          {badge}
        </div>
        {meta && <p className="mt-0.5 text-chico text-muted-foreground">{meta}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  );
}
