import { Sparkle } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth-context';
import type { EscritorioSummary } from '@/lib/escritorio';
import { NotificationBell } from '@/components/notification-bell';
import { UserMenu } from '@/components/user-menu';
import { ChecklistToggle } from '@/components/checklist';
import { usePreguntarLibre } from '@/lib/prefs';
import { Link } from 'react-router-dom';
import { usePalette } from './escritorio-shell';

/**
 * La barra del escritorio. El fondo va de borde a borde; el contenido usa el
 * mismo molde que los headers de módulo (contenedor centrado con ancho propio
 * de cada pantalla, px-6 py-3, los mismos gaps) para que al navegar
 * escritorio ↔ módulo no haya saltos de posición/altura. Sticky: al scrollear acompaña siempre. La barra lateral
 * (Sidebar) vive en los módulos; el escritorio no la tiene. El Preguntar vive
 * acá salvo que esté activado el modo libre (Ajustes → Preferencias), donde
 * pasa a flotar arrastrable en cualquier pantalla.
 */
export function AppHeader({ summary }: { summary: EscritorioSummary | null }) {
  const { session } = useAuth();
  const abrirPalette = usePalette();
  const { libre } = usePreguntarLibre();
  if (!session) return null;

return (
    <header className="relative sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
        <Link
          to="/ajustes"
          title="Ajustes de la empresa"
          aria-label={`Ajustes de la empresa: ${session.tenant.name}`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-md transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-offset-2"
        >
          {session.tenant.logo ? (
            <img
              src={session.tenant.logo}
              alt={session.tenant.name}
              className="size-10 shrink-0 rounded-md border border-border bg-card object-contain p-1"
            />
          ) : (
            <span className="type-display grid size-10 shrink-0 place-items-center rounded-md bg-primary text-h3 text-primary-foreground">
              {session.tenant.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <p className="min-w-0 truncate font-display text-grande font-semibold">{session.tenant.name}</p>
        </Link>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <ChecklistToggle />
          <NotificationBell summary={summary} />
          <UserMenu />
        </div>
      </div>
      {/* El Preguntar fijo: el mismo botón cuadrado (48px, border 5px) que en
          modo libre flota arrastrable. Acá vive siempre en el centro exacto
          del header. */}
      {!libre && (
        <button
          type="button"
          onClick={abrirPalette}
          aria-label="Preguntar (Ctrl K)"
          title="Preguntar (Ctrl K)"
          className="uiverse-ctl absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[5px] border border-uiverse bg-card/70 text-primary shadow-[3px_3px_2px_1px_rgba(128,212,238,0.38)] transition-[box-shadow,background-color,border-color] duration-200 ease-out hover:border-uiverse hover:bg-card hover:shadow-[6px_6px_2px_1px_rgba(128,212,238,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-offset-2"
        >
          <Sparkle weight="fill" className="size-5" />
        </button>
      )}
    </header>
  );
}