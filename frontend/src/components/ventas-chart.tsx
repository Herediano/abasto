import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

type Serie = {
  period: string;
  labels: string[];
  fact: (number | null)[];
  tick: (number | null)[];
  marg: (number | null)[];
  prevFact: (number | null)[];
  prevTick: (number | null)[];
  prevMarg: (number | null)[];
};

type Period = 'hoy' | 'semana' | 'mes' | 'anio';
type Metric = 'facturacion' | 'tickets' | 'ticketprom' | 'margen';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
  { key: 'anio', label: 'Año' },
];
const METRICS: { key: Metric; label: string }[] = [
  { key: 'facturacion', label: 'Facturación' },
  { key: 'margen', label: 'Margen' },
  { key: 'tickets', label: 'Tickets' },
  { key: 'ticketprom', label: 'Ticket promedio' },
];
const COMPARA: Record<Period, string> = {
  hoy: 'vs. ayer',
  semana: 'vs. semana pasada',
  mes: 'vs. mes pasado',
  anio: 'vs. año pasado',
};

const int = (n: number) => Math.round(n).toLocaleString('es-AR');
const pct = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';

function valueOf(metric: Metric, fact: number | null, tick: number | null, marg: number | null): number | null {
  if (fact == null && tick == null && marg == null) return null;
  if (metric === 'facturacion') return fact ?? 0;
  if (metric === 'margen') return marg ?? 0;
  if (metric === 'tickets') return tick ?? 0;
  return tick ? (fact ?? 0) / tick : 0;
}
const fmt = (metric: Metric, n: number | null) => (n == null ? '—' : metric === 'tickets' ? int(n) : money(n));

/**
 * El gráfico de ventas del módulo Ventas: el período elegido contra el anterior
 * comparable, en barras (la clara de atrás es el período previo). Los datos
 * vienen de GET /api/reportes/ventas.
 */
