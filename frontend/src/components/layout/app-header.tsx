import { Sparkle } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth-context';
import type { EscritorioSummary } from '@/lib/escritorio';
import { NotificationBell } from '@/components/notification-bell';
import { UserMenu } from '@/components/user-menu';
import { ChecklistToggle } from '@/components/checklist';
import { AbrirMostrador } from '@/components/abrir-mostrador';
import { usePreguntarLibre } from '@/lib/prefs';
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
  const { session, can } = useAuth();
  const abrirPalette = usePalette();
  const { libre } = usePreguntarLibre();
  if (!session) return null;

  const canCaja = can('caja.operar');

return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      {/* Grilla de 3 columnas iguales: así el Preguntar queda centrado en el
          espacio que sobra entre los dos grupos de botones, sin que un
          `absolute` de centrado fijo pueda pisar al Mostrador cuando la
          ventana es angosta (ver docs/diseno.md). */}
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-x-4 gap-y-2 px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <UserMenu />
          <NotificationBell summary={summary} />
          <ChecklistToggle />
        </div>
        {/* El Preguntar fijo: el mismo botón cuadrado (48px, border 5px) que en
            modo libre flota arrastrable. */}
        {!libre ? (
          <button
            type="button"
            onClick={abrirPalette}
            aria-label="Preguntar (Ctrl K)"
            title="Preguntar (Ctrl K)"
            className="group flex size-12 cursor-pointer items-center justify-center rounded-full text-[var(--ab-preguntar)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-offset-2"
          >
            <Sparkle
              weight="fill"
              className="size-6 transition-transform duration-200 group-hover:scale-110"
            />
          </button>
        ) : <span />}
        <div className="flex justify-end">
          {canCaja && <AbrirMostrador summary={summary} />}
        </div>
      </div>
    </header>
  );
}