import type { ReactNode } from 'react';
import { ArrowLeft, Rows, Storefront } from '@phosphor-icons/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { moduleForPath } from '@/lib/modules';
import { useAuth } from '@/lib/auth-context';
import { useDensity } from '@/lib/prefs';

/**
 * Cabecera de un módulo. Se pega arriba: título y acciones siguen a la vista al
 * scrollear una tabla larga. El molde es el mismo para todos los módulos (ver
 * docs/diseno.md): "← Escritorio" + chip del ícono + rastro + título a la
 * izquierda; Filtros / Exportar / acción principal a la derecha (via `actions`).
 *
 * El bloque chip+título lleva `view-transition-name: module-hero` para que la
 * tarjeta del escritorio se despliegue en él.
 */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const mod = moduleForPath(pathname);
  const { density, setDensity } = useDensity();
  const b = session?.user;
  const otraSucursal = b?.branch && b?.homeBranch && b.branch.id !== b.homeBranch.id ? b.branch.name : null;
  const compacta = density === 'compacta';

  return (
    <div className="sticky top-0 z-20 -mx-6 mb-1 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-background/85 px-6 py-3 backdrop-blur">
      <button
        type="button"
        onClick={() => navigate('/', { viewTransition: true })}
        className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Escritorio
        <kbd className="ml-0.5 rounded border border-border px-1 font-mono text-[10px] font-normal text-placeholder">Esc</kbd>
      </button>

      <div className="flex items-center gap-2.5" style={{ viewTransitionName: 'module-hero' }}>
        {mod && (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-accent text-accent-foreground">
            <mod.Icon weight="fill" className="size-4" />
          </div>
        )}
        <div className="leading-tight">
          {mod && <p className="text-[11px] font-medium text-placeholder">{mod.crumb}</p>}
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {otraSucursal && (
          <span className="flex items-center gap-1 rounded-md border border-primary bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground">
            <Storefront weight="fill" className="size-3" /> {otraSucursal}
          </span>
        )}
        {actions}
        <button
          type="button"
          onClick={() => setDensity(compacta ? 'comoda' : 'compacta')}
          aria-label={compacta ? 'Filas más cómodas' : 'Filas más compactas'}
          title={compacta ? 'Filas más cómodas' : 'Filas más compactas'}
          className="grid size-8 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        >
          <Rows weight={compacta ? 'fill' : 'regular'} className="size-4" />
        </button>
      </div>
    </div>
  );
}
