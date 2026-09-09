import type { ReactNode } from 'react';
import { ArrowLeft, Storefront } from '@phosphor-icons/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { moduleForPath, backTargetFor } from '@/lib/modules';
import { Kbd } from '@/components/ui/kbd';
import { useAuth } from '@/lib/auth-context';
import { Sidebar, SidebarToggle } from '@/components/layout/sidebar';

/**
 * Cabecera de un módulo. Se pega arriba: título y acciones siguen a la vista al
 * scrollear una tabla larga. El molde es el mismo para todos los módulos (ver
 * docs/diseno.md): "← nivel anterior" + chip del ícono + rastro + título a la
 * izquierda; Filtros / Exportar / acción principal a la derecha (via `actions`).
 *
 * El bloque chip+título lleva `view-transition-name: module-hero` para que la
 * tarjeta del escritorio se despliegue en él.
 */
export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const mod = moduleForPath(pathname);
  const back = backTargetFor(pathname);
  const b = session?.user;
  const otraSucursal = b?.branch && b?.homeBranch && b.branch.id !== b.homeBranch.id ? b.branch.name : null;

  return (
    <div className="module-header sticky top-0 z-20 mb-1 border-b border-border bg-background/85 backdrop-blur">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
      {/* El botón de la barra lateral vive en el header del módulo, con el mismo
          tamaño y alineación que en el escritorio; el riel cuelga de él. En
          Ajustes no hay barra lateral. */}
      {pathname !== '/ajustes' && (
        <div className="relative">
          <SidebarToggle className="hidden md:grid" />
          <Sidebar inHeader />
        </div>
      )}

      {/* El contenido del header queda acotado al ancho del body (5xl): por la
          izquierda arranca en su margen (sangría [64px] = toggle 48px + gap
          16px, o [128px] en Ajustes sin toggle) y por la derecha termina en el
          mismo punto con el mismo offset (pr-[128px]). El toggle de la barra
          lateral queda en el borde del header, fuera de este bloque. */}
      <div className={`flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 max-md:pl-0 max-md:pr-0 ${pathname === '/ajustes' ? 'pl-[128px]' : 'pl-16'} pr-[128px]`}>

      <button
        type="button"
        onClick={() => navigate(back.path, { viewTransition: true })}
        className="uiverse-ctl flex h-10 items-center gap-1.5 rounded-md border border-border px-2.5 text-chico font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {back.label}
        <Kbd className="ml-0.5">Esc</Kbd>
      </button>

      <div className="flex min-w-0 items-center gap-2.5" style={{ viewTransitionName: 'module-hero' }}>
        {mod && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <mod.Icon weight="fill" className="size-5" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">
            <span className="truncate">{title}</span>
          </h1>
        </div>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {otraSucursal && (
          <span className="flex items-center gap-1 rounded-md border border-transparent bg-warning/10 px-2 py-0.5 text-micro font-semibold text-warning">
            <Storefront weight="fill" className="size-3" /> {otraSucursal}
          </span>
        )}
        {actions}
      </div>
      </div>
    </div>
  </div>
);
}
