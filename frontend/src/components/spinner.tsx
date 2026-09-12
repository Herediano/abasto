import { CircleNotch } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { TableSkeleton } from '@/components/skeleton';

/** El único spinner: en un botón mientras se guarda («Guardar cambios» + rueda). */
export function Spinner({ className }: { className?: string }) {
  return <CircleNotch className={cn('size-4 animate-spin text-primary', className)} />;
}

/**
 * El cuerpo de un módulo mientras carga sus datos. Ya no es una rueda girando en
 * el vacío: es la silueta de la tabla que viene (ver `TableSkeleton`). Se usa
 * debajo de la cabecera y los filtros, que ya están puestos.
 */
export function PageSpinner({ label, className }: { label?: string; className?: string } = {}) {
  return (
    <div
      className={cn('flex min-h-[360px] flex-col gap-3 pt-1', className)}
      role="status"
      aria-live="polite"
    >
      {label && <p className="text-chico font-medium text-muted-foreground">{label}</p>}
      <TableSkeleton rows={7} />
    </div>
  );
}

/**
 * El arranque en frío de la app (fallback de `Suspense` de más arriba, antes de
 * que exista el marco). La marca sola, con el `.ai` respirando, y una línea de
 * avance fina y tranquila debajo —sin la barra que corría de antes—.
 */
export function FullPageLoading({ label }: { label?: string } = {}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-background p-6">
      <div className="type-display text-h1 tracking-tight text-foreground">
        abasto<span className="animate-pulse text-primary">.ai</span>
      </div>
      <div className="h-0.5 w-24 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-2/5 rounded-full bg-primary/70 animate-loader-sweep" />
      </div>
      {label && <p className="text-micro font-medium text-muted-foreground">{label}</p>}
    </div>
  );
}
