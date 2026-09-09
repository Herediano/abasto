import { useAuth } from '@/lib/auth-context';
import type { EscritorioSummary } from '@/lib/escritorio';
import { NotificationBell } from '@/components/notification-bell';
import { UserMenu } from '@/components/user-menu';
import { ChecklistToggle } from '@/components/checklist';
import { Sidebar, SidebarToggle } from './sidebar';

/**
 * La barra unificada del escritorio (la arma el shell a lo ancho de la
 * pantalla, fuera del contenedor centrado): riel + logo + nombre a la
 * izquierda, pegado a la esquina; tareas, notificaciones y cuenta a la
 * derecha. Sticky: al scrollear acompaña siempre. El riel lateral cuelga del
 * botón, abajo de la barra (ver `Sidebar inHeader`). El Preguntar no vive acá:
 * flota arriba al centro, en su modo fijo y en el libre.
 */
export function AppHeader({ summary }: { summary: EscritorioSummary | null }) {
  const { session } = useAuth();
  if (!session) return null;

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border-soft bg-background/85 px-4 py-2.5 backdrop-blur">
      <Sidebar inHeader />
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <SidebarToggle className="hidden md:grid size-10! [&_svg]:size-5" />
        {session.tenant.logo ? (
          <img
            src={session.tenant.logo}
            alt={session.tenant.name}
            className="uiverse-ctl uiverse-ctl--flat size-11 shrink-0 rounded-md border border-border bg-card object-contain p-1"
          />
        ) : (
          <span className="uiverse-ctl uiverse-ctl--flat type-display grid size-11 shrink-0 place-items-center rounded-md bg-primary text-h3 text-primary-foreground">
            {session.tenant.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <p className="min-w-0 truncate font-display text-grande font-semibold">{session.tenant.name}</p>
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <ChecklistToggle />
        <NotificationBell summary={summary} />
        <UserMenu />
      </div>
    </header>
  );
}