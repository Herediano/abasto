import { useEffect, useMemo, useRef, useState, type MouseEvent, type Ref } from 'react';
import { CalendarBlank, CashRegister, EyeSlash, Plus } from '@phosphor-icons/react';
import { Link, useNavigate } from 'react-router-dom';
import ReactGridLayout, { noCompactor, useContainerWidth, type Compactor, type Layout } from 'react-grid-layout';
import { useEscritorioSummary } from '@/components/layout/escritorio-shell';
import { ModuleMotif, gridModules, hueFor, type ModuleDef } from '@/lib/modules';
import { hora as fmtHora } from '@/lib/format';
import { compact, statFor, type EscritorioSummary, type TileBar } from '@/lib/escritorio';
import { prefetchRoute } from '@/lib/lazy-pages';
import { useAuth } from '@/lib/auth-context';
import { setActiveBranch } from '@/lib/branch';
import { cn } from '@/lib/utils';

const CONFIG_KEY = 'abasto-escritorio';

/** Grilla fija de columnas; sin presets de tamaño. El tablero lo gobierna
 *  react-grid-layout (drag + resize), pero la PERSISTENCIA sigue siendo la
 *  posición densa (packed): el único desvío visual es el centrado de la última
 *  fila incompleta (parche, react-grid-layout no lo soporta). */
const GRID_COLS = 5;
const GAP = 12; // gap-3 (misma separación que el grid viejo)
const ROW_H = 168; // alto de fila en px
/** Tope duro de apilado: el tablero nunca crece más de 6 filas. Vale como
 *  altura máxima de una tarjeta, como `maxRows` de la grilla y como clamp de
 *  toda posición que venga de localStorage. */
const MAX_ROWS = 6;

/** Una tarjeta del tablero: posición explícita (col, row en 0..) y tamaño en
 *  celdas. Se persiste densa (packed); el corrimiento de centrado es solo un
 *  desvío de render. */
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
            className="w-full rounded-t-[5px]"
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
                className="w-full rounded-t-[5px] transition-[height] duration-200"
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
      onMouseEnter={() => prefetchRoute('/ventas')}
      onFocus={() => prefetchRoute('/ventas')}
      className={cn(
        'group relative flex max-w-[240px] flex-col items-start gap-0.5 overflow-hidden rounded-lg px-4 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-offset-2 uiverse-ctl',
        abierta ? 'mostrador-open' : 'mostrador-closed',
      )}
    >
      <span className="flex items-center gap-2 text-sm font-bold">
        <CashRegister weight="fill" className="size-4" />
        Mostrador
        {abierta && <BlinkDot />}
      </span>
      <Marquee
        className="text-micro leading-snug opacity-80"
        text={abierta ? `Abierta ${hora} · ${tickets} ${tickets === 1 ? 'ticket' : 'tickets'}${efectivo}` : 'Sin turno abierto'}
      />
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

/** Centrado del renglón base incompleto de un tablero RECIÉN ARMADO (denso).
 *  Solo se aplica en construcción —fábrica, mostrar, configs viejas— NUNCA
 *  sobre posiciones que el usuario ya dejó a mano: una fila que no arranca en
 *  la columna 0 ya está donde quieren que esté (p. ej. la esquina inferior
 *  izquierda tras un drop). */
function centrarTablero(tiles: TilePos[]): TilePos[] {
  const celdas = tiles.map(t => ({ x: t.col, y: t.row, w: t.w, h: t.h }));
  const fila = Math.max(0, ...celdas.map(l => l.y + l.h - 1));
  const items = celdas.filter(l => l.y === fila);
  const usados = items.reduce((s, l) => s + l.w, 0);
  const minX = items.length ? Math.min(...items.map(l => l.x)) : 0;
  const desborda = celdas.some(l => l.y < fila && l.y + l.h > fila);
  let densa = true;
  let cursor = minX;
  for (const l of items) {
    if (l.x !== cursor) {
      densa = false;
      break;
    }
    cursor += l.w;
  }
  const ok = usados < GRID_COLS && !desborda && densa && minX === 0;
  if (!ok) return tiles;
  const offset = Math.floor((GRID_COLS - usados) / 2);
  return tiles.map(t => (t.row === fila ? { ...t, col: t.col + offset } : t));
}

/** Un layout es inválido cuando NO se puede aceptar: alguna tarjeta se pasa
 *  del tope de 6 filas, o dos tarjetas se pisan (la compactación no encontró
 *  lugar). Lo usan el commit (para descartar el movimiento) y el arrastre
 *  (para avisarle al usuario, con cursor de prohibido, que ahí no entra). */
type Caja = { x: number; y: number; w: number; h: number };
function layoutInvalido(items: readonly Caja[]): boolean {
  if (items.some(l => l.y + l.h > MAX_ROWS)) return true;
  return items.some((a, i) =>
    items.some(
      (b, j) => j > i && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y,
    ),
  );
}

