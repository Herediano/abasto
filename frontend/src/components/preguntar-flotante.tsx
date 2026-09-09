import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Sparkle } from '@phosphor-icons/react';
import { createPortal } from 'react-dom';
import { Kbd } from '@/components/ui/kbd';
import { usePreguntarLibre } from '@/lib/prefs';
import { cn } from '@/lib/utils';

const PREGUNTAR_REPOSO_KEY = 'abasto-preguntar-reposo';
const PREGUNTAR_DIM = 48; // size-12
/** La posición se guarda como % del viewport (estable ante resize/zoom) y se
 *  aplica como px absolutos (inmune a reflows: menús, scrollbar, lo que sea).
 *  Al achicar/agrandar la ventana se recalcula de la proporción guardada. */
function pctDePx(px: number, dim: number) {
  return (px / dim) * 100;
}
function pxDePct(pct: number, dim: number) {
  return (pct / 100) * dim;
}
const reposoInicial = (): { x: number; y: number } => {
  try {
    const raw = localStorage.getItem(PREGUNTAR_REPOSO_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (
        typeof p.x === 'number' &&
        typeof p.y === 'number' &&
        p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100
      ) return p;
    }
  } catch {
    // localStorage roto o modo privado: posición por defecto.
  }
  return { x: 49, y: 1 };
};

/**
 * El Preguntar en modo libre (Ajustes → Preferencias): una chispa flotante que
 * se arrastra a cualquier parte de la app sosteniendo el click, y su posición
 * queda guardada en localStorage. Lleva el chrome uiverse del sistema (borde
 * cian + sombra dura); en reposo apoya la sombra de 3 px y al acercar el mouse
 * se despega mientras se despliega una etiqueta con el atajo (Ctrl K).
 */
export function PreguntarFlotante({ onClick }: { onClick: () => void }) {
  const { libre } = usePreguntarLibre();
  // Guardamos % (para no perder la proporción al redimensionar) pero el estado
  // vivo son px absolutos: solo cambian en drag y en resize/zoom. Así, ningún
  // reflow del layout (menús desplegados, scrollbar, añadir nodos al body)
  // re-ancla el botón contra un ancho disponible que se movió.
  const pctInicial = libre ? reposoInicial() : { x: 49, y: 1 };
  const [reposo, setReposo] = useState(() => {
    const pct = pctInicial;
    return {
      x: Math.min(Math.max(pxDePct(pct.x, window.innerWidth), 0), window.innerWidth - PREGUNTAR_DIM),
      y: Math.min(Math.max(pxDePct(pct.y, window.innerHeight), 0), window.innerHeight - PREGUNTAR_DIM),
    };
  });
  const prevVp = useRef({ w: window.innerWidth, h: window.innerHeight });
  // Arrastre con el puntero: la diferencia entre el click y el topleft del
  // botón se guarda al bajar, y de ahí en más la posición sigue al mouse.
  const dragRef = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    const onResize = () => {
      const prev = prevVp.current;
      const next = { w: window.innerWidth, h: window.innerHeight };
      prevVp.current = next;
      if (!prev.w || !prev.h) return;
      setReposo(r => ({
        x: Math.min(Math.max((r.x / prev.w) * next.w, 0), next.w - PREGUNTAR_DIM),
        y: Math.min(Math.max((r.y / prev.h) * next.h, 0), next.h - PREGUNTAR_DIM),
      }));
    };
    const onVp = () => onResize();
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onVp);
    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onVp);
    };
  }, []);

  useEffect(() => {
    if (!libre) return;
    try {
      localStorage.setItem(
        PREGUNTAR_REPOSO_KEY,
        JSON.stringify({
          x: pctDePx(reposo.x, window.innerWidth),
          y: pctDePx(reposo.y, window.innerHeight),
        }),
      );
    } catch {
      // Modo privado: la posición vale para esta sesión y nada más.
    }
  }, [libre, reposo]);

  const style: CSSProperties = {
    left: reposo.x,
    top: reposo.y,
  };
  const pillIzquierda = reposo.x > window.innerWidth / 2;

  return createPortal(
    <button
      type="button"
      onClick={e => {
        // Click real (sin arrastre) → abre el buscador.
        if (movedRef.current) {
          movedRef.current = false;
          return;
        }
        onClick();
      }}
      onPointerDown={e => {
        if (e.button !== 0 || !libre) return;
        const rect = e.currentTarget.getBoundingClientRect();
        dragRef.current = { id: e.pointerId, dx: e.clientX - rect.left, dy: e.clientY - rect.top };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={e => {
        const d = dragRef.current;
        if (!d || d.id !== e.pointerId) return;
        if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) movedRef.current = true;
        // El botón nunca sale de la ventana: se clampa al rango que lo deja
        // adentro (no puede ir más allá de 100% - su propio ancho).
        const pxX = Math.min(Math.max(e.clientX - d.dx, 0), window.innerWidth - PREGUNTAR_DIM);
        const pxY = Math.min(Math.max(e.clientY - d.dy, 0), window.innerHeight - PREGUNTAR_DIM);
        setReposo({ x: pxX, y: pxY });
      }}
      onPointerUp={() => {
        dragRef.current = null;
      }}
      onPointerCancel={() => {
        dragRef.current = null;
      }}
      aria-label="Preguntar (Ctrl K)"
      title="Preguntar (Ctrl K)"
      style={style}
      className={cn(
        `group fixed z-40 flex size-12 items-center justify-center ${libre ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`,
        'rounded-[5px] border backdrop-blur-sm transition-[box-shadow,background-color,border-color,transform] duration-200 ease-out',
        'border-uiverse bg-card/70 shadow-[3px_3px_2px_1px_rgba(128,212,238,0.38)] text-primary',
        'hover:border-uiverse hover:bg-card hover:shadow-[6px_6px_2px_1px_rgba(128,212,238,0.45)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-offset-2',
      )}
    >
      <Sparkle weight="fill" className="size-5 transition-[transform,color] duration-200 group-hover:scale-110" />
      <span
        className={cn(
          'pointer-events-none absolute flex items-center gap-1.5 whitespace-nowrap rounded-[5px] border border-border bg-card px-2 py-1 text-chico font-medium text-foreground opacity-0 shadow-float transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100',
          pillIzquierda ? 'right-full mr-2' : 'left-full ml-2',
        )}
      >
        Preguntar <Kbd>Ctrl K</Kbd>
      </span>
    </button>,
    document.body,
  );
}