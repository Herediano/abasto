import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

/**
 * El molde de lo que todavía no llegó. No es un spinner ni una animación de
 * entrada (docs/diseno.md, «Movimiento»): es la silueta del contenido, quieta
 * salvo un pulso lento de opacidad —el mismo «pulso» que la regla global de
 * `prefers-reduced-motion` ya frena—. El color es la línea del sistema, no un
 * gris nuevo.
 */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-border', className)} style={style} />;
}

/**
 * Una tabla que se está cargando: una barra de herramientas y unas cuantas
 * filas, las últimas cada vez más tenues para que la lista se desvanezca en vez
 * de cortarse de golpe. Reemplaza al spinner debajo de la cabecera de un módulo.
 */
export function TableSkeleton({ rows = 7, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2.5', className)} role="status" aria-label="Cargando">
      <Skeleton className="h-9 w-full rounded-lg" />
      <div className="mt-1 flex flex-col gap-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          // La opacidad va en el contenedor, no en la barra: el pulso anima la
          // opacidad de la barra y pisaría este valor si estuviera en el mismo nodo.
          <div key={i} style={{ opacity: Math.max(0.2, 1 - i * 0.12) }}>
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * El módulo entero mientras baja su chunk: la silueta de la cabecera pegajosa
 * (chip + título + acciones) y, debajo, la tabla. Es el fallback de `Suspense`
 * en el marco —ahí todavía no hay `PageHeader` real que mostrar—. Con el
 * prefetch del escritorio casi nunca se ve más que un parpadeo.
 */
export function ModuleSkeleton() {
  return (
    <div role="status" aria-label="Cargando módulo" className="flex flex-col gap-6 pt-1">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 shrink-0" />
        <Skeleton className="h-6 w-44" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
      <TableSkeleton rows={8} />
    </div>
  );
}
