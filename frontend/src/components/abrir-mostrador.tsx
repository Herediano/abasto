import { useEffect, useRef, useState } from 'react';
import { CashRegister } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { hora as fmtHora } from '@/lib/format';
import type { EscritorioSummary } from '@/lib/escritorio';
import { prefetchRoute } from '@/lib/lazy-pages';
import { cn } from '@/lib/utils';

/**
 * Puntito que parpadea: el estado se alterna en React (no CSS), forzando el
 * re-render cada 500ms — el estilo inline cambia de opacidad, así ninguna
 * regla de animación del sistema lo puede frenar.
 */
function BlinkDot() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn(v => !v), 500);
    return () => clearInterval(t);
  }, []);
  return (
    <span
      className="inline-flex size-2 shrink-0 self-center rounded-full bg-white"
      style={{ opacity: on ? 1 : 0.15, transition: 'opacity 0.45s ease' }}
      aria-label="Caja abierta"
    />
  );
}

/**
 * Texto que corre de derecha a izquierda (marquee), arrancando visible y
 * alineado a la izquierda (sin sangría). Cada copia lleva su propio espacio al
 * final (padding, no margin), así el bloque duplicado mide EXACTAMENTE 2x una
 * copia: al trasladarlo -50% la segunda copia queda clavada donde arrancó la
 * primera. Al no medir el ancho del texto, el empalme cierra perfecto aunque
 * la fuente tarde en cargar (que era lo que causaba el "flick"). Usa
 * element.animate() (Web Animations API): todo en JS, no CSS.
 */
function Marquee({ text, className }: { text: string; className?: string }) {
  const stripRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    // Mitad del bloque duplicado = una copia exacta (letra + gap), que es
    // justo el desplazamiento que cierra el bucle sin salto. -50% no depende
    // de medir nada: siempre alinea, con la fuente ya cargada o no.
    const anim = strip.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-50%)' },
      ],
      { duration: 9000, iterations: Infinity, easing: 'linear' },
    );
    return () => anim.cancel();
  }, [text]);

  return (
    <span className={cn('block w-full overflow-hidden whitespace-nowrap', className)}>
      <span ref={stripRef} className="inline-block" style={{ willChange: 'transform' }}>
        <span className="inline-block pr-6">{text}</span>
        <span aria-hidden="true" className="inline-block pr-6">{text}</span>
      </span>
    </span>
  );
}

/** El botón "Mostrador": abre la caja. Vive en la barra del escritorio. */
export function AbrirMostrador({ summary, className }: { summary: EscritorioSummary | null; className?: string }) {
  const navigate = useNavigate();
  const caja = summary?.caja;
  const abierta = caja?.abierta ?? false;
  const hora = caja?.desde ? fmtHora(caja.desde) : '';
  const tickets = caja?.tickets ?? 0;
  const efectivo = caja?.efectivo != null ? ` · ${caja.efectivo.toLocaleString('es-AR', { maximumFractionDigits: 0 })} en efectivo` : '';
  return (
    <button
      type="button"
      onClick={() => navigate('/ventas')}
      onMouseEnter={() => prefetchRoute('/ventas')}
      onFocus={() => prefetchRoute('/ventas')}
      className={cn(
        'group relative flex max-w-[180px] flex-col items-start gap-0.5 overflow-hidden rounded-lg px-3 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-offset-2 uiverse-ctl',
        abierta ? 'mostrador-open' : 'mostrador-closed',
        className,
      )}
    >
      <span className="flex w-full items-center gap-1.5">
        <span className="mostrador__chip flex size-6 shrink-0 items-center justify-center rounded-md">
          <CashRegister weight="fill" className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-chico font-bold">
            Mostrador
            {abierta && <BlinkDot />}
          </span>
          <Marquee
            className="text-micro leading-snug opacity-80"
            text={abierta ? `Abierta ${hora} · ${tickets} ${tickets === 1 ? 'ticket' : 'tickets'}${efectivo}` : 'Sin turno abierto'}
          />
        </span>
      </span>
    </button>
  );
}