export function VentasChart() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [period, setPeriod] = useState<Period>('semana');
  const [metric, setMetric] = useState<Metric>('facturacion');
  const [serie, setSerie] = useState<Serie | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let vivo = true;
    setSerie(null);
    setError(false);
    api<Serie>(`/reportes/ventas?period=${period}`, {}, token)
      .then(s => vivo && setSerie(s))
      .catch(() => vivo && setError(true));
    return () => {
      vivo = false;
    };
  }, [period, token]);

  const derived = useMemo(() => {
    if (!serie) return null;
    const cur = serie.labels.map((_, i) => valueOf(metric, serie.fact[i], serie.tick[i], serie.marg[i]));
    const prev = serie.labels.map((_, i) => valueOf(metric, serie.prevFact[i], serie.prevTick[i], serie.prevMarg[i]));
    const totalCur = totalOf(metric, serie.fact, serie.tick, serie.marg);
    const lastIdx = cur.reduce<number>((l, v, i) => (v != null ? i : l), -1);
    const totalPrev = totalOf(
      metric,
      serie.prevFact.map((v, i) => (i <= lastIdx ? v : null)),
      serie.prevTick.map((v, i) => (i <= lastIdx ? v : null)),
      serie.prevMarg.map((v, i) => (i <= lastIdx ? v : null)),
    );
    const dp = totalPrev > 0 ? ((totalCur - totalPrev) / totalPrev) * 100 : null;
    const max = Math.max(1, ...cur.filter((v): v is number => v != null), ...prev.filter((v): v is number => v != null)) * 1.12;
    return { cur, prev, totalCur, totalPrev, dp, lastIdx, max };
  }, [serie, metric]);

  const W = 620;
  const H = 200;
  const mL = 8;
  const mB = 22;
  const ih = H - mB - 8;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex gap-0.5 rounded-md border border-border bg-background p-0.5">
          {PERIODS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              aria-pressed={period === p.key}
              className={cn(
                'rounded px-3 py-1 text-xs font-semibold transition-colors',
                period === p.key ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-end gap-4">
        <p className="type-display text-display leading-none tabular-nums">
          {derived ? fmt(metric, derived.totalCur) : '—'}
        </p>
        {derived?.dp != null && (
          <p className="pb-1 text-xs text-muted-foreground">
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 font-mono font-semibold',
                derived.dp >= 0.5 ? 'bg-success/15 text-success' : derived.dp <= -0.5 ? 'bg-destructive-soft text-destructive' : 'bg-muted text-muted-foreground',
              )}
            >
              {derived.dp >= 0.5 ? '▲ ' : derived.dp <= -0.5 ? '▼ ' : '= '}
              {pct(Math.abs(derived.dp))}
            </span>{' '}
            {COMPARA[period]}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {METRICS.map(m => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            aria-pressed={metric === m.key}
            className={cn(
              'rounded-full border px-2.5 py-1 text-micro font-semibold transition-colors',
              metric === m.key ? 'border-accent-border bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="relative mt-3">
        {error ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No se pudo cargar el gráfico.</p>
        ) : !serie || !derived ? (
          <div className="h-[200px] animate-pulse rounded-md bg-muted/50" />
        ) : (
          <>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="h-[200px] w-full overflow-visible"
              onMouseLeave={() => setHover(null)}
            >
              {[0, 0.5, 1].map(g => (
                <line
                  key={g}
                  x1={mL}
                  x2={W - mL}
                  y1={8 + ih - g * ih}
                  y2={8 + ih - g * ih}
                  stroke="var(--color-border)"
                  strokeWidth={g === 0 ? 1.2 : 1}
                />
              ))}
              {serie.labels.map((label, i) => {
                const slot = (W - mL * 2) / serie.labels.length;
                const cx = mL + slot * i + slot / 2;
                const bw = Math.min(slot * 0.5, 30);
                const pv = derived.prev[i];
                const nv = derived.cur[i];
                return (
                  <g key={i}>
                    {pv != null && (
                      <rect
                        x={cx - bw * 0.62}
                        y={8 + ih - (pv / derived.max) * ih}
                        width={bw * 1.24}
                        height={(pv / derived.max) * ih}
                        rx={3}
                        fill="color-mix(in srgb, var(--color-muted-foreground) 26%, transparent)"
                      />
                    )}
                    {nv != null && (
                      <rect
                        x={cx - bw / 2}
                        y={8 + ih - (nv / derived.max) * ih}
                        width={bw}
                        height={(nv / derived.max) * ih}
                        rx={3}
                        fill={i === derived.lastIdx ? 'var(--color-primary)' : 'color-mix(in srgb, var(--color-primary) 34%, var(--color-border))'}
                        opacity={hover == null || hover === i ? 1 : 0.55}
                      />
                    )}
                    <text x={cx} y={H - 6} textAnchor="middle" fontSize={9.5} fill="var(--color-placeholder)">
                      {label}
                    </text>
                    <rect
                      x={mL + slot * i}
                      y={8}
                      width={slot}
                      height={ih}
                      fill="transparent"
                      onMouseEnter={() => setHover(i)}
                    />
                  </g>
                );
              })}
            </svg>
            {hover != null && derived.cur[hover] != null && (
              <div className="pointer-events-none absolute -top-1 left-0 rounded-md border border-border bg-foreground px-2.5 py-1.5 text-micro leading-tight text-background shadow-float"
                style={{ left: `${((hover + 0.5) / serie.labels.length) * 100}%`, transform: 'translate(-50%,-100%)' }}
              >
                <b className="font-mono">{serie.labels[hover]}</b>
                <br />
                {fmt(metric, derived.cur[hover])}
                {derived.prev[hover] != null && derived.prev[hover]! > 0 && (
                  <>
                    <br />
                    <span className={cn(derived.cur[hover]! >= derived.prev[hover]! ? 'text-success' : 'text-destructive')}>
                      {derived.cur[hover]! >= derived.prev[hover]! ? '▲ ' : '▼ '}
                      {pct(Math.abs(((derived.cur[hover]! - derived.prev[hover]!) / derived.prev[hover]!) * 100))} {COMPARA[period]}
                    </span>
                  </>
                )}
                {metric !== 'tickets' && serie.tick[hover] != null && (
                  <>
                    <br />
                    {int(serie.tick[hover]!)} tickets
                  </>
                )}
              </div>
            )}
          </>
        )}
        <div className="mt-2.5 flex gap-4 text-micro text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <i className="inline-block size-2.5 rounded-sm" style={{ background: 'var(--color-primary)' }} /> Período actual
          </span>
          <span className="flex items-center gap-1.5">
            <i className="inline-block size-2.5 rounded-sm" style={{ background: 'color-mix(in srgb, var(--color-muted-foreground) 34%, transparent)' }} /> Período anterior
          </span>
        </div>
      </div>
    </div>
  );
}

function totalOf(metric: Metric, fact: (number | null)[], tick: (number | null)[], marg: (number | null)[]): number {
  let sf = 0;
  let st = 0;
  let sm = 0;
  for (let i = 0; i < fact.length; i++) {
    if (fact[i] != null) sf += fact[i] as number;
    if (tick[i] != null) st += tick[i] as number;
    if (marg[i] != null) sm += marg[i] as number;
  }
  if (metric === 'facturacion') return sf;
  if (metric === 'margen') return sm;
  if (metric === 'tickets') return st;
  return st ? sf / st : 0;
}