/** El tablero es un damero fijo: SIN gravedad ni compactación. Cada tarjeta
 *  queda EXACTAMENTE donde el usuario la suelta; sacar una de arriba no hace
 *  subir a las de abajo. `preventCollision` bloquea arrastrar/estirar sobre
 *  una celda ocupada (la tarjeta rebota) y `maxRows` frena en la fila 6. */
const damero: Compactor = { ...noCompactor, preventCollision: true };

/** Tablero de fábrica: los módulos en su orden, fila por fila, dejando la
 *  última columna como flanco de vacíos. Es el punto de partida de toda
 *  cuenta nueva (y de toda config guardada que no traiga tarjetas). */
function tableroFabrica(keys: string[]): TilePos[] {
  return centrarTablero(
    computeLayout(
      keys.map(key => ({ key, w: 1, h: 1 })),
      GRID_COLS - 1,
    ),
  );
}

function readConfig(keys: string[]): Config {
  const puede = new Set(keys);
  const sembrar = (hidden: string[]): Config => ({ hidden, tiles: tableroFabrica(keys.filter(k => !hidden.includes(k))) });
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Config>;
      // Formato actual: posiciones explícitas por tarjeta. Se respetan tal
      // cual (solo se les clampan los bordes); reempacar sería tirar por la
      // borda lo que el usuario guardó. El reempacado queda de fallback para
      // configs viejas/rotas que vengan con superposiciones o fuera de la grilla.
      if (Array.isArray(parsed.tiles)) {
        const hidden = (parsed.hidden ?? []).filter(k => puede.has(k));
        const tiles = parsed.tiles
          .filter(t => puede.has(t.key))
          .map(t => ({
            key: t.key,
            col: Math.max(0, Math.min(GRID_COLS - 1, Math.floor(t.col) || 0)),
            row: Math.max(0, Math.min(MAX_ROWS - 1, Math.floor(t.row) || 0)),
            w: Math.min(GRID_COLS, Math.max(1, Math.floor(t.w) || 1)),
            h: Math.min(MAX_ROWS, Math.max(1, Math.floor(t.h) || 1)),
          }));
        // Dos tarjetas con la misma clave no tienen sentido: queda la primera.
        const unicas: TilePos[] = [];
        const vistas = new Set<string>();
        for (const t of tiles) {
          if (vistas.has(t.key)) continue;
          vistas.add(t.key);
          unicas.push(t);
        }
        if (unicas.length === 0) return sembrar(hidden);
        const occ = new Set<string>();
        let collide = false;
        for (const t of unicas) {
          if (t.col + t.w > GRID_COLS) collide = true;
          for (let dr = 0; dr < t.h; dr++) {
            for (let dw = 0; dw < t.w; dw++) {
              const cell = `${t.row + dr}:${t.col + dw}`;
              if (occ.has(cell)) collide = true;
              occ.add(cell);
            }
          }
        }
        if (collide) return { hidden, tiles: centrarTablero(computeLayout(unicas.sort(porVisual).map(aSize), GRID_COLS)) };
        // Config válida guardada por el usuario: se respeta TAL CUAL. Nada de
        // centrar la última fila — esas posiciones ya son las que quiso dejar
        // (una tarjeta sola en la esquina izquierda tiene que volver a esa
        // esquina, no correrse al centro).
        return { hidden, tiles: unicas };
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
        if (viejas.length > 0) return { hidden, tiles: centrarTablero(computeLayout(viejas.sort(porVisual).map(aSize), GRID_COLS)) };
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
  const summary = useEscritorioSummary();
  const [config, setConfig] = useState<Config>(() => readConfig(gridModules(can).map(m => m.key)));
  const { width, containerRef } = useContainerWidth();
  // Guarda de click: no navega ni un click post-arrastre/estirado ni una
  // pulsación LARGA (la gente aprieta y mantiene para agarrar la tarjeta y
  // acomodarse antes de arrastrar; soltar sin moverse no debe abrir nada).
  const ultimaInteraccion = useRef(0);
  // Dónde arrancó la pulsación: si el puntero casi no se movió entre el
  // mousedown y el click, es un click de verdad y abre el módulo — no importa
  // cuánto lo mantuvo apretado. Solo un desplazamiento real (arrastre) lo frena.
  const pressPos = useRef<{ x: number; y: number } | null>(null);
  const CLICK_SLOP_PX = 5;
  // Se incrementa para remontar la grilla y forzarla a re-sincronizar con
  // `layoutFor` cuando hay que descartar un movimiento (react-grid-layout se
  // queda con su estado interno si el layout que le pasás es deep-equal).
  const [gridNonce, setGridNonce] = useState(0);
  const [ultimoOculto, setUltimoOculto] = useState<{ key: string; label: string } | null>(null);
  const undoTimeout = useRef<number | null>(null);

  const canCaja = can('caja.operar');
  // Mapa módulo → definición (la grilla se arma desde las celdas, no al revés).
  const byKey = useMemo(() => new Map(gridModules(can).map(m => [m.key, m])), [can]);
  const tiles = config.tiles;
  const hidden = config.hidden.map(k => byKey.get(k)).filter((m): m is ModuleDef => !!m);

  // Una vez que el escritorio quedó quieto, bajamos en segundo plano el chunk
  // de cada módulo del tablero (y el de la Caja). Es un ERP de todo el día:
  // la misma persona abre los mismos módulos una y otra vez, así que gastar el
  // idle en tenerlos listos vale más que ahorrar ese tráfico. El hover ya
  // cubre lo inmediato; esto cubre "click sin pasar el mouse antes" y teclado.
  useEffect(() => {
    const paths = new Set(tiles.map(t => byKey.get(t.key)?.path).filter((p): p is string => !!p));
    if (canCaja) paths.add('/ventas');
    const run = () => paths.forEach(prefetchRoute);
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(run, 1500);
    return () => window.clearTimeout(id);
    // Corre una vez, con el tablero inicial: los módulos que se agreguen después
    // (mostrar una tarjeta oculta) igual precargan solos al pasarles el mouse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // La posición persistida ES la que ve react-grid-layout: sin traducciones en
  // render ni al persistir. El centrado de la última fila incompleta se
  // aplicó al armar el tablero (fábrica, mostrar, migración de configs
  // viejas); después, lo que arrastrás queda EXACTAMENTE donde lo dejaste —
  // soltar en la esquina inferior izquierda queda en la esquina, no corre por
  // re-centrar la fila.
  const layoutFor = useMemo<Layout>(() => {
    return tiles.map(t => ({
      i: t.key,
      x: t.col,
      y: t.row,
      w: t.w,
      h: t.h,
      minW: 1,
      minH: 1,
      maxW: GRID_COLS,
      maxH: MAX_ROWS,
    }));
  }, [tiles]);
  // Commit de un layout (lo que da react-grid-layout tras un drag o resize):
  // se guarda tal cual, sin reinterpretar nada — salvo el tope duro de apilado.
  const commit = (visual: Layout) => {
    // Movimiento inválido → se descarta entero y la grilla vuelve sola a la
    // última posición válida (remonte por `gridNonce`). No se reacomoda nada:
    // si no entra, no se mueve (ver `layoutInvalido`).
    if (layoutInvalido(visual)) {
      setGridNonce(n => n + 1);
      return;
    }
    const tilesN: TilePos[] = visual.map(l => ({ key: l.i, col: l.x, row: l.y, w: l.w, h: l.h })).sort(porVisual);
    setConfig(prev => {
      if (JSON.stringify(prev.tiles) === JSON.stringify(tilesN)) return prev;
      const next = { ...prev, tiles: tilesN };
      writeConfig(next);
      return next;
    });
  };

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
    const label = byKey.get(key)?.label ?? key;
    update({ hidden: [...config.hidden, key], tiles: tiles.filter(t => t.key !== key) });
    // Ocultar es destructivo (la tarjeta sale del tablero): se ofrece un
    // deshacer por unos segundos en vez de dejarlo sin vuelta atrás.
    setUltimoOculto({ key, label });
    if (undoTimeout.current) window.clearTimeout(undoTimeout.current);
    undoTimeout.current = window.setTimeout(() => setUltimoOculto(null), 7000);
  };
  const deshacerOculto = () => {
    if (undoTimeout.current) {
      window.clearTimeout(undoTimeout.current);
      undoTimeout.current = null;
    }
    if (ultimoOculto) mostrar(ultimoOculto.key);
    setUltimoOculto(null);
  };
  const mostrar = (key: string) => {
    const puestas = computeLayout(tiles.filter(t => t.key !== key).sort(porVisual).map(aSize), GRID_COLS);
    // Mostrar: entra de fábrica al primer hueco donde entra completa.
    update({ hidden: config.hidden.filter(k => k !== key), tiles: centrarTablero(computeLayout([{ key, w: 1, h: 1 }, ...puestas], GRID_COLS)) });
  };
  // La tarjeta se despliega al módulo: se le pone el nombre de transición justo
  // antes de navegar, así el navegador morfea la tarjeta en la cabecera del
  // módulo (ver docs/diseno.md, "Navegación y continuidad").
  function open(e: MouseEvent<HTMLAnchorElement>, m: ModuleDef) {
    // No navega si recién se soltó un arrastre/estirado, ni si el puntero se
    // movió (arrastre en curso). Mantener apretado sin mover SÍ abre el módulo.
    const movido = pressPos.current
      ? Math.hypot(e.clientX - pressPos.current.x, e.clientY - pressPos.current.y)
      : 0;
    if (Date.now() - ultimaInteraccion.current < 250 || movido > CLICK_SLOP_PX) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    (e.currentTarget as HTMLElement).style.viewTransitionName = 'module-hero';
    navigate(m.path, { viewTransition: true });
  }

  return (
    <div className="pt-4">
      {/* Saludo (y lo que hay para mirar, en la campana de arriba). */}
      <div className="mt-6">
        <p className="flex items-center gap-1.5 text-chico font-medium tracking-[0.14em] text-placeholder">
          <CalendarBlank weight="fill" className="size-3.5 shrink-0" />
          <span className="capitalize">{hoy}</span>
        </p>
        <h1 className="type-display mt-2 text-h1 font-semibold leading-tight [text-wrap:balance]">
          <span className="text-primary">{saludo()}</span>
          {nombre && <span className="text-foreground">, {nombre}</span>}
          <span className="text-primary">.</span>
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

      {canCaja && (
        <div className="mb-3 mt-5">
          <AbrirMostrador summary={summary} />
        </div>
      )}

      <div ref={containerRef} className="min-w-0">
        <ReactGridLayout
          key={gridNonce}
          layout={layoutFor}
          width={width}
          compactor={damero}
          gridConfig={{ cols: GRID_COLS, rowHeight: ROW_H, margin: [GAP, GAP], containerPadding: [0, 0], maxRows: MAX_ROWS }}
          dragConfig={{ cancel: '.tile-cancel', threshold: CLICK_SLOP_PX }}
          resizeConfig={{
            enabled: true,
            handles: ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'],
            // Los mismos gripes de siempre (CSS .tile-resize), pero manejados
            // por react-resizable: el ref es el que react-grid-layout espera
            // para amarrar el arrastre de estirado al mango.
            handleComponent: (axis, ref) => (
              <span
                ref={ref as Ref<HTMLSpanElement>}
                aria-hidden="true"
                className={cn('react-resizable-handle tile-resize', `tile-resize--${axis}`)}
              />
            ),
          }}
          onDragStop={layout => {
            ultimaInteraccion.current = Date.now();
            commit(layout);
          }}
          onResizeStop={layout => {
            ultimaInteraccion.current = Date.now();
            commit(layout);
          }}
        >
        {tiles.map(t => {
          const m = byKey.get(t.key);
          if (!m) return null;
          const stat = summary ? statFor(m.key, summary) : null;
          // Ventas estirada (2+ de ancho): el gráfico de facturación real
          // reemplaza a la minimapa — la tarjeta grande muestra la serie, no
          // solo la forma.
          const grafico = m.key === 'ventas' && t.w >= 2 && stat?.bars;
          return (
          <Link
            key={m.key}
            to={m.path}
            onClick={e => open(e, m)}
            onMouseEnter={() => prefetchRoute(m.path)}
            onFocus={() => prefetchRoute(m.path)}
            onMouseDown={e => {
              pressPos.current = { x: e.clientX, y: e.clientY };
              prefetchRoute(m.path);
            }}
            draggable={false}
            style={{ ['--ab-tile-hue' as string]: hueFor(m.key) }}
            className="module-tile group relative flex flex-col gap-2 overflow-hidden rounded-lg border pl-5 pr-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-offset-2"
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
            <h2 className="min-w-0 flex-1 truncate font-display text-h3 font-semibold tracking-tight text-foreground">
              {m.label}
            </h2>
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

            <button
              type="button"
              aria-label="Ocultar"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                ocultar(m.key);
              }}
              className="tile-cancel absolute right-2 top-2 z-10 rounded-md border border-border bg-card p-1.5 text-muted-foreground opacity-0 shadow-float transition-opacity hover:bg-background hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-offset-2 group-hover:opacity-100"
            >
              <EyeSlash className="size-3.5" />
            </button>
          </Link>
          );
        })}
        </ReactGridLayout>
      </div>

      {hidden.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-chico text-placeholder">Ocultos</span>
          {hidden.map(m => (
            <button
              key={m.key}
              type="button"
              onClick={() => mostrar(m.key)}
              className="flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:border-solid hover:text-foreground"
            >
              <Plus className="size-3" />
              {m.label}
            </button>
          ))}
        </div>
      )}

      {ultimoOculto && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 z-50 flex max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-md border border-border bg-card px-4 py-2.5 text-chico shadow-float"
        >
          <span>Ocultaste <strong>{ultimoOculto.label}</strong>.</span>
          <button
            type="button"
            onClick={deshacerOculto}
            className="rounded-md px-2 py-1 font-semibold text-primary hover:bg-background hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-offset-2"
          >
            Deshacer
          </button>
        </div>
      )}
    </div>
  );
}
