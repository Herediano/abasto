import { useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent as ReactDragEvent, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { CashRegister, DotsSixVertical, EyeSlash, Plus, Sparkle, type Icon } from '@phosphor-icons/react';
import { Link, useNavigate } from 'react-router-dom';
import { BranchSwitcher } from '@/components/branch-switcher';
import { NotificationBell } from '@/components/notification-bell';
import { UserMenu } from '@/components/user-menu';
import { usePalette } from '@/components/layout/escritorio-shell';
import { ModuleMotif, gridModules, hueFor, type ModuleDef } from '@/lib/modules';
import { Kbd } from '@/components/ui/kbd';
import { api } from '@/lib/api';
import { hora as fmtHora } from '@/lib/format';
import { compact, statFor, type EscritorioSummary, type TileBar } from '@/lib/escritorio';
import { useAuth } from '@/lib/auth-context';
import { setActiveBranch } from '@/lib/branch';
import { cn } from '@/lib/utils';

const CONFIG_KEY = 'abasto-escritorio';

/** Grilla fija de columnas; sin presets de tamaño. Cada tarjeta se agranda o
 *  achica estirando sus bordes (span de columnas y filas) y el tablero fluye
 *  denso para no dejar agujeros. */
const GRID_COLS = 5;
const GAP = 12; // gap-3
const ROW_H = 168; // gridAutoRows
const MAX_ROWS = 4;

type TileSpan = { w: number; h: number };

/** Una tarjeta del tablero: posición explícita (col, row en 0..) y tamaño en
 *  celdas. Nada de flujo automático: cada tarjeta sabe dónde vive, así mover,
 *  estirar y reacomodar es aritmética pura y determinista. */
type TilePos = { key: string; col: number; row: number; w: number; h: number };

/** Mayúscula inicial y nada más: el renglón de contexto ya viene en minúscula. */
const cap = (s: string) => (s ? s.charAt(0).toLocaleUpperCase('es-AR') + s.slice(1) : s);

/** El saludo según la hora: mañana, tarde o noche. */
function saludo(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Buen día';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Minimapa de tendencia de la tarjeta de Ventas: los últimos 7
 *  días en barras. Hoy a pleno, el resto apagado; sin ejes ni etiquetas — el
 *  número grande ya cuenta el cuánto, esto solo la forma. */
function MiniBars({ bars, hue }: { bars: TileBar[]; hue: string }) {
  const max = Math.max(...bars.map(b => b.value), 1);
  return (
    <div role="img" aria-label="Ventas de los últimos siete días" className="mt-2 flex items-end gap-1">
      {bars.map((b, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t-[3px]"
            style={{
              height: b.value > 0 ? `${Math.max(12, (b.value / max) * 48)}px` : '4px',
              background: hue,
              opacity: b.hoy ? 1 : 0.45,
            }}
            title={b.value > 0 ? compact(b.value) : undefined}
          />
          <span className="text-micro leading-none text-placeholder">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

/** El gráfico de facturación de la tarjeta de Ventas estirada (2+ de ancho):
 *  los mismos 7 días de la minimapa, pero con la serie real — barras con el
 *  monto de cada día, etiquetas de día de la semana y el valor grande al pasar
 *  el mouse. Sin leyendas ni ejes: la tarjeta ya dice el cuánto total. */
function FacturacionChart({ bars, hue }: { bars: TileBar[]; hue: string }) {
  const max = Math.max(...bars.map(b => b.value), 1);
  const hoy = bars.findIndex(b => b.hoy);
  return (
    <div role="img" aria-label="Facturación de los últimos siete días" className="mt-2 flex items-end gap-2">
      {bars.map((b, i) => {
        const pct = (b.value / max) * 100;
        return (
          <div key={i} className="group/bar flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="flex h-[72px] w-full items-end">
              <div
                className="w-full rounded-t-[3px] transition-[height] duration-200"
                style={{
                  height: b.value > 0 ? `${Math.max(6, pct)}%` : '4px',
                  background: hue,
                  opacity: b.hoy ? 1 : 0.45,
                }}
                title={b.value > 0 ? `${b.label}: ${compact(b.value)}` : undefined}
              />
            </div>
            <span className="text-micro leading-none text-placeholder">{b.label}</span>
            <span
              className={cn(
                'text-micro leading-none tabular',
                i === hoy ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}
            >
              {b.value > 0 ? compact(b.value).replace('$ ', '') : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * La caja no es una tarjeta: es un modo de trabajo (pantalla completa, el mundo
 * del cajero). Es un botón compacto, alineado a la izquierda arriba del grid,
 * con borde y superficie neutra y DOS barras de color (una por lado). El cuerpo
 * queda neutro para que el texto contraste; el color es solo estado: las BARRAS
 * —verde si el turno está
 * abierto, rojo si no— y un PUNTO VERDE parpadea en la etiqueta mientras un
 * turno está abierto. Lleva lo que el cajero quiere saber sin entrar: desde qué
 * hora, cuántos tickets y cuánto efectivo hay.
 */
function AbrirMostrador({ summary }: { summary: EscritorioSummary | null }) {
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
      style={{ ['--ab-edge' as string]: abierta ? 'var(--color-success)' : 'var(--color-destructive)' }}
      className="group relative flex flex-col items-start gap-1 overflow-hidden rounded-lg border border-border bg-card px-6 py-2.5 text-left transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-offset-2"
    >
      <span
        className="pointer-events-none absolute inset-y-0 left-0 w-1.5"
        style={{ background: 'var(--ab-edge)' }}
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute inset-y-0 right-0 w-1.5"
        style={{ background: 'var(--ab-edge)' }}
        aria-hidden="true"
      />
      <span className="flex items-center gap-2 text-sm font-bold text-foreground">
        <CashRegister weight="fill" className="size-4" />
        Abrir Mostrador
        {abierta && (
          <span className="relative ml-1 flex size-2" aria-label="Caja abierta">
            <span className="absolute inline-flex size-2 animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
        )}
      </span>
      <span className="text-micro leading-snug text-muted-foreground">
        {abierta ? `Abierta ${hora} · ${tickets} ${tickets === 1 ? 'ticket' : 'tickets'}${efectivo}` : 'Sin turno abierto'}
      </span>
    </button>
  );
}

/**
 * Configurar y Preguntar comparten el molde de la caja: cascarón de tarjeta
 * compacto —borde, superficie neutra, franja de color a la izquierda— con dos
 * renglones (título y una línea de contexto), para que la fila arriba del grid
 * se lea como tres tarjetas hermanas. La FRANJA es identidad, no estado (ver
 * docs/diseno.md, "La estructura es información"): verde acción para Preguntar
 * —se toca—, pizarra para Configurar —es preferencia, no operación, como los
 * módulos que viven en Ajustes. El ícono va suelto, sin pastilla: la fila queda
 * callada y no compite con las tarjetas de módulo.
 */
function AccionTile({
  icon: TileIcon,
  fill = false,
  franja,
  titulo,
  contexto,
  atajo,
  activa = false,
  onClick,
}: {
  icon: Icon;
  fill?: boolean;
  franja: string;
  titulo: string;
  contexto: string;
  atajo?: string;
  activa?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      style={{ ['--ab-edge' as string]: franja }}
      className={cn(
        'group relative flex flex-col items-start gap-1 overflow-hidden rounded-lg border px-6 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-offset-2',
        activa ? 'border-accent-border bg-accent' : 'border-border bg-card hover:bg-subtle',
      )}
    >
      <span
        className="pointer-events-none absolute inset-y-0 left-0 w-1.5"
        style={{ background: 'var(--ab-edge)' }}
        aria-hidden="true"
      />
      <span className="flex items-center gap-2 text-sm font-bold text-foreground">
        <TileIcon weight={fill ? 'fill' : 'regular'} className="size-4" />
        {titulo}
        {atajo && <Kbd className="ml-0.5">{atajo}</Kbd>}
      </span>
      <span className="text-micro leading-snug text-muted-foreground">{contexto}</span>
    </button>
  );
}

/**
 * El escritorio es un tablero fijo: una grilla de celdas de igual tamaño donde
 * vive cada tarjeta (los huecos —de tarjetas ocultas o por mudanza— quedan como
 * celdas vacías visibles). La última columna es el flanco reservado de vacíos:
 * siempre parejo, para dejar tarjetas afuera del circuito. Se mueve todo
 * arrastrando en cualquier momento, cada tarjeta se estira desde sus bordes y
 * el tablero queda guardado en localStorage.
 */
type Config = { hidden: string[]; tiles: TilePos[] };

/** Reacomoda las tarjetas en la grilla: primero la fijada (si hay), después el
 *  resto en el orden dado, cada una en el primer hueco donde entra completa
 *  (primera cabida, fila por fila). Si no hay lugar, crece una fila.
 *  Determinista: mismo entrada, mismo tablero — por eso el arrastre no baila. */
function computeLayout(
  sizes: { key: string; w: number; h: number }[],
  maxCol: number,
  pinned?: { key: string; col: number; row: number },
): TilePos[] {
  const occ = new Set<string>();
  const out: TilePos[] = [];
  const mark = (p: TilePos) => {
    for (let dr = 0; dr < p.h; dr++) for (let dw = 0; dw < p.w; dw++) occ.add(`${p.row + dr}:${p.col + dw}`);
  };
  const cabe = (row: number, col: number, w: number, h: number) => {
    if (col + w > maxCol) return false;
    for (let dr = 0; dr < h; dr++) for (let dw = 0; dw < w; dw++) if (occ.has(`${row + dr}:${col + dw}`)) return false;
    return true;
  };
  const place = (key: string, w: number, h: number, pin?: { col: number; row: number }) => {
    const ww = Math.min(Math.max(1, w), maxCol);
    let row = pin ? Math.max(0, pin.row) : 0;
    let col = pin ? Math.min(Math.max(0, pin.col), maxCol - ww) : 0;
    while (!cabe(row, col, ww, h)) {
      col++;
      if (col + ww > maxCol) {
        col = 0;
        row++;
      }
    }
    const p = { key, col, row, w: ww, h };
    mark(p);
    out.push(p);
  };
  if (pinned) {
    const t = sizes.find(s => s.key === pinned.key);
    if (t) place(t.key, t.w, t.h, pinned);
  }
  for (const t of sizes) {
    if (pinned && t.key === pinned.key) continue;
    place(t.key, t.w, t.h);
  }
  return out;
}

/** Orden visual (fila, luego columna): el orden en que se reacomodan. */
const porVisual = (a: TilePos, b: TilePos) => a.row - b.row || a.col - b.col;
const aSize = ({ key, w, h }: TilePos) => ({ key, w, h });

/** Tablero de fábrica: los módulos en su orden, fila por fila, dejando la
 *  última columna como flanco de vacíos. Es el punto de partida de toda
 *  cuenta nueva (y de toda config guardada que no traiga tarjetas). */
function tableroFabrica(keys: string[]): TilePos[] {
  return computeLayout(
    keys.map(key => ({ key, w: 1, h: 1 })),
    GRID_COLS - 1,
  );
}

function readConfig(keys: string[]): Config {
  const puede = new Set(keys);
  const sembrar = (hidden: string[]): Config => ({ hidden, tiles: tableroFabrica(keys.filter(k => !hidden.includes(k))) });
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Config>;
      // Formato actual: posiciones explícitas por tarjeta.
      if (Array.isArray(parsed.tiles)) {
        const hidden = (parsed.hidden ?? []).filter(k => puede.has(k));
        const tiles = parsed.tiles
          .filter(t => puede.has(t.key))
          .map(t => ({
            key: t.key,
            col: Math.max(0, Math.min(GRID_COLS - 1, Math.floor(t.col) || 0)),
            row: Math.max(0, Math.floor(t.row) || 0),
            w: Math.min(GRID_COLS, Math.max(1, Math.floor(t.w) || 1)),
            h: Math.max(1, Math.floor(t.h) || 1),
          }));
        if (tiles.length > 0) return { hidden, tiles: computeLayout([...tiles].sort(porVisual).map(aSize), GRID_COLS) };
        return sembrar(hidden);
      }
      // Formato intermedio (board + spans): anclas del tablero viejo, reacomodadas.
      const boardViejo = (parsed as { board?: unknown }).board;
      if (Array.isArray(boardViejo)) {
        const hidden = (parsed.hidden ?? []).filter(k => puede.has(k));
        const spans = ((parsed as { spans?: Record<string, { w?: number; h?: number }> }).spans ?? {}) as Record<string, { w?: number; h?: number }>;
        const viejas: TilePos[] = [];
        (boardViejo as (string | null)[]).forEach((k: string | null, i: number) => {
          if (!k || !puede.has(k)) return;
          const col = i % GRID_COLS;
          viejas.push({
            key: k,
            col,
            row: Math.floor(i / GRID_COLS),
            w: Math.min(spans[k]?.w ?? 1, GRID_COLS - col),
            h: spans[k]?.h ?? 1,
          });
        });
        if (viejas.length > 0) return { hidden, tiles: computeLayout(viejas.sort(porVisual).map(aSize), GRID_COLS) };
        return sembrar(hidden);
      }
      // Compat con el formato viejo (order + hidden).
      const viejo = parsed as Partial<{ order: string[]; hidden: string[] }>;
      const hidden = (viejo.hidden ?? []).filter(k => puede.has(k));
      const order = (viejo.order ?? []).filter(k => puede.has(k) && !hidden.includes(k));
      if (order.length > 0) return { hidden, tiles: tableroFabrica(order) };
      return sembrar(hidden);
    }
  } catch {
    // Sin persistencia (o config rota): el escritorio arranca de fábrica.
  }
  return sembrar([]);
}

function writeConfig(config: Config) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Modo privado: la configuración vale para esta sesión y nada más.
  }
}

export function EscritorioPage() {
  const { session, can } = useAuth();
  const navigate = useNavigate();
  const openPalette = usePalette();
  const [config, setConfig] = useState<Config>(() => readConfig(gridModules(can).map(m => m.key)));
  const [summary, setSummary] = useState<EscritorioSummary | null>(null);
  // Arrastre: la tarjeta agarrada, el índice de celda objetivo (solo VISUAL —
  // nada se reacomoda durante el dragover; el commit es único, en el drop) y
  // la última celda realmente ocupada por la tarjeta en el tablero (para
  // commit anclado y para devolverla si el drop es inválido).
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [hoverCell, setHoverCell] = useState<number | null>(null);
  const [invalid, setInvalid] = useState(false);
  const hoverRef = useRef<number | null>(null);
  const dragKeyRef = useRef<string | null>(null);
  // Tarjeta en estirado (y desde dónde): mientras dura, bloquea drag y click.
  const [resizing, setResizing] = useState<{ key: string; dir: 'e' | 's' | 'se' } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef(false);
  const lastResizeEnd = useRef(0);
  // Foto del layout anterior (FLIP): cuando el tablero se rearma —mudanza,
  // estirado, ocultar— cada tarjeta vuela de su lugar previo al nuevo y su
  // tamaño escala en vez de saltar. En pleno estirado la animación es corta
  // (se reinicia a cada paso del arrastre: efecto de seguimiento suave);
  // fuera de él, algo más larga. Al redimensionar la ventana solo se actualiza
  // la foto, sin animar deltas viejos.
  const rectsRef = useRef<Map<string, DOMRect>>(new Map());
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const prev = rectsRef.current;
    const next = new Map<string, DOMRect>();
    for (const el of Array.from(grid.querySelectorAll<HTMLElement>('[data-tile]'))) {
      const key = el.dataset.tile ?? '';
      const now = el.getBoundingClientRect();
      next.set(key, now);
      const antes = prev.get(key);
      if (!antes) continue;
      const dx = antes.left - now.left;
      const dy = antes.top - now.top;
      const sx = antes.width / now.width;
      const sy = antes.height / now.height;
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2 && Math.abs(sx - 1) < 0.03 && Math.abs(sy - 1) < 0.03) continue;
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, transformOrigin: 'top left' },
          { transform: 'translate(0, 0) scale(1, 1)' },
        ],
        { duration: resizingRef.current ? 200 : 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      );
    }
    rectsRef.current = next;
  }, [config]);
  useEffect(() => {
    const refresh = () => {
      const grid = gridRef.current;
      if (!grid) return;
      const next = new Map<string, DOMRect>();
      for (const el of Array.from(grid.querySelectorAll<HTMLElement>('[data-tile]'))) {
        next.set(el.dataset.tile ?? '', el.getBoundingClientRect());
      }
      rectsRef.current = next;
    };
    window.addEventListener('resize', refresh);
    return () => window.removeEventListener('resize', refresh);
  }, []);

  const token = session?.accessToken;
  useEffect(() => {
    if (!token) return;
    let vivo = true;
    api<EscritorioSummary>('/escritorio', {}, token)
      .then(s => vivo && setSummary(s))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [token]);

  const canCaja = can('caja.operar');
  // Mapa módulo → definición (la grilla se arma desde las celdas, no al revés).
  const byKey = useMemo(() => new Map(gridModules(can).map(m => [m.key, m])), [can]);
  const cols = GRID_COLS;
  const tiles = config.tiles;
  const rows = useMemo(() => Math.max(2, ...tiles.map(t => t.row + t.h)), [tiles]);
  const hidden = config.hidden.map(k => byKey.get(k)).filter((m): m is ModuleDef => !!m);

  const nombre = session?.user.name.split(' ')[0] ?? '';
  const hoy = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

  function update(next: Config) {
    setConfig(next);
    writeConfig(next);
  }
  // Ocultar: la tarjeta sale del tablero (las demás no se mueven — su posición
  // es explícita).
  const ocultar = (key: string) => {
    if (config.hidden.includes(key)) return;
    update({ hidden: [...config.hidden, key], tiles: tiles.filter(t => t.key !== key) });
  };
  const mostrar = (key: string) => {
    const puestas = computeLayout(tiles.filter(t => t.key !== key).sort(porVisual).map(aSize), GRID_COLS);
    // Mostrar: entra de fábrica al primer hueco donde entra completa.
    update({ hidden: config.hidden.filter(k => k !== key), tiles: computeLayout([{ key, w: 1, h: 1 }, ...puestas], GRID_COLS) });
  };
  // Estirar una tarjeta desde sus bordes: el tamaño (en celdas de la grilla)
  // se ve en vivo durante el arrastre y queda persistido al soltar. La tarjeta
  // queda anclada donde está y el resto se reacomoda con el mismo packing
  // determinista del arrastre — nadie baila.
  const spanOf = (key: string): TileSpan => {
    const t = tiles.find(x => x.key === key);
    return t ? { w: t.w, h: t.h } : { w: 1, h: 1 };
  };
  const setSpan = (key: string, w: number, h: number) => {
    setConfig(prev => {
      const cur = prev.tiles.find(x => x.key === key);
      if (!cur || (cur.w === w && cur.h === h)) return prev;
      const resto = prev.tiles.filter(t => t.key !== key).sort(porVisual).map(aSize);
      const next = { ...prev, tiles: computeLayout([{ key, w, h }, ...resto], GRID_COLS, { key, col: cur.col, row: cur.row }) };
      writeConfig(next);
      return next;
    });
  };
  const startResize = (key: string, dir: 'e' | 's' | 'se') => (e: ReactPointerEvent<HTMLSpanElement>) => {
    e.preventDefault();
    const grid = gridRef.current;
    const card = grid?.querySelector<HTMLElement>(`[data-tile="${key}"]`);
    if (!grid || !card) return;
    const rect = card.getBoundingClientRect();
    const cellW = (grid.clientWidth - (GRID_COLS - 1) * GAP) / GRID_COLS;
    const init = spanOf(key);
    resizingRef.current = true;
    setResizing({ key, dir });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Sin captura (puntero sintético): los listeners de window alcanzan.
    }
    const move = (ev: globalThis.PointerEvent) => {
      const w = dir === 's' ? init.w : Math.min(GRID_COLS, Math.max(1, Math.round((ev.clientX - rect.left) / (cellW + GAP))));
      const h = dir === 'e' ? init.h : Math.min(MAX_ROWS, Math.max(1, Math.round((ev.clientY - rect.top) / (ROW_H + GAP))));
      setSpan(key, w, h);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      resizingRef.current = false;
      lastResizeEnd.current = Date.now();
      setResizing(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  // Arrastre: dragover SOLO anota la celda objetivo (y habilita el drop); el
  // reacomodo es único, en el drop — por eso las demás tarjetas no bailan
  // mientras arrastrás. Soltar fuera del tablero o en su propio lugar no
  // cambia nada. La celda objetivo es el ancla de la esquina sup-izq de la
  // tarjeta; si no entra completa ahí, se marca inválida y no se mueve.
  const cellFromEvent = (e: { clientX: number; clientY: number }) => {
    const grid = gridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    const col = Math.floor(((e.clientX - rect.left) / grid.clientWidth) * GRID_COLS);
    const row = Math.floor((e.clientY - rect.top) / (ROW_H + GAP));
    if (col < 0 || col >= GRID_COLS || row < 0) return null;
    return { col, row };
  };
  const onTileDragStart = (key: string) => {
    dragKeyRef.current = key;
    setDragKey(key);
    const t = tiles.find(x => x.key === key);
    if (t) {
      const idx = t.row * GRID_COLS + t.col;
      hoverRef.current = idx;
      setHoverCell(idx);
    }
  };
  const onTileDragEnd = () => {
    dragKeyRef.current = null;
    hoverRef.current = null;
    setDragKey(null);
    setHoverCell(null);
    setInvalid(false);
  };
  const onGridDragOver = (e: ReactDragEvent) => {
    if (!dragKeyRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const c = cellFromEvent(e);
    if (!c) return;
    const idx = c.row * GRID_COLS + c.col;
    if (hoverRef.current === idx) return;
    hoverRef.current = idx;
    setHoverCell(idx);
    const t = tiles.find(x => x.key === dragKeyRef.current);
    setInvalid(!!t && c.col + t.w > GRID_COLS);
  };
  const onGridDrop = (e: ReactDragEvent) => {
    e.preventDefault();
    const key = dragKeyRef.current;
    const c = cellFromEvent(e);
    onTileDragEnd();
    if (!key || !c) return;
    const t = tiles.find(x => x.key === key);
    if (!t || (c.col === t.col && c.row === t.row) || c.col + t.w > GRID_COLS) return;
    const resto = tiles.filter(x => x.key !== key).sort(porVisual).map(aSize);
    update({ ...config, tiles: computeLayout([{ key, w: t.w, h: t.h }, ...resto], GRID_COLS, { key, col: c.col, row: Math.min(c.row, rows - 1) }) });
  };

  // La tarjeta se despliega al módulo: se le pone el nombre de transición justo
  // antes de navegar, así el navegador morfea la tarjeta en la cabecera del
  // módulo (ver docs/diseno.md, "Navegación y continuidad").
  function open(e: MouseEvent<HTMLAnchorElement>, m: ModuleDef) {
    // Un click que viene de soltar un estirado no navega.
    if (resizingRef.current || Date.now() - lastResizeEnd.current < 250) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    (e.currentTarget as HTMLElement).style.viewTransitionName = 'module-hero';
    navigate(m.path, { viewTransition: true });
  }

  return (
    <div className="pt-4">
      {/* Barra: logo y nombre de la empresa a la izquierda; sucursal y cuenta a la
          derecha. El brand "abasto.ai" vive en el footer. */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-border-soft pb-4">
        <div className="flex items-center gap-3">
          {session?.tenant.logo ? (
            <img
              src={session.tenant.logo}
              alt={session.tenant.name}
              className="size-11 shrink-0 rounded-md border border-border bg-card object-contain p-1"
            />
          ) : (
            <span className="type-display grid size-11 shrink-0 place-items-center rounded-md bg-primary text-h3 text-primary-foreground">
              {session?.tenant.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <p className="font-display text-grande font-semibold">{session?.tenant.name}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <BranchSwitcher />
          <NotificationBell summary={summary} />
          <UserMenu />
        </div>
      </header>

      {/* Saludo (y lo que hay para mirar, en la campana de arriba). */}
      <div className="mt-4">
        <p className="text-chico text-placeholder first-letter:uppercase">{hoy}</p>
        <h1 className="type-display mt-1 text-h1 leading-tight">
          {saludo()}{nombre && `, ${nombre}`}.
        </h1>
        {session?.user.branch && session.user.homeBranch && session.user.branch.id !== session.user.homeBranch.id && (
          <p className="mt-3 text-chico text-muted-foreground">
            Estás viendo {session.user.branch.name}.{' '}
            <button
              type="button"
              onClick={() => setActiveBranch(session.user.id, null)}
              className="font-medium text-primary hover:underline"
            >
              Volver a {session.user.homeBranch.name}
            </button>
          </p>
        )}
      </div>

      {/* Una sola fila: la caja (compacta, a la izquierda) y las acciones del
          escritorio (Configurar / Preguntar) en el hueco que queda a su derecha. */}
      <div className={cn('mb-3 mt-5 flex flex-wrap items-start gap-3', canCaja ? 'justify-between' : 'justify-end')}>
        {canCaja && <AbrirMostrador summary={summary} />}
        <div className="flex flex-wrap items-center gap-3">
          <AccionTile
            icon={Sparkle}
            fill
            franja="var(--color-primary)"
            titulo="Preguntar"
            contexto="Buscá o pedí lo que sea"
            atajo="Ctrl K"
            onClick={openPalette}
          />
        </div>
      </div>

      <div
        ref={gridRef}
        onDragOver={onGridDragOver}
        onDrop={onGridDrop}
        className="escritorio-grid grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, ${ROW_H}px)`,
        }}
      >
        {/* Fantasma del destino: marca dónde caería la tarjeta (y si no entra,
            se pinta en rojo). Solo visual: el tablero real no cambia hasta el
            drop — por eso las demás tarjetas quedan quietas durante el arrastre. */}
        {dragKey &&
          hoverCell != null &&
          (() => {
            const t = tiles.find(x => x.key === dragKey);
            if (!t) return null;
            const col = hoverCell % GRID_COLS;
            const row = Math.min(Math.floor(hoverCell / GRID_COLS), rows - 1);
            const mal = invalid || col + t.w > GRID_COLS;
            return (
              <div
                aria-hidden="true"
                className={cn(
                  'pointer-events-none z-10 rounded-lg border-2 border-dashed',
                  mal ? 'border-destructive/60 bg-destructive/5' : 'border-primary/60 bg-primary/10',
                )}
                style={{ gridColumn: `${col + 1} / span ${t.w}`, gridRow: `${row + 1} / span ${t.h}` }}
              />
            );
          })()}
        {tiles.map(t => {
          const m = byKey.get(t.key);
          if (!m) return null;
          const stat = summary ? statFor(m.key, summary) : null;
          // Ventas estirada (2+ de ancho): el gráfico de facturación real
          // reemplaza a la minimapa — la tarjeta grande muestra la serie, no
          // solo la forma.
          const grafico = m.key === 'ventas' && t.w >= 2 && stat?.bars;
          // Vista previa: qué tarjetas se reacomodarían al soltar acá (anillo
          // ámbar = se mueve; el tablero real no cambia hasta el drop).
          let tocada = false;
          if (dragKey && hoverCell != null && dragKey !== t.key) {
            const agarrada = tiles.find(x => x.key === dragKey);
            if (agarrada) {
              const destino = computeLayout(
                [{ key: dragKey, w: agarrada.w, h: agarrada.h }, ...tiles.filter(x => x.key !== dragKey).sort(porVisual).map(aSize)],
                GRID_COLS,
                { key: dragKey, col: hoverCell % GRID_COLS, row: Math.min(Math.floor(hoverCell / GRID_COLS), rows - 1) },
              );
              const dp = destino.find(p => p.key === t.key);
              tocada = !!dp && (dp.col !== t.col || dp.row !== t.row);
            }
          }
          return (
          <Link
            key={m.key}
            to={m.path}
            onClick={e => open(e, m)}
            data-tile={m.key}
            style={{
              gridColumn: `${t.col + 1} / span ${t.w}`,
              gridRow: `${t.row + 1} / span ${t.h}`,
              ['--ab-tile-hue' as string]: hueFor(m.key),
            }}
            draggable={resizing?.key !== m.key}
            onDragStart={() => onTileDragStart(m.key)}
            onDragEnd={onTileDragEnd}
            className={cn(
              'module-tile group relative flex flex-col gap-2 overflow-hidden rounded-lg border pl-5 pr-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-offset-2',
              dragKey === m.key && 'opacity-40',
              tocada && 'ring-2 ring-warning/60',
              resizing?.key === m.key && 'select-none ring-2 ring-primary/40',
            )}
          >
            <ModuleMotif
              motif={m.motif}
              className="module-tile__motif pointer-events-none absolute -bottom-4 -right-4 size-[104px] transition-opacity"
            />
            {stat?.flag && (
              <span
                className={cn(
                  'absolute right-3.5 top-3.5 size-2 rounded-full',
                  stat.flag === 'hot' ? 'bg-destructive' : 'bg-warning',
                )}
              />
            )}
            <div className="flex items-center gap-2">
              <span className="module-tile__chip flex size-8 shrink-0 items-center justify-center rounded-md">
                <m.Icon weight="fill" className="size-5" />
              </span>
              <h2 className="min-w-0 flex-1 truncate font-display text-h3 font-semibold tracking-tight [text-wrap:balance]">
                {m.label}
              </h2>
            </div>
            {/* El dato clave arriba; abajo SOLO lo que el dato no cuenta. Las
                protagonistas agregan su detalle (quién/cuánto, tendencia) en
                vez de repetirlo en el texto gris. Monocromo: si algo está mal,
                lo dice el puntito. */}
            <div className="mt-auto flex flex-col justify-end">
              {stat && (
                <p className="tabular truncate font-display text-h2 font-semibold leading-tight tracking-tight">
                  {stat.value}
                </p>
              )}
              {stat?.rows && stat.rows.length > 0 ? (
                <div className="mt-2">
                  <p className="truncate text-micro leading-snug text-muted-foreground">
                    {cap(stat.caption ?? stat.hint)}
                  </p>
                  <ul className="mt-1 divide-y divide-border/60 border-t border-border-soft">
                    {stat.rows.map((r, i) => (
                      <li key={i} className="flex items-baseline gap-2 py-1">
                        <span className="min-w-0 flex-1 truncate text-chico text-foreground">{r.label}</span>
                        {r.value && (
                          <span
                            className={cn(
                              'shrink-0 text-chico tabular',
                              r.tone === 'hot' ? 'font-semibold text-destructive' : 'text-muted-foreground',
                            )}
                          >
                            {r.value}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <>
                  {!grafico && (
                    <p className="mt-0.5 truncate text-micro leading-snug text-muted-foreground">{cap(stat?.hint ?? m.blurb)}</p>
                  )}
                  {grafico ? (
                    <FacturacionChart bars={stat!.bars!} hue={hueFor(m.key)} />
                  ) : (
                    stat?.bars && <MiniBars bars={stat.bars} hue={hueFor(m.key)} />
                  )}
                </>
              )}
            </div>

            <DotsSixVertical
              className="pointer-events-none absolute left-1/2 top-2 size-4 -translate-x-1/2 text-placeholder opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden="true"
            />
            <button
              type="button"
              aria-label="Ocultar"
              onClick={e => {
                e.preventDefault();
                ocultar(m.key);
              }}
              className="absolute right-2 top-2 z-10 rounded-md border border-border bg-card p-1.5 text-muted-foreground opacity-0 shadow-float transition-opacity hover:bg-background hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-offset-2 group-hover:opacity-100"
            >
              <EyeSlash className="size-3.5" />
            </button>
            {/* Bordes de estirado: lateral derecho (ancho), inferior (alto) y
                esquina (ambos). preventDefault en mousedown evita que el
                navegador lo tome como drag del link. */}
            <span
              aria-hidden="true"
              onPointerDown={startResize(m.key, 'e')}
              onMouseDown={e => e.preventDefault()}
              className="tile-resize tile-resize--e"
            />
            <span
              aria-hidden="true"
              onPointerDown={startResize(m.key, 's')}
              onMouseDown={e => e.preventDefault()}
              className="tile-resize tile-resize--s"
            />
            <span
              aria-hidden="true"
              onPointerDown={startResize(m.key, 'se')}
              onMouseDown={e => e.preventDefault()}
              className="tile-resize tile-resize--se"
            />
          </Link>
          );
        })}
      </div>

      {hidden.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-chico text-placeholder">Ocultos</span>
          {hidden.map(m => (
            <button
              key={m.key}
              type="button"
              onClick={() => mostrar(m.key)}
              className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:border-solid hover:text-foreground"
            >
              <Plus className="size-3" />
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
