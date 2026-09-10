import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { PageHeader } from '@/components/page-header';
import { prefetchRoute } from '@/lib/lazy-pages';
import { cn } from '@/lib/utils';

/**
 * El molde del cuerpo de un módulo (ver docs/diseno.md, «El módulo»). Tres
 * partes fijas, siempre en el mismo orden:
 *
 *   1. la cabecera pegajosa — `PageHeader` (trae adentro el botón ☰ del riel)
 *   2. la línea de resumen — `summary`, opcional
 *   3. las vistas — una fila de pestañas y, debajo, una sola vista (`children`)
 *
 * Las pestañas pueden ser de estado (`views` + `view` + `onView`, la vista se
 * cambia sin navegar) o de ruta (`views` con `to`, cada vista es su propia URL,
 * como Stock). Una pantalla con una sola vista no pasa `views` y no se dibuja
 * la fila.
 */
export type ModuleView = {
  key: string;
  label: string;
  /** Si la vista es su propia ruta, en vez de un cambio de estado. */
  to?: string;
  end?: boolean;
};

export function ModuleScreen({
  title,
  actions,
  summary,
  views,
  view,
  onView,
  children,
}: {
  title: string;
  actions?: ReactNode;
  summary?: ReactNode;
  views?: ModuleView[];
  view?: string;
  onView?: (key: string) => void;
  children: ReactNode;
}) {
  const hayVistas = Boolean(views && views.length > 1);
  const tabClass = (activo: boolean) =>
    cn(
      'rounded-md px-3 py-1.5 text-chico font-semibold transition-colors',
      activo
        ? 'bg-accent text-accent-foreground'
        : 'text-muted-foreground hover:bg-card hover:text-foreground',
    );

  return (
    <>
      <PageHeader title={title} actions={actions} />

      {(summary || hayVistas) && (
        <div className="flex flex-col gap-3 border-b border-border-soft pb-3">
          {summary && <div className="text-chico">{summary}</div>}
          {hayVistas && (
            <div className="flex flex-wrap gap-1">
              {views!.map(v =>
                v.to ? (
                  <NavLink
                    key={v.key}
                    to={v.to}
                    end={v.end}
                    onMouseEnter={() => prefetchRoute(v.to!)}
                    onFocus={() => prefetchRoute(v.to!)}
                    className={({ isActive }) => tabClass(isActive)}
                  >
                    {v.label}
                  </NavLink>
                ) : (
                  <button
                    key={v.key}
                    type="button"
                    aria-pressed={v.key === view}
                    onClick={() => onView?.(v.key)}
                    className={tabClass(v.key === view)}
                  >
                    {v.label}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      )}

      {children}
    </>
  );
}

/**
 * Una sección dentro de una vista (molde C, «trabajo»): título h3 + bajada
 * opcional + acciones, separada de la anterior por una línea fina y aire —
 * SIN recuadro de tarjeta (ver docs/diseno.md, «El módulo»). Se apilan como
 * hijas directas de un contenedor; la primera no lleva línea arriba.
 */
export function ModuleSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'flex flex-col gap-4 border-t border-border-soft pt-6 [&:first-child]:border-t-0 [&:first-child]:pt-0',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-h3 font-semibold tracking-tight">{title}</h3>
          {description && (
            <p className="mt-1 max-w-[65ch] text-chico text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/**
 * La línea de resumen del molde: 2 a 4 cifras clave en texto chico, cada una
 * `etiqueta valor`. Monocroma salvo que una cifra sea una alerta (`tone`).
 * Sin puntos medios de separación —el aire alcanza—.
 */
export function SummaryLine({
  items,
}: {
  items: { label: string; value: string; tone?: 'warn' | 'bad' }[];
}) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
      {items.map((it, i) => (
        <span key={i} className="text-muted-foreground">
          {it.label}{' '}
          <span
            className={cn(
              'font-semibold tabular',
              it.tone === 'warn'
                ? 'text-warning'
                : it.tone === 'bad'
                  ? 'text-destructive'
                  : 'text-foreground',
            )}
          >
            {it.value}
          </span>
        </span>
      ))}
    </p>
  );
}
