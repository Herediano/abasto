import { useEffect, useState } from 'react';
import { ArrowRight, Calculator, Eye, FloppyDisk, Play, Plus, TrendUp, Warning, X } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Field } from '@/components/field';
import { Spinner } from '@/components/spinner';
import { ModuleSection } from '@/components/module-screen';
import {
  api,
  errorMessage,
  type BulkResult,
  type Category,
  type PriceList,
  type PriceRounding,
  type PriceRule,
  type PriceSelection,
  type RoundingRule,
  type ScheduledChange,
} from '@/lib/api';
import { fecha, inputDate, money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { SelectionBuilder } from './selection-builder';

/**
 * Actualización masiva de precios, en tres pasos: **a quién** (la selección),
 * **qué le hago** (la operación) y **revisar antes de aplicar**.
 *
 * Antes era una grilla de ocho selectores donde había que saber de antemano que
 * "target" y "operación" no se combinaban libremente. Los dos cambios de fondo:
 *
 * 1. Las operaciones se nombran por el trabajo real, no por la cuenta. La
 *    primera —el aumento del proveedor— **mueve costo y venta juntos**, que es
 *    lo que hay que hacer y antes no se podía: tocar sólo el costo deja la venta
 *    vieja y se come el margen sin avisar.
 * 2. El redondeo es un modificador del resultado, no una operación aparte. Ya
 *    no hacen falta dos pasadas (y dos entradas de historial) para aumentar y
 *    dejar el precio prolijo.
 */

type Props = {
  token: string;
  priceLists: PriceList[];
  categories: Category[];
  priceListId: string;
  onPriceListChange: (id: string) => void;
  onError: (message: string) => void;
  onMessage: (message: string) => void;
};

/** Una operación como la piensa el usuario, traducida al par (operación, target) del backend. */
type OpKey = 'supplierIncrease' | 'sale' | 'cost' | 'margin' | 'round';

const OPERACIONES: Array<{
  key: OpKey;
  titulo: string;
  detalle: string;
  tipo: 'percent' | 'margin' | 'round' | 'supplierIncrease';
  target: 'salePrice' | 'costPrice';
  campo?: string;
  Icon: typeof TrendUp;
  cuidado?: string;
}> = [
  {
    key: 'supplierIncrease',
    titulo: 'Me aumentó el proveedor',
    detalle: 'Sube el costo y traslada el mismo % al precio de venta. Cada producto conserva su margen.',
    tipo: 'supplierIncrease',
    target: 'salePrice',
    campo: 'Cuánto aumentó (%)',
    Icon: TrendUp,
  },
  {
    key: 'sale',
    titulo: 'Cambiar el precio de venta',
    detalle: 'Sube o baja la venta sin tocar el costo. Para un aumento general o una liquidación.',
    tipo: 'percent',
    target: 'salePrice',
    campo: 'Porcentaje (negativo = baja)',
    Icon: Calculator,
  },
  {
    key: 'margin',
    titulo: 'Fijar un margen',
    detalle: 'Recalcula la venta como costo + X%. Aplana a todos al mismo margen.',
    tipo: 'margin',
    target: 'salePrice',
    campo: 'Margen sobre el costo (%)',
    Icon: Calculator,
  },
  {
    key: 'cost',
    titulo: 'Corregir sólo el costo',
    detalle: 'Ajusta el costo y deja la venta como está.',
    tipo: 'percent',
    target: 'costPrice',
    campo: 'Porcentaje',
    Icon: Warning,
    cuidado: 'La venta no se mueve, así que el margen cambia. Para un aumento de proveedor usá la primera opción.',
  },
  {
    key: 'round',
    titulo: 'Sólo redondear',
    detalle: 'Deja el precio donde está, pero prolijo.',
    tipo: 'round',
    target: 'salePrice',
    Icon: Calculator,
  },
];

const REDONDEOS: Array<{ value: PriceRounding; label: string }> = [
  { value: 'nearest10', label: 'A la decena' },
  { value: 'nearest100', label: 'A la centena' },
  { value: 'ending99', label: 'Terminación 99' },
  { value: 'byRules', label: 'Mi política por tramos' },
];

const MODOS_REDONDEO: Record<string, string> = {
  nearest10: 'a la decena',
  nearest100: 'a la centena',
  ending99: 'a terminación 99',
  none: 'sin redondear',
};

/**
 * Mismo cálculo que `aplicarModo` del backend, para mostrar un ejemplo en vivo.
 * El nombre del modo no dice nada; ver "1.234 → 1.299" sí.
 */
function ejemplo(value: number, mode: string): number {
  if (mode === 'nearest10') return Math.round(value / 10) * 10;
  if (mode === 'nearest100') return Math.round(value / 100) * 100;
  if (mode === 'ending99') {
    const base = Math.floor(value / 100) * 100;
    const bajo = base - 1;
    const alto = base + 99;
    if (bajo < 0) return alto;
    return value - bajo <= alto - value ? bajo : alto;
  }
  return Math.round(value * 100) / 100;
}

/** Antes → después en una celda, con el margen en rojo si empeora. */
function Delta({ before, after, formato }: { before: number | null; after: number | null; formato: (n: number) => string }) {
  if (after === null) return <span className="text-muted-foreground">—</span>;
  const empeora = before !== null && after < before;
  return (
    <span className="whitespace-nowrap">
      {before === null ? <span className="text-muted-foreground">sin valor</span> : <span className="text-muted-foreground">{formato(before)}</span>}
      <ArrowRight size={11} className="mx-1 inline opacity-50" />
      <span className={cn('font-medium', empeora && 'text-destructive')}>{formato(after)}</span>
    </span>
  );
}

export function BulkUpdate({ token, priceLists, categories, priceListId, onPriceListChange, onError, onMessage }: Props) {
  const [selection, setSelection] = useState<PriceSelection>({});
  const [seleccionados, setSeleccionados] = useState(0);
  const [opKey, setOpKey] = useState<OpKey>('supplierIncrease');
  const [valor, setValor] = useState('');
  const [usarMargenCategoria, setUsarMargenCategoria] = useState(false);
  const [redondear, setRedondear] = useState(false);
  const [rounding, setRounding] = useState<PriceRounding>('nearest10');
  const [validFrom, setValidFrom] = useState('');

  const [preview, setPreview] = useState<BulkResult | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [aplicando, setAplicando] = useState(false);

  const [rules, setRules] = useState<PriceRule[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledChange[]>([]);
  const [tramos, setTramos] = useState<RoundingRule[]>([]);
  const [nuevoTramo, setNuevoTramo] = useState({ fromAmount: '', toAmount: '', mode: 'nearest10' });

  const [nombreCriterio, setNombreCriterio] = useState('');
  const [guardarValor, setGuardarValor] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [pidiendoValor, setPidiendoValor] = useState<PriceRule | null>(null);
  const [valorCriterio, setValorCriterio] = useState('');

  const op = OPERACIONES.find(o => o.key === opKey)!;
  const lista = priceLists.find(l => l.id === priceListId);
  const listaDerivada = !!lista?.derivesFromId;
  const escribeVenta = op.tipo !== 'percent' || op.target === 'salePrice';
  const bloqueada = listaDerivada && escribeVenta;
  const puedeUsarMargenCategoria = opKey === 'margin';
  const usaMargenCategoria = puedeUsarMargenCategoria && usarMargenCategoria;
  const necesitaValor = op.tipo !== 'round' && !usaMargenCategoria;
  const listo = seleccionados > 0 && (!necesitaValor || valor.trim() !== '') && !bloqueada;

  // Los criterios de "tier" (precio por cantidad) se guardan y se muestran en
  // la otra sub-pestaña, con su propia forma (cantidad + %) que no encaja acá.
  const loadRules = () => api<PriceRule[]>('/price-rules', {}, token).then(r => setRules(r.filter(x => x.operationType !== 'tier'))).catch(() => {});
  const loadScheduled = () => api<ScheduledChange[]>('/prices/scheduled', {}, token).then(setScheduled).catch(() => {});
  const loadTramos = () => api<RoundingRule[]>('/prices/rounding-rules', {}, token).then(setTramos).catch(() => {});

  useEffect(() => {
    loadRules();
    loadScheduled();
    loadTramos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // La previa deja de valer en cuanto cambia cualquier parámetro: mostrarla
  // desactualizada al lado del botón de aplicar es peor que no mostrarla.
  useEffect(() => setPreview(null), [selection, opKey, valor, usarMargenCategoria, redondear, rounding, priceListId, validFrom]);

  const cuerpo = (dryRun: boolean) => ({
    priceListId,
    validFrom: validFrom || undefined,
    selection,
    target: op.target,
    operation: {
      type: op.tipo,
      value: necesitaValor ? Number(valor) : undefined,
      rounding: op.tipo === 'round' ? rounding : redondear ? rounding : undefined,
      useCategoryMargin: usaMargenCategoria ? true : undefined,
    },
    dryRun,
  });

  const ejecutar = async (dryRun: boolean) => {
    const setLoading = dryRun ? setCalculando : setAplicando;
    setLoading(true);
    onError('');
    try {
      const r = await api<BulkResult>('/prices/bulk', { method: 'POST', body: JSON.stringify(cuerpo(dryRun)) }, token);
      setPreview(r);
      if (!dryRun) {
        onMessage(
          r.scheduled
            ? `Listo: ${r.affected} precios programados para el ${fecha(r.validFrom)}.`
            : `Listo: ${r.affected} precios actualizados.`,
        );
        setPreview(null);
        loadScheduled();
      }
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const guardarCriterio = async () => {
    setGuardando(true);
    onError('');
    try {
      await api('/price-rules', {
        method: 'POST',
        body: JSON.stringify({
          name: nombreCriterio.trim(),
          priceListId,
          selection,
          target: op.target,
          operationType: op.tipo,
          // Sin valor el criterio guarda sólo a quién se le aplica, y el
          // porcentaje se pide al ejecutarlo. Es lo que sirve para un aumento
          // de proveedor, que cambia de número todos los meses. Con margen por
          // categoría el valor no aplica nunca: se resuelve por producto.
          operationValue: usaMargenCategoria ? null : (guardarValor && necesitaValor ? Number(valor) : null),
          useCategoryMargin: usaMargenCategoria,
          rounding: op.tipo === 'round' ? rounding : redondear ? rounding : null,
        }),
      }, token);
      setNombreCriterio('');
      setGuardarValor(false);
      onMessage('Criterio guardado.');
      loadRules();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setGuardando(false);
    }
  };

  const correrCriterio = async (regla: PriceRule, value?: string) => {
    onError('');
    try {
      const r = await api<BulkResult & { rule: { name: string } }>(`/price-rules/${regla.id}/run`, {
        method: 'POST',
        body: JSON.stringify({ dryRun: false, value: value ?? undefined }),
      }, token);
      onMessage(`«${r.rule.name}»: ${r.affected} precios actualizados.`);
      setPidiendoValor(null);
      setValorCriterio('');
      loadRules();
      loadScheduled();
    } catch (e) {
      onError(errorMessage(e));
    }
  };

  const usarCriterio = (regla: PriceRule) => {
    setSelection(regla.selection ?? {});
    const encontrada = OPERACIONES.find(o => o.tipo === regla.operationType && (regla.operationType !== 'percent' || o.target === regla.target));
    if (encontrada) setOpKey(encontrada.key);
    setValor(regla.operationValue ?? '');
    setUsarMargenCategoria(regla.useCategoryMargin);
    setRedondear(!!regla.rounding && regla.operationType !== 'round');
    if (regla.rounding) setRounding(regla.rounding as PriceRounding);
    onMessage(`Cargué «${regla.name}». Revisá y calculá.`);
  };

  const borrarCriterio = async (regla: PriceRule) => {
    try {
      await api(`/price-rules/${regla.id}`, { method: 'DELETE' }, token);
      loadRules();
    } catch (e) {
      onError(errorMessage(e));
    }
  };

  const cancelarProgramado = async (c: ScheduledChange) => {
    try {
      await api(`/prices/scheduled?priceListId=${c.priceListId}&validFrom=${encodeURIComponent(c.validFrom)}`, { method: 'DELETE' }, token);
      onMessage('Cambio programado cancelado.');
      loadScheduled();
    } catch (e) {
      onError(errorMessage(e));
    }
  };

  const agregarTramo = async () => {
    try {
      await api('/prices/rounding-rules', {
        method: 'POST',
        body: JSON.stringify({
          fromAmount: Number(nuevoTramo.fromAmount),
          toAmount: nuevoTramo.toAmount === '' ? null : Number(nuevoTramo.toAmount),
          mode: nuevoTramo.mode,
        }),
      }, token);
      setNuevoTramo({ fromAmount: '', toAmount: '', mode: 'nearest10' });
      loadTramos();
    } catch (e) {
      onError(errorMessage(e));
    }
  };

  const borrarTramo = async (id: string) => {
    try {
      await api(`/prices/rounding-rules/${id}`, { method: 'DELETE' }, token);
      loadTramos();
    } catch (e) {
      onError(errorMessage(e));
    }
  };

  return (
    <div className="flex flex-col">
      {/* ---------------------------------------------------- 1 · a quién */}
      <ModuleSection title="1 · A qué productos">
        <SelectionBuilder
          value={selection}
          onChange={setSelection}
          categories={categories}
          priceListId={priceListId}
          validFrom={validFrom}
          token={token}
          onCount={setSeleccionados}
        />
      </ModuleSection>

      {/* ---------------------------------------------------- 2 · qué les hago */}
      <ModuleSection title="2 · Qué les hago">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {OPERACIONES.map(o => (
            <button
              key={o.key}
              type="button"
              onClick={() => { setOpKey(o.key); if (o.key !== 'margin') setUsarMargenCategoria(false); }}
              className={cn(
                'flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors',
                opKey === o.key ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50',
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <o.Icon size={15} /> {o.titulo}
              </span>
              <span className="text-xs text-muted-foreground">{o.detalle}</span>
            </button>
          ))}
        </div>

        {op.cuidado && (
          <Alert variant="destructive">
            <strong>Ojo:</strong> {op.cuidado}
          </Alert>
        )}

        {puedeUsarMargenCategoria && (
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={usarMargenCategoria}
              onChange={e => setUsarMargenCategoria(e.target.checked)}
              className="size-4"
            />
            Usar el margen objetivo de cada categoría en vez de un % fijo
          </label>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {necesitaValor && (
            <Field label={op.campo ?? 'Valor'} htmlFor="op-valor">
              <Input id="op-valor" type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="12" autoComplete="off" />
            </Field>
          )}

          <Field label="Lista de precios" htmlFor="op-lista">
            <Select id="op-lista" value={priceListId} onChange={e => onPriceListChange(e.target.value)}>
              {priceLists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </Field>

          <Field label="Aplicar desde" htmlFor="op-desde" hint="vacío = ahora">
            <Input id="op-desde" type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} min={inputDate()} />
          </Field>

          {op.tipo === 'round' ? (
            <Field label="Cómo redondear" htmlFor="op-redondeo">
              <Select id="op-redondeo" value={rounding} onChange={e => setRounding(e.target.value as PriceRounding)}>
                {REDONDEOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </Select>
            </Field>
          ) : (
            <Field label="Redondeo del resultado">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={redondear} onChange={e => setRedondear(e.target.checked)} className="size-4" />
                  Redondear
                </label>
                {redondear && (
                  <Select value={rounding} onChange={e => setRounding(e.target.value as PriceRounding)} className="flex-1">
                    {REDONDEOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </Select>
                )}
              </div>
            </Field>
          )}
        </div>

        {/* El nombre del modo no dice nada; el ejemplo sí. */}
        {(redondear || op.tipo === 'round') && rounding !== 'byRules' && (
          <p className="text-sm text-muted-foreground">
            Así queda: {money(1234)} → <strong>{money(ejemplo(1234, rounding))}</strong> · {money(87)} → <strong>{money(ejemplo(87, rounding))}</strong>
          </p>
        )}

        {/* La política por tramos vive acá, donde se usa, y no en una sección aparte. */}
        {(redondear || op.tipo === 'round') && rounding === 'byRules' && (
          <div className="rounded-md border bg-muted/40 p-3">
            {tramos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tenés tramos cargados todavía. Agregá al menos uno acá abajo o elegí un redondeo fijo.
              </p>
            ) : (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {tramos.map(t => (
                  <Badge key={t.id} variant="outline" className="gap-1">
                    {money(Number(t.fromAmount))}{t.toAmount ? `–${money(Number(t.toAmount))}` : ' y más'}: {MODOS_REDONDEO[t.mode] ?? t.mode}
                    <button type="button" aria-label="Quitar tramo" onClick={() => borrarTramo(t.id)} className="opacity-60 hover:opacity-100">
                      <X size={12} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Desde $" htmlFor="tramo-desde" className="max-w-28">
                <Input id="tramo-desde" type="number" min="0" step="0.01" value={nuevoTramo.fromAmount} onChange={e => setNuevoTramo({ ...nuevoTramo, fromAmount: e.target.value })} />
              </Field>
              <Field label="Hasta $" htmlFor="tramo-hasta" hint="vacío = sin tope" className="max-w-28">
                <Input id="tramo-hasta" type="number" min="0" step="0.01" value={nuevoTramo.toAmount} onChange={e => setNuevoTramo({ ...nuevoTramo, toAmount: e.target.value })} />
              </Field>
              <Field label="Redondear" htmlFor="tramo-modo" className="max-w-44">
                <Select id="tramo-modo" value={nuevoTramo.mode} onChange={e => setNuevoTramo({ ...nuevoTramo, mode: e.target.value })}>
                  <option value="nearest10">A la decena</option>
                  <option value="nearest100">A la centena</option>
                  <option value="ending99">Terminación 99</option>
                  <option value="none">No redondear</option>
                </Select>
              </Field>
              <Button variant="outline" size="sm" onClick={agregarTramo} disabled={nuevoTramo.fromAmount === ''}>
                <Plus /> Agregar tramo
              </Button>
            </div>
          </div>
        )}

        {bloqueada && (
          <Alert variant="destructive">
            «{lista?.name}» se calcula desde «{lista?.derivesFromName}». Actualizá esa lista y ésta se mueve sola,
            o editala para que tenga precios propios.
          </Alert>
        )}
      </ModuleSection>

      {/* ---------------------------------------------------- 3 · revisar */}
      <ModuleSection title="3 · Revisar y aplicar">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => ejecutar(true)} disabled={!listo || calculando}>
            {calculando ? <Spinner /> : <Eye />} Calcular
          </Button>
          <Button onClick={() => ejecutar(false)} disabled={!preview || preview.affected === 0 || aplicando}>
            {aplicando ? <Spinner /> : <Calculator />} Aplicar {preview ? `a ${preview.affected}` : ''}
          </Button>

          <div className="ml-auto flex items-end gap-2">
            <Input
              value={nombreCriterio}
              onChange={e => setNombreCriterio(e.target.value)}
              placeholder="Guardar esta selección como…"
              className="max-w-56"
            />
            {usaMargenCategoria ? (
              <span className="whitespace-nowrap pb-2 text-xs text-muted-foreground">con el margen por categoría</span>
            ) : (
              <label className="flex items-center gap-1.5 whitespace-nowrap pb-2 text-xs text-muted-foreground" title="Si lo dejás sin marcar, el criterio guarda a quién se le aplica y el porcentaje se pide cada vez.">
                <input type="checkbox" checked={guardarValor} onChange={e => setGuardarValor(e.target.checked)} className="size-3.5" />
                con el {valor || '%'}
              </label>
            )}
            <Button variant="outline" onClick={guardarCriterio} disabled={guardando || !nombreCriterio.trim() || seleccionados === 0}>
              {guardando ? <Spinner /> : <FloppyDisk />} Guardar
            </Button>
          </div>
        </div>

        {!listo && seleccionados === 0 && (
          <p className="text-sm text-muted-foreground">La selección está vacía: ajustá los filtros del paso 1.</p>
        )}

        {validFrom && (
          <Alert>Los precios nuevos entran en vigencia el {fecha(validFrom)}. Hasta entonces siguen rigiendo los actuales.</Alert>
        )}

        {preview && (
          <div className="flex flex-col gap-3">
            <Alert>
              {preview.affected === 0
                ? `Ninguno de los ${preview.selected} productos cambia con estos parámetros.`
                : `${preview.affected} de ${preview.selected} productos van a cambiar.`}
              {preview.skipped > 0 && ` ${preview.skipped} salteados: ${[...new Set(preview.skippedDetail.map(s => s.reason))].join(', ')}.`}
              {preview.affected > preview.preview.length && ` Mostrando los primeros ${preview.preview.length}.`}
            </Alert>

            {preview.preview.length > 0 && (
              <div className="max-h-96 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      {preview.writes.cost && <TableHead className="text-right">Costo</TableHead>}
                      {preview.writes.sale && <TableHead className="text-right">Venta</TableHead>}
                      <TableHead className="text-right">Margen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.preview.map(row => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        {preview.writes.cost && (
                          <TableCell className="text-right">
                            <Delta before={row.costBefore} after={row.costAfter} formato={money} />
                          </TableCell>
                        )}
                        {preview.writes.sale && (
                          <TableCell className="text-right">
                            <Delta before={row.saleBefore} after={row.saleAfter} formato={money} />
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <Delta before={row.marginBefore} after={row.marginAfter} formato={n => `${n.toFixed(1)}%`} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </ModuleSection>

      {/* ---------------------------------------------------- programados */}
      {scheduled.length > 0 && (
        <ModuleSection title="Cambios programados">
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entra en vigencia</TableHead>
                  <TableHead>Lista</TableHead>
                  <TableHead className="text-right">Productos</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduled.map(c => (
                  <TableRow key={`${c.priceListId}-${c.validFrom}`}>
                    <TableCell className="font-medium">{fecha(c.validFrom)}</TableCell>
                    <TableCell>{c.priceListName}</TableCell>
                    <TableCell className="text-right">{c.products}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => cancelarProgramado(c)}>Cancelar</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ModuleSection>
      )}

      {/* ---------------------------------------------------- criterios */}
      <ModuleSection title="Selecciones guardadas">
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no guardaste ninguna. Armá una selección arriba y ponele nombre — por ejemplo «Productos de Arcor», para el día que aumenten.
          </p>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>A quiénes</TableHead>
                  <TableHead>Qué hace</TableHead>
                  <TableHead>Última vez</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map(r => {
                  const o = OPERACIONES.find(x => x.tipo === r.operationType && (r.operationType !== 'percent' || x.target === r.target));
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.selectionLabel}</TableCell>
                      <TableCell className="text-sm">
                        {o?.titulo ?? r.operationType}
                        {r.useCategoryMargin
                          ? <Badge variant="secondary" className="ml-1.5">margen por categoría</Badge>
                          : r.needsValue
                            ? <Badge variant="outline" className="ml-1.5">pregunta el %</Badge>
                            : r.operationValue ? ` · ${r.operationValue}%` : ''}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.lastRunAt ? fecha(r.lastRunAt) : 'nunca'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => (r.needsValue ? (setPidiendoValor(r), setValorCriterio('')) : correrCriterio(r))}
                          >
                            <Play /> Aplicar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => usarCriterio(r)}>Usar arriba</Button>
                          <Button size="sm" variant="ghost" onClick={() => borrarCriterio(r)} aria-label="Borrar">
                            <X />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </ModuleSection>

      {/* El criterio guardado sin valor pide el número en el momento: es su razón de ser. */}
      <Dialog open={!!pidiendoValor} onOpenChange={open => !open && setPidiendoValor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pidiendoValor?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{pidiendoValor?.selectionLabel}</p>
          <Field label="Porcentaje a aplicar" htmlFor="crit-valor">
            <Input
              id="crit-valor"
              autoFocus
              type="number"
              step="0.01"
              value={valorCriterio}
              onChange={e => setValorCriterio(e.target.value)}
              placeholder="12"
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPidiendoValor(null)}>Cancelar</Button>
            <Button
              disabled={valorCriterio.trim() === ''}
              onClick={() => pidiendoValor && correrCriterio(pidiendoValor, valorCriterio)}
            >
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
