import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Bloque de sección dentro de un módulo: título, bajada opcional y contenido,
 * todos con el mismo molde. Se usa cuando una pantalla tiene varios grupos
 * (Ajustes, Precios) — el encabezado va en `grande` (16px), no en `h2` de
 * módulo, que es el título de la pantalla entera.
 */
export function Section({
  title,
  description,
  actions,
  className,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn('rounded-lg border border-border bg-card p-5', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-grande font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-chico text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
