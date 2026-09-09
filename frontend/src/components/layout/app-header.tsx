import { Sparkle } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth-context';
import { usePreguntarLibre } from '@/lib/prefs';
import type { EscritorioSummary } from '@/lib/escritorio';
import { Kbd } from '@/components/ui/kbd';
import { NotificationBell } from '@/components/notification-bell';
import { UserMenu } from '@/components/user-menu';
import { ChecklistToggle } from '@/components/checklist';
import { Sidebar, SidebarToggle } from './sidebar';

/** El Preguntar dentro de la barra (modo fijo): mismo chrome uiverse que el
 *  flotante, pero en línea con los demás botones. La etiqueta aparece a partir
 *  de sm y el atajo de teclado recién en lg, para no apretar la barra. */
function PreguntarHeader({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Preguntar (Ctrl K)"
      title="Preguntar (Ctrl K)"
      className="uiverse-ctl group flex h-10 items-center gap-2 rounded-lg border border-uiverse bg-card/70 px-3 text-chico font-medium text-foreground shadow-uiverse transition-[box-shadow,background-color,border-color] duration-200 hover:bg-card hover:shadow-uiverse-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-offset-2"
    >
      <Sparkle weight="fill" className="size-4 text-primary transition-transform duration-200 group-hover:scale-110" />
      <span className="hidden sm:inline">Preguntar</span>
      <Kbd className="hidden lg:inline-flex">Ctrl K</Kbd>
    </button>
  );
}

/**
 * La barra unificada del escritorio (la arma el shell a lo ancho de la
 * pantalla, fuera del contenedor centrado): riel + logo + nombre a la
 * izquierda, pegado a la esquina; Preguntar, tareas, notificaciones y cuenta a
 * la derecha. Sticky: al scrollear acompaña siempre. El riel lateral cuelga
 * del botón, abajo de la barra (ver `Sidebar inHeader`).
 */
export function AppHeader({ summary, onPreguntar }: { summary: EscritorioSummary | null; onPreguntar: () => void }) {
  const { session } = useAuth();
  const { libre } = usePreguntarLibre();
  if (!session) return null;

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border-soft bg-background/85 px-4 py-2.5 backdrop-blur">
      <Sidebar inHeader />
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <SidebarToggle className="hidden md:grid" />
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
        {!libre && <PreguntarHeader onClick={onPreguntar} />}
        <ChecklistToggle />
        <NotificationBell summary={summary} />
        <UserMenu />
      </div>
    </header>
  );
}