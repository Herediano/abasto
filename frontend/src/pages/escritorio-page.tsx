import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { CashRegister, DotsSixVertical, EyeSlash, GearSix, Plus, Sparkle, type Icon } from '@phosphor-icons/react';
import { Link, useNavigate } from 'react-router-dom';
import { BranchSwitcher } from '@/components/branch-switcher';
import { UserMenu } from '@/components/user-menu';
import { usePalette } from '@/components/layout/escritorio-shell';
import { ModuleMotif, gridModules, hueFor, type ModuleDef } from '@/lib/modules';
import { api } from '@/lib/api';
import { pendientes, statFor, type EscritorioSummary } from '@/lib/escritorio';
import { useAuth } from '@/lib/auth-context';
import { useTiles } from '@/lib/prefs';
import { setActiveBranch } from '@/lib/branch';
import { cn } from '@/lib/utils';

const CONFIG_KEY = 'abasto-escritorio';

/** Mayúscula inicial y nada más: el renglón de contexto ya viene en minúscula. */
const cap = (s: string) => (s ? s.charAt(0).toLocaleUpperCase('es-AR') + s.slice(1) : s);

/** El saludo según la hora: mañana, tarde o noche. */
function saludo(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Buen día';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

/**
 * "Para mirar hoy" bajo el saludo: un chip por pendiente, cada uno con el color
 * del módulo al que lleva (mismo tratamiento que las tarjetas, en chico). En
 * calma, una sola frase. Cargando, un placeholder discreto.
 */
function ResumenDelDia({ summary }: { summary: EscritorioSummary | null }) {
  if (!summary) return <p className="mt-3 text-chico text-placeholder">Cargando el estado del negocio…</p>;
  const items = pendientes(summary);
  if (items.length === 0) return <p className="mt-3 text-chico text-muted-foreground">Hoy no hay nada urgente.</p>;
  return (
    <div className="mt-4">
      <p className="mb-2 text-chico font-medium text-muted-foreground">Para mirar hoy</p>
      <div className="flex flex-wrap gap-2">
        {items.map(it => (
          <Link
            key={it.path}
            to={it.path}
            viewTransition
            style={{ ['--h' as string]: hueFor(it.module) }}
            className="pendiente-chip flex items-center gap-2 rounded-md border px-3 py-1.5 text-chico font-medium text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-offset-2"
          >
            <span className="pendiente-chip__dot size-1.5 rounded-full" />
            {it.label}
            {it.count > 1 && <span className="font-semibold text-muted-foreground">{it.count}</span>}
          </Link>
        ))}
      </div>
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
  const hora = caja?.desde ? new Date(caja.desde).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '';
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
        {atajo && (
          <kbd className="rounded-sm bg-muted px-1 font-mono text-micro font-normal text-muted-foreground">{atajo}</kbd>
        )}
      </span>
      <span className="text-micro leading-snug text-muted-foreground">{contexto}</span>
    </button>
  );
}

type Config = { hidden: string[]; order: string[] };

function readConfig(): Config {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Config>;
      return { hidden: parsed.hidden ?? [], order: parsed.order ?? [] };
    }
  } catch {
    // Sin persistencia: el escritorio arranca en su orden de fábrica.
  }
  return { hidden: [], order: [] };
}

function writeConfig(config: Config) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Modo privado: la configuración vale para esta sesión y nada más.
  }
}

