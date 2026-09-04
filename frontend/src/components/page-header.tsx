import type { ReactNode } from 'react';

/**
 * Encabezado de página. Se pega arriba del área de trabajo: el título y las
 * acciones siguen a la vista mientras se scrollea una tabla de 300 páginas.
 * Los márgenes negativos lo llevan hasta los bordes del contenedor para que la
 * línea inferior corte todo el ancho.
 */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="sticky top-0 z-20 -mx-6 mb-1 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-background/85 px-6 py-4 backdrop-blur">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
