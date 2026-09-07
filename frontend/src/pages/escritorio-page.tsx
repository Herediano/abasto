import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { CashRegister, DotsSixVertical, EyeSlash, GearSix, Plus, Sparkle, type Icon } from '@phosphor-icons/react';
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
import { useTiles, type TileSize } from '@/lib/prefs';
import { setActiveBranch } from '@/lib/branch';
import { cn } from '@/lib/utils';

const CONFIG_KEY = 'abasto-escritorio';

/** Las tarjetas protagonistas: más altas y con detalle — el dato que alcanza
 *  para decidir sin entrar al módulo. Sales de la casa (ventas, con su minimapa
 *  de 7 días), lo que hay en la calle (clientes/cuenta corriente) y lo que hay
 *  que reponer (stock y compras por cargar — los dos con la lista de quiénes).
 *  Todas las tarjetas calzan en una celda del tablero, sin romper su grilla. */
const PROTAGONISTAS = new Set(['ventas', 'clientes', 'stock', 'compras']);

/** Mayúscula inicial y nada más: el renglón de contexto ya viene en minúscula. */
const cap = (s: string) => (s ? s.charAt(0).toLocaleUpperCase('es-AR') + s.slice(1) : s);

/** El saludo según la hora: mañana, tarde o noche. */
function saludo(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Buen día';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Minimapa de tendencia de la tarjeta protagonista de Ventas: los últimos 7
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
 * arrastrando dentro del modo Configurar; el tablero queda guardado en
 * localStorage.
 */
type Config = { hidden: string[]; board: (string | null)[] };

/** Columnas fijas del tablero según el preset de tamaño (la última es el
 * flanco): chica 6, mediana 5, grande 4 — cada preset hace tarjetas más anchas
 * con menos columnas, como antes. */
const TOTAL_COLS: Record<TileSize, number> = { chica: 6, mediana: 5, grande: 4 };

function readConfig(): Config {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Config>;
      if (Array.isArray(parsed.board)) return { hidden: parsed.hidden ?? [], board: parsed.board };
      // Compat con el formato viejo (order + hidden): se vuelca el orden al
      // tablero fijo en mediana, tarjetas por fila y el flanco vacío.
      const viejo = parsed as Partial<{ order: string[]; hidden: string[] }>;
      const order = viejo.order ?? [];
      const hidden = viejo.hidden ?? [];
      const keys = order.filter(k => !hidden.includes(k));
      const contenido = TOTAL_COLS.mediana - 1;
      const rows = Math.max(1, Math.ceil(keys.length / contenido));
      const board: (string | null)[] = Array(rows * TOTAL_COLS.mediana).fill(null);
      keys.forEach((k, i) => {
        board[Math.floor(i / contenido) * TOTAL_COLS.mediana + (i % contenido)] = k;
      });
      return { hidden, board };
    }
  } catch {
    // Sin persistencia: el escritorio arranca en su orden de fábrica.
  }
  return { hidden: [], board: [] };
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
  const { tiles, setTiles } = useTiles();
  const [config, setConfig] = useState<Config>(readConfig);
  const [configuring, setConfiguring] = useState(false);
  const [summary, setSummary] = useState<EscritorioSummary | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);

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
  const cols = TOTAL_COLS[tiles];
  // Tablero normalizado: filas completas (la última columna es el flanco de
  // vacíos). Las celdas nulas son huecos visibles. Se autocompone si el tamaño
  // guardado quedó corto (cambio de preset o config vieja).
  const cells = useMemo(() => {
    const rows = Math.max(1, Math.ceil(config.board.length / cols));
    return Array.from({ length: rows * cols }, (_, i) => config.board[i] ?? null);
  }, [config.board, cols]);
  const hidden = config.hidden.map(k => byKey.get(k)).filter((m): m is ModuleDef => !!m);

  const nombre = session?.user.name.split(' ')[0] ?? '';
  const hoy = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

  function update(next: Config) {
    setConfig(next);
    writeConfig(next);
  }
  // Ocultar deja el hueco visible en el tablero.
  const ocultar = (key: string) => {
    if (config.hidden.includes(key)) return;
    const c = cells.slice();
    const i = c.indexOf(key);
    if (i >= 0) c[i] = null;
    update({ ...config, board: c, hidden: [...config.hidden, key] });
  };
  // Mostrar va a la primera celda vacía; si el tablero está lleno, crece una fila.
  const mostrar = (key: string) => {
    const c = cells.slice();
    let i = c.indexOf(null);
    if (i < 0) {
      const inicio = c.length;
      for (let k = 0; k < cols; k++) c.push(null);
      i = inicio;
    }
    c[i] = key;
    update({ ...config, board: c, hidden: config.hidden.filter(k => k !== key) });
  };
  // Arrastrar (modo Configurar). Soltar sobre una celda ocupada es intercambio;
  // sobre una vacía es mudanza — el hueco queda donde estaba. El tablero se
  // reordena en vivo y se guarda en localStorage.
  const dropCell = (j: number) => {
    if (!dragKey) return;
    const c = cells.slice();
    const i = c.indexOf(dragKey);
    if (i < 0 || i === j) return;
    c[i] = c[j];
    c[j] = dragKey;
    update({ ...config, board: c });
  };
  const dropOver = (e: { preventDefault: () => void }, j: number) => {
    if (configuring && dragKey) {
      e.preventDefault();
      dropCell(j);
    }
  };

  // La tarjeta se despliega al módulo: se le pone el nombre de transición justo
  // antes de navegar, así el navegador morfea la tarjeta en la cabecera del
  // módulo (ver docs/diseno.md, "Navegación y continuidad").
  function open(e: MouseEvent<HTMLAnchorElement>, m: ModuleDef) {
    if (configuring) {
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
            icon={GearSix}
            fill={configuring}
            franja={hueFor('ajustes')}
            titulo={configuring ? 'Listo' : 'Configurar'}
            contexto={configuring ? 'Arrastrá para mover o intercambiar, tocá el ojo para ocultar' : 'Tablero fijo: ordená, ocultá y cambiá el tamaño'}
            activa={configuring}
            onClick={() => setConfiguring(v => !v)}
          />
          {configuring && (
            <div
              style={{ ['--ab-edge' as string]: hueFor('ajustes') }}
              className="relative flex flex-col justify-center gap-1.5 overflow-hidden rounded-lg border border-border bg-card px-6 py-2.5"
            >
              <span
                className="pointer-events-none absolute inset-y-0 left-0 w-1.5"
                style={{ background: 'var(--ab-edge)' }}
                aria-hidden="true"
              />
              <span className="text-micro font-medium text-muted-foreground">Tamaño de las tarjetas</span>
              <div role="group" aria-label="Tamaño de las tarjetas" className="flex items-center gap-1">
                {(['chica', 'mediana', 'grande'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTiles(t)}
                    aria-pressed={tiles === t}
                    className={cn(
                      'rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors first-letter:uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-offset-2',
                      tiles === t
                        ? 'border-accent-border bg-accent text-accent-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
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
        className={cn('escritorio-grid grid gap-3', tiles === 'chica' ? 'tiles-chica' : tiles === 'grande' ? 'tiles-grande' : '')}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {cells.map((key, i) => {
          const m = key ? byKey.get(key) : undefined;
          if (!m) {
            return (
              <div
                aria-hidden={!configuring}
                aria-label={configuring ? 'Casilla vacía: soltá una tarjeta acá' : undefined}
                onDragOver={e => dropOver(e, i)}
                className={cn(
                  'escritorio-slot flex min-h-[168px] items-center justify-center rounded-lg border border-dashed transition-colors',
                  configuring ? 'border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10' : 'border-border/40',
                )}
              >
                {configuring && <Plus className="size-4 text-placeholder" aria-hidden="true" />}
              </div>
            );
          }
          const stat = summary ? statFor(m.key, summary) : null;
          const protagonista = PROTAGONISTAS.has(m.key);
          return (
          <Link
            key={m.key}
            to={m.path}
            onClick={e => open(e, m)}
            style={{ ['--ab-tile-hue' as string]: hueFor(m.key) }}
            draggable={configuring}
            onDragStart={() => setDragKey(m.key)}
            onDragEnd={() => setDragKey(null)}
            onDragOver={e => dropOver(e, i)}
            className={cn(
              'module-tile group relative flex min-h-[168px] flex-col gap-2 overflow-hidden rounded-lg border pl-5 pr-4 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-offset-2',
              protagonista && 'module-tile--featured',
              configuring && 'cursor-grab active:cursor-grabbing',
              dragKey === m.key && 'opacity-40',
            )}
          >
            <span className="module-tile__spine pointer-events-none absolute inset-y-0 left-0 w-1.5" aria-hidden="true" />
            <ModuleMotif
              motif={m.motif}
              className="module-tile__motif pointer-events-none absolute -bottom-4 -right-4 size-[104px] transition-opacity"
            />
            {stat?.flag && !configuring && (
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
              {protagonista && stat ? (
                <>
                  {stat.rows && stat.rows.length > 0 ? (
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
                      <p className="mt-0.5 truncate text-micro leading-snug text-muted-foreground">{cap(stat.hint)}</p>
                      {stat.bars && <MiniBars bars={stat.bars} hue={hueFor(m.key)} />}
                    </>
                  )}
                </>
              ) : (
                <p className="mt-0.5 truncate text-micro leading-snug text-muted-foreground">{cap(stat?.hint ?? m.blurb)}</p>
              )}
            </div>

            {configuring && (
              <>
                <DotsSixVertical className="absolute left-1/2 top-2 size-4 -translate-x-1/2 text-placeholder" />
                <button
                  type="button"
                  aria-label="Ocultar"
                  onClick={e => {
                    e.preventDefault();
                    ocultar(m.key);
                  }}
                  className="absolute right-2 top-2 z-10 rounded-md border border-border bg-card p-1.5 text-muted-foreground shadow-float hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-offset-2"
                >
                  <EyeSlash className="size-3.5" />
                </button>
              </>
            )}
          </Link>
          );
        })}
      </div>

      {configuring && hidden.length > 0 && (
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
