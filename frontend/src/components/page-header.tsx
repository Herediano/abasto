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
    <div className="module-header relative sticky top-0 z-20 mb-1 border-b border-border bg-background/85 backdrop-blur">
      {/* El botón que abre el riel: absoluto contra el borde IZQUIERDO REAL de
          la pantalla (ancla en `.module-header`, que va a todo el ancho), como
          si fuera la cabecera de una barra lateral. Fuera del flujo: moverlo no
          corre nada del resto. En Ajustes no va. */}
      {pathname !== '/ajustes' && (
        <div className="absolute left-3 top-3 z-10 hidden md:block">
          <SidebarToggle />
          <Sidebar inHeader />
        </div>
      )}
    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
      {/* El contenido del header queda alineado con el cuerpo (5xl): sangría
          [128px] a cada lado. El toggle no está en este bloque ni en el flujo. */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 pl-[128px] pr-[128px] max-md:pl-0 max-md:pr-0">

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
