import { useEffect, useState } from 'react';
import { ArrowRight, Calculator, FloppyDisk, Play, X } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ModuleSection } from '@/components/module-screen';
import { Spinner } from '@/components/spinner';
import { Badge } from '@/components/ui/badge';
import { api, errorMessage, type Category, type PriceList, type PriceRounding, type PriceRule, type PriceSelection, type TierBulkResult } from '@/lib/api';
import { fecha, money } from '@/lib/format';
import { SelectionBuilder } from './selection-builder';

/**
 * Precio por cantidad para toda una selección de una vez: "desde N unidades,
 * X% menos que la venta actual". Es la contracara de cargar una escala a mano
 * en la ficha del producto (ver «Escalas por cantidad»), para cuando el
 * descuento por cantidad es una política pareja sobre muchos productos —el
 * caso de todos los días de un mayorista— y no un caso puntual.
 *
 * Nunca inventa una escala donde no la había pedida: sin esta pantalla y sin
 * cargar una a mano, el producto sigue con precio único.
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

const REDONDEOS: Array<{ value: PriceRounding; label: string }> = [
  { value: 'nearest10', label: 'A la decena' },
  { value: 'nearest100', label: 'A la centena' },
  { value: 'ending99', label: 'Terminación 99' },
  { value: 'byRules', label: 'Mi política por tramos' },
];

export function TierBulkUpdate({ token, priceLists, categories, priceListId, onPriceListChange, onError, onMessage }: Props) {
  const [selection, setSelection] = useState<PriceSelection>({});
  const [seleccionados, setSeleccionados] = useState(0);
  const [minQty, setMinQty] = useState('6');
  const [discountPercent, setDiscountPercent] = useState('10');
  const [redondear, setRedondear] = useState(true);
  const [rounding, setRounding] = useState<PriceRounding>('nearest10');

  const [preview, setPreview] = useState<TierBulkResult | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [aplicando, setAplicando] = useState(false);

  const [rules, setRules] = useState<PriceRule[]>([]);
  const [nombreCriterio, setNombreCriterio] = useState('');
  const [guardarValor, setGuardarValor] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [pidiendoValor, setPidiendoValor] = useState<PriceRule | null>(null);
  const [valorCriterio, setValorCriterio] = useState('');

  // Los criterios de "tier" viven acá; los demás tipos se guardan y se listan
  // en Precio único — mezclarlos confundiría más de lo que ahorra.
  const loadRules = () => api<PriceRule[]>('/price-rules', {}, token).then(r => setRules(r.filter(x => x.operationType === 'tier'))).catch(() => {});
  useEffect(() => { void loadRules(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setPreview(null), [selection, minQty, discountPercent, redondear, rounding, priceListId]);

  const listo = seleccionados > 0 && minQty.trim() !== '' && discountPercent.trim() !== '';

  const cuerpo = (dryRun: boolean) => ({
    priceListId,
    selection,
    minQty: Number(minQty),
    discountPercent: Number(discountPercent),
    rounding: redondear ? rounding : undefined,
    dryRun,
  });

  const ejecutar = async (dryRun: boolean) => {
    const setLoading = dryRun ? setCalculando : setAplicando;
    setLoading(true);
    onError('');
    try {
      const r = await api<TierBulkResult>('/prices/bulk-tier', { method: 'POST', body: JSON.stringify(cuerpo(dryRun)) }, token);
      setPreview(r);
      if (!dryRun) {
        onMessage(`Listo: precio por ${r.minQty} o más cargado en ${r.affected} productos.`);
        setPreview(null);
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
          operationType: 'tier',
          tierMinQty: Number(minQty),
          // Sin valor el criterio guarda a quién y la cantidad, y el % de
          // descuento se pide cada vez — para cuando cambia según el mes.
          operationValue: guardarValor ? Number(discountPercent) : null,
          rounding: redondear ? rounding : null,
        }),
      }, token);
      setNombreCriterio('');
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
      const r = await api<TierBulkResult & { rule: { name: string } }>(`/price-rules/${regla.id}/run`, {
        method: 'POST',
        body: JSON.stringify({ dryRun: false, value: value ?? undefined }),
      }, token);
      onMessage(`«${r.rule.name}»: precio por cantidad cargado en ${r.affected} productos.`);
      setPidiendoValor(null);
      setValorCriterio('');
      loadRules();
    } catch (e) {
      onError(errorMessage(e));
    }
  };

  const usarCriterio = (regla: PriceRule) => {
    setSelection(regla.selection ?? {});
    setMinQty(regla.tierMinQty ?? '');
    setDiscountPercent(regla.operationValue ?? '');
    setRedondear(!!regla.rounding);
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

  return (
    <div className="flex flex-col">
      <ModuleSection title="1 · A qué productos" description="Los filtros se suman: cada uno recorta el conjunto. El contador dice cuántos quedan.">
        <SelectionBuilder
          value={selection}
          onChange={setSelection}
          categories={categories}
          priceListId={priceListId}
          validFrom=""
          token={token}
          onCount={setSeleccionados}
        />
      </ModuleSection>

      <ModuleSection
        title="2 · Qué les hago"
        description="Se calcula sobre la venta actual de cada producto, no sobre un precio fijo: cada uno conserva su propia base."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Desde cuántas unidades" htmlFor="tier-minqty" hint="en la misma venta">
            <Input id="tier-minqty" type="number" min="2" step="1" value={minQty} onChange={e => setMinQty(e.target.value)} placeholder="6" />
          </Field>
          <Field label="Cuánto menos" htmlFor="tier-pct" hint="% sobre la venta actual">
            <Input id="tier-pct" type="number" min="1" max="99" step="0.1" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} placeholder="10" />
          </Field>
          <Field label="Lista de precios" htmlFor="tier-lista">
            <Select id="tier-lista" value={priceListId} onChange={e => onPriceListChange(e.target.value)}>
              {priceLists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </Field>
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
        </div>
      </ModuleSection>

      <ModuleSection
        title="3 · Revisar y aplicar"
        description="Nada se guarda hasta que apliques. No pisa el precio único del producto: agrega o actualiza sólo el escalón de esta cantidad."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => void ejecutar(true)} disabled={!listo || calculando}>
            {calculando ? <Spinner /> : <Calculator />} Calcular
          </Button>
          <Button onClick={() => void ejecutar(false)} disabled={!preview || aplicando || preview.affected === 0}>
            {aplicando ? <Spinner /> : <Play />} Aplicar {preview ? `a ${preview.affected}` : ''}
          </Button>

          <div className="ml-auto flex items-end gap-2">
            <Input
              value={nombreCriterio}
              onChange={e => setNombreCriterio(e.target.value)}
              placeholder="Guardar esta selección como…"
              className="max-w-56"
            />
            <label className="flex items-center gap-1.5 whitespace-nowrap pb-2 text-xs text-muted-foreground" title="Si lo dejás sin marcar, el criterio guarda a quién y la cantidad, y el % se pide cada vez.">
              <input type="checkbox" checked={guardarValor} onChange={e => setGuardarValor(e.target.checked)} className="size-3.5" />
              con el {discountPercent || '%'}
            </label>
            <Button variant="outline" onClick={guardarCriterio} disabled={guardando || !nombreCriterio.trim() || seleccionados === 0}>
              {guardando ? <Spinner /> : <FloppyDisk />} Guardar
            </Button>
          </div>
        </div>

        {preview && (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {preview.affected} de {preview.selected} productos van a tener precio por {preview.minQty} o más.
              {preview.skipped > 0 && ` ${preview.skipped} salteados: ${[...new Set(preview.skippedDetail.map(s => s.reason))].join(', ')}.`}
            </p>
            {preview.preview.length > 0 && (
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Venta actual</TableHead>
                      <TableHead className="text-right">Precio x{preview.minQty}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.preview.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{money(p.salePrice)}</TableCell>
                        <TableCell className="text-right">
                          {p.tierBefore !== null && <span className="text-muted-foreground">{money(p.tierBefore)}</span>}
                          {p.tierBefore !== null && <ArrowRight size={11} className="mx-1 inline opacity-50" />}
                          <span className="font-medium">{money(p.tierAfter)}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {!preview && seleccionados === 0 && (
          <Alert className="mt-4">Elegí al menos un producto arriba para poder calcular.</Alert>
        )}
      </ModuleSection>

      <ModuleSection
        title="Selecciones guardadas"
        description="Las políticas de precio por cantidad que se repiten, listas para volver a aplicar. Recalculan sobre la venta del momento."
      >
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no guardaste ninguna. Armá una selección arriba y ponele nombre — por ejemplo «Almacén por docena».
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
                {rules.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.selectionLabel}</TableCell>
                    <TableCell className="text-sm">
                      Desde {r.tierMinQty} unidades
                      {r.needsValue
                        ? <Badge variant="outline" className="ml-1.5">pregunta el %</Badge>
                        : r.operationValue ? ` · ${r.operationValue}% menos` : ''}
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
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ModuleSection>

      <Dialog open={!!pidiendoValor} onOpenChange={open => !open && setPidiendoValor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pidiendoValor?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{pidiendoValor?.selectionLabel} · desde {pidiendoValor?.tierMinQty} unidades</p>
          <Field label="Cuánto menos (%)" htmlFor="tier-crit-valor">
            <Input
              id="tier-crit-valor"
              autoFocus
              type="number"
              step="0.1"
              value={valorCriterio}
              onChange={e => setValorCriterio(e.target.value)}
              placeholder="10"
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
