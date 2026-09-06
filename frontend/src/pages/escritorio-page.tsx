import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { ArrowRight, CashRegister, DotsSixVertical, EyeSlash, GearSix, Plus, Sparkle } from '@phosphor-icons/react';
import { Link, useNavigate } from 'react-router-dom';
import { BranchSwitcher } from '@/components/branch-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { usePalette } from '@/components/layout/escritorio-shell';
import { ModuleMotif, gridModules, hueFor, type ModuleDef } from '@/lib/modules';
import { api } from '@/lib/api';
import { pendientes, statFor, type EscritorioSummary } from '@/lib/escritorio';
import { money } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { setActiveBranch } from '@/lib/branch';
import { useDensity } from '@/lib/prefs';
import { cn } from '@/lib/utils';

const CONFIG_KEY = 'abasto-escritorio';

/** Mayúscula inicial y nada más: el renglón de contexto ya viene en minúscula. */
const sentence = (s: string) => (s ? s.charAt(0).toLocaleUpperCase('es-AR') + s.slice(1) : s);

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
  if (!summary) return <p className="mt-3 text-[13px] text-placeholder">Cargando el estado del negocio…</p>;
  const items = pendientes(summary);
  if (items.length === 0) return <p className="mt-3 text-[13px] text-muted-foreground">Hoy no hay nada urgente.</p>;
  return (
    <div className="mt-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-placeholder">Para mirar hoy</p>
      <div className="flex flex-wrap gap-2">
        {items.map(it => (
          <Link
            key={it.path}
            to={it.path}
            viewTransition
            style={{ ['--h' as string]: hueFor(it.module) }}
            className="pendiente-chip group flex items-center gap-2 rounded-md border px-3 py-1.5 text-[12.5px] font-medium text-foreground transition-colors"
          >
            <span className="pendiente-chip__dot size-1.5 rounded-full" />
            {it.label}
            {it.count > 1 && <span className="font-semibold text-muted-foreground">{it.count}</span>}
            <ArrowRight className="size-3 text-placeholder transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}

/**
 * La caja no es una tarjeta más: es un modo de trabajo (pantalla completa, el
 * mundo del cajero). Va en un botón propio, ancho, con el color de Caja lleno
 * —distinto de la grilla— y su estado de turno al costado.
 */
function CajaButton({ summary }: { summary: EscritorioSummary | null }) {
  const navigate = useNavigate();
  const caja = summary?.caja;
  const detalle = !caja
    ? 'Cobrá en el mostrador'
    : caja.abierta
      ? ['Abierta', caja.efectivo != null ? money(caja.efectivo).replace(',00', '') : null, caja.registro].filter(Boolean).join(' · ')
      : 'Sin turno abierto';
  return (
    <button
      type="button"
      onClick={() => navigate('/ventas')}
      style={{ background: hueFor('caja') }}
      className="group mt-6 flex w-full items-center gap-4 rounded-xl px-5 py-4 text-left text-white shadow-float transition-transform hover:-translate-y-0.5"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-white/15">
        <CashRegister weight="fill" className="size-6" />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block whitespace-nowrap font-display text-[15px] font-bold">Ir a la caja</span>
        <span className="block truncate text-[12.5px] text-white/80">{detalle}</span>
      </span>
      <ArrowRight className="size-5 shrink-0 opacity-80 transition-transform group-hover:translate-x-0.5" />
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

  const mods = useMemo(() => applyOrder(gridModules(can), config.order), [can, config.order]);
  const visible = mods.filter(m => !config.hidden.includes(m.key));
  const hidden = mods.filter(m => config.hidden.includes(m.key));
  const { density, setDensity } = useDensity();

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
    <div className="pt-5">
      {/* Barra: identidad —los dos logos— a la izquierda, herramientas a la derecha. */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-border-soft pb-5">
        <div className="flex items-center gap-3.5">
          {session?.tenant.logo ? (
            <img
              src={session.tenant.logo}
              alt={session.tenant.name}
              className="size-14 shrink-0 rounded-2xl border border-border bg-card object-contain p-1"
            />
          ) : (
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary font-display text-2xl font-bold text-primary-foreground">
              {session?.tenant.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="leading-tight">
            <p className="font-display text-xl font-bold tracking-tight">{session?.tenant.name}</p>
            <p className="mt-0.5 font-display text-[15px] font-bold tracking-tight text-muted-foreground">
              abasto<span className="text-primary">.ai</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <BranchSwitcher />
          <ThemeToggle className="size-10 rounded-lg border border-border bg-card hover:bg-background" />
          <UserMenu />
        </div>
      </header>

      {/* Saludo y qué hay para mirar. */}
      <div className="mt-7">
        <p className="text-[12px] font-medium uppercase tracking-wide text-placeholder first-letter:uppercase">{hoy}</p>
        <h1 className="mt-1.5 font-display text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]">
          {saludo()}{nombre && `, ${nombre}`}.
        </h1>
        <ResumenDelDia summary={summary} />
        {session?.user.branch && session.user.homeBranch && session.user.branch.id !== session.user.homeBranch.id && (
          <p className="mt-3 text-[12px] text-muted-foreground">
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

      {can('caja.operar') && <CajaButton summary={summary} />}

      <div className="mb-4 mt-9 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-placeholder">
          {visible.length} {visible.length === 1 ? 'módulo' : 'módulos'}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openPalette}
            className="group flex items-center gap-2 rounded-md border border-accent-border bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <Sparkle weight="fill" className="size-3.5" />
            Preguntar
            <kbd className="rounded bg-primary/10 px-1 font-mono text-[10px] font-normal group-hover:bg-primary-foreground/15">Ctrl K</kbd>
          </button>
          <button
            type="button"
            onClick={() => setConfiguring(v => !v)}
            className={cn(
              'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors',
              configuring
                ? 'border-accent-border bg-accent text-accent-foreground'
                : 'border-border text-muted-foreground hover:bg-card hover:text-foreground',
            )}
          >
            <GearSix weight={configuring ? 'fill' : 'regular'} className="size-3.5" />
            {configuring ? 'Listo' : 'Configurar'}
          </button>
        </div>
      </div>

      {configuring && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-accent-border bg-accent/40 px-4 py-3 text-[13px]">
          <span className="font-medium">Densidad de las tablas</span>
          <div className="flex gap-1.5">
            {(['comoda', 'compacta'] as const).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDensity(d)}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors',
                  density === d ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:bg-background',
                )}
              >
                {d === 'comoda' ? 'Cómoda' : 'Compacta'}
              </button>
            ))}
          </div>
          <span className="text-muted-foreground">Se aplica a todos los listados del sistema.</span>
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
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
              'module-tile group relative flex min-h-[168px] flex-col gap-2 overflow-hidden rounded-lg border pl-5 pr-4 py-4 transition-all',
              configuring ? 'cursor-grab active:cursor-grabbing' : 'hover:-translate-y-0.5',
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
            <div className="module-tile__chip flex size-9 items-center justify-center rounded-[10px]">
              <m.Icon weight="fill" className="size-[18px]" />
            </div>
            <p className="text-[13px] font-semibold">{m.label}</p>
            {/* Renglón de contexto: espacio fijo en todas las tarjetas, misma
                fuente y tamaño, pegado abajo. El dato clave crece por encima. */}
            <div className="mt-auto flex min-h-[3.25rem] flex-col justify-end">
              {stat && (
                <p className="tabular font-display text-[18px] font-bold leading-tight tracking-tight">{stat.value}</p>
              )}
              <p className="mt-0.5 line-clamp-2 min-h-[2rem] text-[11px] leading-snug text-muted-foreground">
                {sentence(stat?.hint ?? m.blurb)}
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
                  className="absolute right-2 top-2 z-10 rounded-md border border-border bg-card p-1.5 text-muted-foreground shadow-float hover:bg-background hover:text-foreground"
                >
                  <EyeSlash className="size-3.5" />
                </button>
              </>
            )}
            {!configuring && !stat?.flag && (
              <ArrowRight className="absolute right-4 top-4 size-4 text-placeholder opacity-0 transition-opacity group-hover:opacity-100" />
            )}
          </Link>
          );
        })}
      </div>

      {configuring && hidden.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-placeholder">Ocultos</span>
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

      <p className="mt-8 max-w-prose border-t border-border pt-4 text-[11.5px] text-placeholder">
        El escritorio muestra lo que tu rango puede tocar. Tocá una tarjeta para entrar y
        <kbd className="mx-1 rounded border border-border px-1 font-mono">Esc</kbd> te trae de vuelta.
      </p>
    </div>
  );
}