/** Ordena los módulos visibles según la configuración del usuario (los que no están en `order` van al final, en su orden de fábrica). */
function applyOrder(mods: ModuleDef[], order: string[]): ModuleDef[] {
  const rank = new Map(order.map((key, i) => [key, i]));
  return [...mods].sort((a, b) => (rank.get(a.key) ?? 999) - (rank.get(b.key) ?? 999));
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
  const mods = useMemo(() => applyOrder(gridModules(can), config.order), [can, config.order]);
  const visible = mods.filter(m => !config.hidden.includes(m.key));
  const hidden = mods.filter(m => config.hidden.includes(m.key));

  const nombre = session?.user.name.split(' ')[0] ?? '';
  const hoy = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

  function update(next: Config) {
    setConfig(next);
    writeConfig(next);
  }
  const toggleHidden = (key: string) =>
    update(
      config.hidden.includes(key)
        ? { ...config, hidden: config.hidden.filter(k => k !== key) }
        : { ...config, hidden: [...config.hidden, key] },
    );
  // Arrastrar para reordenar (modo Configurar). Al pasar por encima de otra
  // tarjeta se reordena en vivo; el orden queda guardado en localStorage.
  const dropOn = (targetKey: string) => {
    if (!dragKey || dragKey === targetKey) return;
    const keys = visible.map(m => m.key);
    const from = keys.indexOf(dragKey);
    const to = keys.indexOf(targetKey);
    if (from < 0 || to < 0) return;
    keys.splice(to, 0, keys.splice(from, 1)[0]);
    update({ ...config, order: [...keys, ...hidden.map(m => m.key)] });
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
          <UserMenu />
        </div>
      </header>

      {/* Saludo y qué hay para mirar. */}
      <div className="mt-4">
        <p className="text-chico text-placeholder first-letter:uppercase">{hoy}</p>
        <h1 className="type-display mt-1 text-h1 leading-tight">
          {saludo()}{nombre && `, ${nombre}`}.
        </h1>
        <ResumenDelDia summary={summary} />
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
            contexto={configuring ? 'Arrastrá para ordenar, tocá el ojo para ocultar' : 'Ocultá, ordená y cambiá el tamaño'}
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

      <div className={cn('escritorio-grid grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3', tiles === 'chica' ? 'tiles-chica' : tiles === 'grande' ? 'tiles-grande' : '')}>
        {visible.map(m => {
          const stat = summary ? statFor(m.key, summary) : null;
          return (
          <Link
            key={m.key}
            to={m.path}
            onClick={e => open(e, m)}
            style={{ ['--ab-tile-hue' as string]: hueFor(m.key) }}
            draggable={configuring}
            onDragStart={() => setDragKey(m.key)}
            onDragEnd={() => setDragKey(null)}
            onDragOver={e => {
              if (configuring && dragKey) {
                e.preventDefault();
                dropOn(m.key);
              }
            }}
            className={cn(
              'module-tile group relative flex min-h-[168px] flex-col gap-2 overflow-hidden rounded-lg border pl-5 pr-4 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-offset-2',
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
                  'absolute right-3.5 top-3.5 size-[7px] rounded-full',
                  stat.flag === 'hot' ? 'bg-destructive' : 'bg-warning',
                )}
              />
            )}
            <div className="flex items-center gap-2">
              <span className="module-tile__chip flex size-8 shrink-0 items-center justify-center rounded-md">
                <m.Icon weight="fill" className="size-[18px]" />
              </span>
              <h2 className="min-w-0 flex-1 truncate font-display text-h3 font-semibold tracking-tight [text-wrap:balance]">
                {m.label}
              </h2>
            </div>
            {/* El dato clave arriba; la descripción abajo es SOLO lo que el dato
                no cuenta (ejemplos, tendencia, plazos) — una línea, lo útil.
                Monocromo: el dato no se tiñe; si algo está mal, lo dice el puntito. */}
            <div className="mt-auto flex flex-col justify-end">
              {stat && (
                <p className="tabular truncate font-display text-h2 font-semibold leading-tight tracking-tight">
                  {stat.value}
                </p>
              )}
              <p className="mt-0.5 truncate text-micro leading-snug text-muted-foreground">
                {cap(stat?.hint ?? m.blurb)}
              </p>
            </div>

            {configuring && (
              <>
                <DotsSixVertical className="absolute left-1/2 top-2 size-4 -translate-x-1/2 text-placeholder" />
                <button
                  type="button"
                  aria-label="Ocultar"
                  onClick={e => {
                    e.preventDefault();
                    toggleHidden(m.key);
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
              onClick={() => toggleHidden(m.key)}
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
