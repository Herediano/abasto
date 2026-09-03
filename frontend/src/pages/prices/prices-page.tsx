import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Calculator, Download, Eye, PackagePlus, Pencil, Play, Plus, Save, Trash2, Upload } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, downloadFile, errorMessage, uploadFile, type Category, type PriceList, type PriceRule, type RoundingRule, type ScheduledChange, type Promotion, type PriceAuditRow } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type ScopeType = 'all' | 'category' | 'brand';
type Target = 'salePrice' | 'costPrice';
type OperationType = 'percent' | 'margin' | 'round';
type Rounding = 'nearest10' | 'nearest100' | 'ending99' | 'byRules';

type BulkResult = {
  affected: number;
  skipped: number;
  skippedDetail: Array<{ id: string; name: string; reason: string }>;
  preview: Array<{ id: string; name: string; before: number | null; after: number }>;
  applied: boolean;
  scheduled: boolean;
  validFrom: string;
  priceList: { id: string; name: string };
};

const PRICE_SOURCES: Record<string, string> = {
  manual: 'Edición manual',
  import: 'Importación',
  bulk: 'Acción masiva',
  rule: 'Criterio guardado',
  invoice: 'Factura de compra',
};

const MODOS_REDONDEO: Record<string, string> = {
  nearest10: 'A la decena',
  nearest100: 'A la centena',
  ending99: 'Terminación 99',
  none: 'Sin redondear',
};

function money(value: number | null) {
  return value === null ? '—' : `$${value.toFixed(2)}`;
}

export function PricesPage() {
  const { session } = useAuth();
  const token = session?.accessToken ?? '';
  const [error, setError] = useState('');
  const [toolsMessage, setToolsMessage] = useState('');

  // herramientas de catalogo
  const [categories, setCategories] = useState<Category[]>([]);
  const [importingCatalog, setImportingCatalog] = useState(false);
  const [confirmingCatalog, setConfirmingCatalog] = useState(false);
  const [exportingPrices, setExportingPrices] = useState(false);
  const [importingPrices, setImportingPrices] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [updateNames, setUpdateNames] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // accion masiva
  // listas de precios
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [priceListId, setPriceListId] = useState('');
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<PriceList | null>(null);
  const [listForm, setListForm] = useState({ name: '', derivesFromId: '', markupPercent: '' });
  const [savingList, setSavingList] = useState(false);

  // vigencia: vacío = ahora
  const [validFrom, setValidFrom] = useState('');

  // criterios guardados, tramos de redondeo y cambios programados
  const [rules, setRules] = useState<PriceRule[]>([]);
  const [roundingRules, setRoundingRules] = useState<RoundingRule[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledChange[]>([]);
  const [savingRule, setSavingRule] = useState(false);
  const [runningRule, setRunningRule] = useState('');
  const [ruleName, setRuleName] = useState('');
  const [tramo, setTramo] = useState({ fromAmount: '', toAmount: '', mode: 'nearest10' });

  // promociones: se configuran ahora, las aplica Ventas
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promoOpen, setPromoOpen] = useState(false);
  const [savingPromo, setSavingPromo] = useState(false);
  const [promoForm, setPromoForm] = useState({
    name: '', type: 'nxm' as Promotion['type'],
    n: '3', m: '2', buyQty: '2', getQty: '1', percent: '50', desdeUnidad: '2', amount: '500', price: '',
    scopeType: 'all' as ScopeType, scopeValue: '',
    validFrom: new Date().toISOString().slice(0, 10), validTo: '',
  });

  // auditoría
  const [audit, setAudit] = useState<PriceAuditRow[]>([]);
  const [auditFiltro, setAuditFiltro] = useState({ field: '', source: '', from: '', to: '' });
  const [loadingAudit, setLoadingAudit] = useState(false);

  const [scopeType, setScopeType] = useState<ScopeType>('all');
  const [scopeValue, setScopeValue] = useState('');
  const [target, setTarget] = useState<Target>('salePrice');
  const [operationType, setOperationType] = useState<OperationType>('percent');
  const [operationValue, setOperationValue] = useState('10');
  const [rounding, setRounding] = useState<Rounding>('nearest10');
  const [preview, setPreview] = useState<BulkResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [applying, setApplying] = useState(false);

  const loadLists = () =>
    api<PriceList[]>('/price-lists', {}, token)
      .then(l => {
        setPriceLists(l);
        setPriceListId(prev => prev || l.find(x => x.isDefault)?.id || l[0]?.id || '');
      })
      .catch(e => setError(errorMessage(e)));

  const loadRules = () => api<PriceRule[]>('/price-rules', {}, token).then(setRules).catch(() => {});
  const loadRounding = () => api<RoundingRule[]>('/prices/rounding-rules', {}, token).then(setRoundingRules).catch(() => {});
  const loadScheduled = () => api<ScheduledChange[]>('/prices/scheduled', {}, token).then(setScheduled).catch(() => {});
  const loadPromotions = () => api<Promotion[]>('/promotions', {}, token).then(setPromotions).catch(() => {});

  const loadAudit = () => {
    setLoadingAudit(true);
    const p = new URLSearchParams({ limit: '100' });
    if (auditFiltro.field) p.set('field', auditFiltro.field);
    if (auditFiltro.source) p.set('source', auditFiltro.source);
    if (auditFiltro.from) p.set('from', auditFiltro.from);
    if (auditFiltro.to) p.set('to', auditFiltro.to);
    return api<{ items: PriceAuditRow[] }>(`/prices/audit?${p}`, {}, token)
      .then(r => setAudit(r.items))
      .catch(() => {})
      .finally(() => setLoadingAudit(false));
  };

  /** Arma el config según el tipo: cada promoción tiene sus propios parámetros. */
  function promoConfig() {
    const f = promoForm;
    switch (f.type) {
      case 'nxm': return { n: Number(f.n), m: Number(f.m) };
      case 'a_plus_b': return { buyQty: Number(f.buyQty), getQty: Number(f.getQty) };
      case 'percent': return { percent: Number(f.percent), desdeUnidad: Number(f.desdeUnidad) };
      case 'amount': return { amount: Number(f.amount) };
      case 'special_price': return { price: Number(f.price) };
    }
  }

  async function savePromo(e: FormEvent) {
    e.preventDefault();
    setSavingPromo(true);
    setError('');
    try {
      await api('/promotions', { method: 'POST', body: JSON.stringify({
        name: promoForm.name.trim(),
        type: promoForm.type,
        config: promoConfig(),
        scopeType: promoForm.scopeType,
        scopeValue: promoForm.scopeType === 'all' ? null : promoForm.scopeValue,
        validFrom: new Date(`${promoForm.validFrom}T00:00:00`).toISOString(),
        validTo: promoForm.validTo ? new Date(`${promoForm.validTo}T23:59:59`).toISOString() : null,
      }) }, token);
      setPromoOpen(false);
      setPromoForm({ ...promoForm, name: '' });
      await loadPromotions();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingPromo(false);
    }
  }

  async function deletePromo(id: string) {
    try {
      await api(`/promotions/${id}`, { method: 'DELETE' }, token);
      await loadPromotions();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  /** Texto legible de la promoción, para no mostrar el JSON crudo. */
  function describirPromo(p: Promotion) {
    const c = p.config;
    switch (p.type) {
      case 'nxm': return `Llevá ${c.n}, pagá ${c.m}`;
      case 'a_plus_b': return `Comprá ${c.buyQty}, llevate ${c.getQty} de regalo`;
      case 'percent': return c.desdeUnidad > 1 ? `${c.percent}% off desde la unidad ${c.desdeUnidad}` : `${c.percent}% de descuento`;
      case 'amount': return `$${c.amount} de descuento`;
      case 'special_price': return `Precio especial $${c.price}`;
      default: return JSON.stringify(c);
    }
  }

  useEffect(() => {
    api<Category[]>('/categories', {}, token).then(setCategories).catch(e => setError(errorMessage(e)));
    void loadLists();
    void loadRules();
    void loadRounding();
    void loadScheduled();
    void loadPromotions();
  }, [token]);

  // La auditoria se recarga sola al cambiar los filtros.
  useEffect(() => { void loadAudit(); }, [token, auditFiltro]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Guarda la configuración actual del formulario como criterio reutilizable. */
  async function saveRule() {
    if (!ruleName.trim()) { setError('Poné un nombre al criterio'); return; }
    setSavingRule(true);
    setError('');
    try {
      await api('/price-rules', { method: 'POST', body: JSON.stringify({
        name: ruleName.trim(),
        priceListId,
        scopeType,
        scopeValue: scopeType === 'all' ? null : scopeValue,
        target,
        operationType,
        operationValue: operationType === 'round' ? null : Number(operationValue),
        rounding: operationType === 'round' ? rounding : null,
      }) }, token);
      setRuleName('');
      setToolsMessage('Criterio guardado. Podés volver a aplicarlo cuando quieras.');
      await loadRules();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingRule(false);
    }
  }

  async function runRule(rule: PriceRule) {
    setRunningRule(rule.id);
    setError('');
    setToolsMessage('');
    try {
      const r = await api<BulkResult & { rule: { name: string } }>(`/price-rules/${rule.id}/run`, { method: 'POST', body: JSON.stringify({ dryRun: false }) }, token);
      setToolsMessage(`«${rule.name}»: ${r.affected} precios actualizados.${r.skipped ? ` ${r.skipped} salteados.` : ''}`);
      await Promise.all([loadRules(), loadScheduled()]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRunningRule('');
    }
  }

  async function deleteRule(id: string) {
    try {
      await api(`/price-rules/${id}`, { method: 'DELETE' }, token);
      await loadRules();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function addTramo(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/prices/rounding-rules', { method: 'POST', body: JSON.stringify({
        fromAmount: Number(tramo.fromAmount),
        toAmount: tramo.toAmount === '' ? null : Number(tramo.toAmount),
        mode: tramo.mode,
      }) }, token);
      setTramo({ fromAmount: '', toAmount: '', mode: 'nearest10' });
      await loadRounding();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function deleteTramo(id: string) {
    try {
      await api(`/prices/rounding-rules/${id}`, { method: 'DELETE' }, token);
      await loadRounding();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function cancelScheduled(c: ScheduledChange) {
    setError('');
    try {
      await api(`/prices/scheduled?priceListId=${c.priceListId}&validFrom=${encodeURIComponent(c.validFrom)}`, { method: 'DELETE' }, token);
      setToolsMessage('Cambio programado cancelado.');
      await loadScheduled();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  // Cualquier cambio en los parametros invalida la vista previa: aplicar sin
  // recalcular escribiria valores distintos a los que el usuario vio.
  useEffect(() => {
    setPreview(null);
  }, [scopeType, scopeValue, target, operationType, operationValue, rounding, priceListId, validFrom]);

  const listaElegida = priceLists.find(l => l.id === priceListId);
  const listaEsDerivada = Boolean(listaElegida?.derivesFromId);

  function openListDialog(lista: PriceList | null) {
    setEditingList(lista);
    setListForm({
      name: lista?.name ?? '',
      derivesFromId: lista?.derivesFromId ?? '',
      markupPercent: lista?.markupPercent ?? '',
    });
    setError('');
    setListDialogOpen(true);
  }

  async function saveList(e: FormEvent) {
    e.preventDefault();
    setSavingList(true);
    setError('');
    try {
      const body = {
        name: listForm.name.trim(),
        derivesFromId: listForm.derivesFromId || null,
        markupPercent: listForm.derivesFromId ? listForm.markupPercent : null,
      };
      if (editingList) await api(`/price-lists/${editingList.id}`, { method: 'PUT', body: JSON.stringify(body) }, token);
      else await api('/price-lists', { method: 'POST', body: JSON.stringify(body) }, token);
      setListDialogOpen(false);
      await loadLists();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingList(false);
    }
  }

  async function deleteList(lista: PriceList) {
    setError('');
    try {
      await api(`/price-lists/${lista.id}`, { method: 'DELETE' }, token);
      if (priceListId === lista.id) setPriceListId('');
      await loadLists();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function importCatalog() {
    setConfirmingCatalog(false);
    setImportingCatalog(true);
    setToolsMessage('');
    setError('');
    try {
      const result = await api<{ created: number; skipped: number; categories: number; categorized: number }>('/products/import-reference', { method: 'POST' }, token);
      const cats = result.categories ? ` ${result.categories} rubros como categorías` : '';
      const cat = result.categorized ? `, ${result.categorized} productos ya existentes recibieron categoría` : '';
      setToolsMessage(`Catálogo cargado: ${result.created} productos nuevos, ${result.skipped} ya existían.${cats}${cat}.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setImportingCatalog(false);
    }
  }

  async function exportPrices() {
    setExportingPrices(true);
    setError('');
    try {
      await downloadFile('/products/export', token, 'productos.xlsx');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setExportingPrices(false);
    }
  }

  async function importPrices(file: File) {
    setImportingPrices(true);
    setToolsMessage('');
    setError('');
    try {
      type ImportResult = {
        updated: number;
        renamed: number;
        notFound: string[];
        invalid: string[];
        matchedColumns: { barcode: string | null; costPrice: string | null; salePrice: string | null; name: string | null };
      };
      const result = await uploadFile<ImportResult>('/products/import-prices', token, file, { updateNames: String(updateNames) });
      const cols = [
        result.matchedColumns.barcode && `código="${result.matchedColumns.barcode}"`,
        result.matchedColumns.costPrice && `costo="${result.matchedColumns.costPrice}"`,
        result.matchedColumns.salePrice && `venta="${result.matchedColumns.salePrice}"`,
        updateNames && result.matchedColumns.name && `nombre="${result.matchedColumns.name}"`,
      ].filter(Boolean).join(', ');
      const partes = [`Precios actualizados: ${result.updated}`];
      if (updateNames) partes.push(`nombres actualizados: ${result.renamed}`);
      setToolsMessage(`${partes.join(', ')} (columnas detectadas: ${cols}).${result.notFound.length ? ` No encontrados: ${result.notFound.length}.` : ''}${result.invalid.length ? ` Valores inválidos: ${result.invalid.length}.` : ''}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setImportingPrices(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function buildBody(dryRun: boolean) {
    return JSON.stringify({
      priceListId: priceListId || undefined,
      // El input date da fecha sin hora; se aplica a las 00:00 de ese día.
      validFrom: validFrom ? new Date(`${validFrom}T00:00:00`).toISOString() : undefined,
      scope: { type: scopeType, value: scopeType === 'all' ? undefined : scopeValue },
      target,
      operation: {
        type: operationType,
        value: operationType === 'round' ? 0 : Number(operationValue),
        rounding: operationType === 'round' ? rounding : undefined,
      },
      dryRun,
    });
  }

  async function calculate() {
    setCalculating(true);
    setError('');
    setToolsMessage('');
    try {
      setPreview(await api<BulkResult>('/prices/bulk', { method: 'POST', body: buildBody(true) }, token));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCalculating(false);
    }
  }

  async function apply() {
    setApplying(true);
    setError('');
    try {
      const result = await api<BulkResult>('/prices/bulk', { method: 'POST', body: buildBody(false) }, token);
      setToolsMessage(
        result.scheduled
          ? `Programado: ${result.affected} precios van a entrar en vigencia el ${result.validFrom.slice(0, 10)}.`
          : `Listo: ${result.affected} precios actualizados.${result.skipped ? ` ${result.skipped} salteados.` : ''}`,
      );
      setPreview(null);
      await loadScheduled();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setApplying(false);
    }
  }

  const scopeReady = scopeType === 'all' || Boolean(scopeValue);

  return (
    <>
      <PageHeader title="Precios" description="Herramientas de catálogo y actualización masiva de precios." />

      {toolsMessage && <Alert>{toolsMessage}</Alert>}
      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Listas de precios</h2>
              <p className="text-sm text-muted-foreground">
                Una lista puede tener precios propios o calcularse desde otra con un recargo.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => openListDialog(null)}>
              <Plus /> Nueva lista
            </Button>
          </div>

          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lista</TableHead>
                  <TableHead>Cómo se calcula</TableHead>
                  <TableHead className="text-right">Precios propios</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceLists.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">
                      {l.name} {l.isDefault && <Badge variant="secondary">base</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {l.derivesFromName ? `${l.derivesFromName} ${Number(l.markupPercent) >= 0 ? '+' : ''}${Number(l.markupPercent)}%` : 'Precios propios'}
                    </TableCell>
                    <TableCell className="text-right">{l.priceCount ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openListDialog(l)} aria-label={`Editar ${l.name}`}>
                          <Pencil />
                        </Button>
                        {!l.isDefault && (
                          <Button variant="ghost" size="icon" onClick={() => deleteList(l)} aria-label={`Borrar ${l.name}`}>
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold">Catálogo y planillas</h2>
            <p className="text-sm text-muted-foreground">Cargá el catálogo regional o movés precios con Excel.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => e.target.files?.[0] && importPrices(e.target.files[0])} />
            <Button variant="outline" onClick={() => setConfirmingCatalog(true)} disabled={importingCatalog}>
              {importingCatalog ? <Spinner /> : <PackagePlus />} Cargar catálogo regional
            </Button>
            <Button variant="outline" onClick={exportPrices} disabled={exportingPrices}>
              {exportingPrices ? <Spinner /> : <Download />} Exportar precios
            </Button>
            <Button variant="outline" onClick={() => setImportDialogOpen(true)} disabled={importingPrices}>
              {importingPrices ? <Spinner /> : <Upload />} Importar precios
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold">Actualización masiva</h2>
            <p className="text-sm text-muted-foreground">Calculá primero para ver qué cambia. Nada se guarda hasta que apliques.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Lista de precios" htmlFor="priceList">
              <Select id="priceList" value={priceListId} onChange={e => setPriceListId(e.target.value)}>
                {priceLists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            </Field>

            <Field label="Aplicar desde" htmlFor="validFrom" hint="(vacío = ahora)">
              <Input id="validFrom" type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
            </Field>

            <Field label="Aplicar a" htmlFor="scope">
              <Select id="scope" value={scopeType} onChange={e => { setScopeType(e.target.value as ScopeType); setScopeValue(''); }}>
                <option value="all">Todos los productos</option>
                <option value="category">Una categoría</option>
                <option value="brand">Una marca</option>
              </Select>
            </Field>

            {scopeType === 'category' && (
              <Field label="Categoría" htmlFor="scopeValue">
                <Select id="scopeValue" value={scopeValue} onChange={e => setScopeValue(e.target.value)}>
                  <option value="">Elegí una…</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
            )}
            {scopeType === 'brand' && (
              <Field label="Marca" htmlFor="scopeValue">
                <Input id="scopeValue" value={scopeValue} onChange={e => setScopeValue(e.target.value)} placeholder="Escribí la marca exacta" />
              </Field>
            )}

            <Field label="Precio a modificar" htmlFor="target">
              <Select id="target" value={target} onChange={e => setTarget(e.target.value as Target)}>
                <option value="salePrice">Precio de venta</option>
                <option value="costPrice">Precio de costo</option>
              </Select>
            </Field>

            <Field label="Operación" htmlFor="operation">
              <Select
                id="operation"
                value={operationType}
                onChange={e => {
                  const next = e.target.value as OperationType;
                  setOperationType(next);
                  if (next === 'margin') setTarget('salePrice');
                }}
              >
                <option value="percent">Aumentar / bajar %</option>
                <option value="margin">Fijar margen sobre el costo</option>
                <option value="round">Redondear</option>
              </Select>
            </Field>

            {operationType !== 'round' ? (
              <Field label={operationType === 'percent' ? 'Porcentaje (negativo = baja)' : 'Margen %'} htmlFor="value">
                <Input id="value" type="number" step="0.01" value={operationValue} onChange={e => setOperationValue(e.target.value)} />
              </Field>
            ) : (
              <Field label="Redondeo" htmlFor="rounding">
                <Select id="rounding" value={rounding} onChange={e => setRounding(e.target.value as Rounding)}>
                  <option value="nearest10">A la decena más cercana</option>
                  <option value="nearest100">A la centena más cercana</option>
                  <option value="ending99">A terminación 99</option>
                  <option value="byRules">Según los tramos configurados</option>
                </Select>
              </Field>
            )}
          </div>

          {operationType === 'margin' && (
            <p className="text-sm text-muted-foreground">
              El margen se calcula sobre el precio de costo. Los productos sin costo cargado se saltean.
            </p>
          )}

          {/* Se avisa antes de calcular, para que no lo descubra recién al recibir el error. */}
          {listaEsDerivada && target === 'salePrice' && (
            <Alert variant="destructive">
              «{listaElegida?.name}» se calcula desde «{listaElegida?.derivesFromName}». Actualizá esa lista y ésta se mueve sola,
              o editala para que tenga precios propios.
            </Alert>
          )}

          {validFrom && (
            <Alert>
              Los precios nuevos van a entrar en vigencia el {validFrom}. Hasta entonces siguen rigiendo los actuales.
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={calculate} disabled={calculating || !scopeReady}>
              {calculating ? <Spinner /> : <Eye />} Calcular
            </Button>
            <Button onClick={apply} disabled={!preview || preview.affected === 0 || applying || (listaEsDerivada && target === 'salePrice')}>
              {applying ? <Spinner /> : <Calculator />} Aplicar {preview ? `a ${preview.affected}` : ''}
            </Button>

            {/* Guardar esta misma configuración como criterio reutilizable. */}
            <div className="ml-auto flex items-end gap-2">
              <Input
                value={ruleName}
                onChange={e => setRuleName(e.target.value)}
                placeholder="Guardar como criterio…"
                className="max-w-48"
              />
              <Button variant="outline" onClick={saveRule} disabled={savingRule || !ruleName.trim() || !scopeReady}>
                {savingRule ? <Spinner /> : <Save />} Guardar
              </Button>
            </div>
          </div>

          {preview && (
            <div className="flex flex-col gap-3">
              <Alert>
                {preview.affected === 0
                  ? 'Ningún producto cambia con estos parámetros.'
                  : `${preview.affected} productos van a cambiar.`}
                {preview.skipped > 0 && ` ${preview.skipped} salteados (sin precio de origen).`}
                {preview.affected > preview.preview.length && ` Mostrando los primeros ${preview.preview.length}.`}
              </Alert>

              {preview.preview.length > 0 && (
                <div className="max-h-96 overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Antes</TableHead>
                        <TableHead className="text-right">Después</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.preview.map(row => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{money(row.before)}</TableCell>
                          <TableCell className="text-right font-medium">{money(row.after)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {scheduled.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-semibold">Cambios programados</h2>
              <p className="text-sm text-muted-foreground">
                Todavía no rigen. Entran solos en la fecha indicada; hasta entonces se pueden cancelar.
              </p>
            </div>
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
                      <TableCell className="font-medium">{c.validFrom.slice(0, 10)}</TableCell>
                      <TableCell>{c.priceListName}</TableCell>
                      <TableCell className="text-right">{c.products}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => cancelScheduled(c)}>
                          Cancelar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold">Criterios guardados</h2>
            <p className="text-sm text-muted-foreground">
              Configuraciones que se vuelven a aplicar con un clic. Recalculan con los valores del momento, no repiten los precios de la vez pasada.
            </p>
          </div>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no guardaste ninguno. Configurá una actualización arriba y ponele nombre.
            </p>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criterio</TableHead>
                    <TableHead>Qué hace</TableHead>
                    <TableHead>Última vez</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.target === 'salePrice' ? 'Venta' : 'Costo'} · {r.priceListName} ·{' '}
                        {r.operationType === 'percent' ? `${Number(r.operationValue) >= 0 ? '+' : ''}${Number(r.operationValue)}%`
                          : r.operationType === 'margin' ? `margen ${Number(r.operationValue)}%`
                          : `redondeo ${MODOS_REDONDEO[r.rounding ?? ''] ?? r.rounding}`}
                        {r.scopeType !== 'all' && ` · sólo ${r.scopeType === 'brand' ? r.scopeValue : categories.find(c => c.id === r.scopeValue)?.name ?? 'una categoría'}`}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.lastRunAt ? r.lastRunAt.slice(0, 10) : 'nunca'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => runRule(r)} disabled={runningRule === r.id}>
                            {runningRule === r.id ? <Spinner /> : <Play />} Aplicar
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteRule(r.id)} aria-label={`Borrar ${r.name}`}>
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold">Política de redondeo</h2>
            <p className="text-sm text-muted-foreground">
              Tramos por monto: un producto de $500 y otro de $50.000 no se redondean igual. Se usan al elegir «Según los tramos configurados».
            </p>
          </div>

          {roundingRules.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {roundingRules.map(t => (
                <span key={t.id} className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-sm">
                  ${Number(t.fromAmount).toLocaleString('es-AR')} – {t.toAmount ? `$${Number(t.toAmount).toLocaleString('es-AR')}` : '∞'}
                  <Badge variant="outline">{MODOS_REDONDEO[t.mode] ?? t.mode}</Badge>
                  <button type="button" onClick={() => deleteTramo(t.id)} className="text-muted-foreground hover:text-destructive" aria-label="Quitar tramo">
                    <Trash2 className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <form onSubmit={addTramo} className="flex flex-wrap items-end gap-2">
            <Field label="Desde $" htmlFor="tramo-desde" className="max-w-32">
              <Input id="tramo-desde" required type="number" min="0" step="0.01" value={tramo.fromAmount} onChange={e => setTramo({ ...tramo, fromAmount: e.target.value })} />
            </Field>
            <Field label="Hasta $" htmlFor="tramo-hasta" hint="(vacío = sin tope)" className="max-w-32">
              <Input id="tramo-hasta" type="number" min="0" step="0.01" value={tramo.toAmount} onChange={e => setTramo({ ...tramo, toAmount: e.target.value })} />
            </Field>
            <Field label="Redondear" htmlFor="tramo-modo" className="max-w-48">
              <Select id="tramo-modo" value={tramo.mode} onChange={e => setTramo({ ...tramo, mode: e.target.value })}>
                {Object.entries(MODOS_REDONDEO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Button type="submit" variant="outline">
              <Plus /> Agregar tramo
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Promociones</h2>
              <p className="text-sm text-muted-foreground">
                Se configuran acá y quedan listas. <strong>Todavía no se aplican</strong>: hace falta el módulo de ventas para que
                se descuenten al cobrar.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setPromoOpen(true)}>
              <Plus /> Nueva promoción
            </Button>
          </div>

          {promotions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no cargaste ninguna.</p>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Promoción</TableHead>
                    <TableHead>Qué hace</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotions.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {describirPromo(p)}
                        {p.scopeType !== 'all' && ` · sólo ${p.scopeType === 'brand' ? p.scopeValue : categories.find(c => c.id === p.scopeValue)?.name ?? 'una categoría'}`}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.validFrom.slice(0, 10)} {p.validTo ? `→ ${p.validTo.slice(0, 10)}` : '→ sin fin'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => deletePromo(p.id)} aria-label={`Borrar ${p.name}`}>
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold">Auditoría de precios</h2>
            <p className="text-sm text-muted-foreground">
              Cada cambio de precio, con su origen y quién lo hizo. Es sólo lectura: nada de esto se edita ni se borra.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Precio" htmlFor="audit-field">
              <Select id="audit-field" value={auditFiltro.field} onChange={e => setAuditFiltro({ ...auditFiltro, field: e.target.value })}>
                <option value="">Costo y venta</option>
                <option value="sale">Sólo venta</option>
                <option value="cost">Sólo costo</option>
              </Select>
            </Field>
            <Field label="Origen" htmlFor="audit-source">
              <Select id="audit-source" value={auditFiltro.source} onChange={e => setAuditFiltro({ ...auditFiltro, source: e.target.value })}>
                <option value="">Todos</option>
                <option value="manual">Edición manual</option>
                <option value="import">Importación</option>
                <option value="bulk">Acción masiva</option>
                <option value="invoice">Factura de compra</option>
              </Select>
            </Field>
            <Field label="Desde" htmlFor="audit-from">
              <Input id="audit-from" type="date" value={auditFiltro.from} onChange={e => setAuditFiltro({ ...auditFiltro, from: e.target.value })} />
            </Field>
            <Field label="Hasta" htmlFor="audit-to">
              <Input id="audit-to" type="date" value={auditFiltro.to} onChange={e => setAuditFiltro({ ...auditFiltro, to: e.target.value })} />
            </Field>
          </div>

          {loadingAudit ? (
            <Spinner />
          ) : audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay cambios que coincidan con esos filtros.</p>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead className="text-right">Antes</TableHead>
                    <TableHead className="text-right">Después</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Usuario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audit.map(a => (
                    <TableRow key={`${a.field}-${a.id}`}>
                      <TableCell className="whitespace-nowrap">{a.at.slice(0, 10)}</TableCell>
                      <TableCell className="font-medium">{a.productName}</TableCell>
                      <TableCell>
                        {a.field === 'cost' ? 'Costo' : 'Venta'}
                        {a.scope && <span className="text-muted-foreground"> · {a.scope}</span>}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{a.before === null ? '—' : `$${a.before.toFixed(2)}`}</TableCell>
                      <TableCell className="text-right font-medium">${a.after.toFixed(2)}</TableCell>
                      <TableCell><Badge variant="outline">{PRICE_SOURCES[a.source] ?? a.source}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{a.userName ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={promoOpen} onOpenChange={setPromoOpen}>
        <DialogContent>
          <form onSubmit={savePromo} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Nueva promoción</DialogTitle>
            </DialogHeader>

            <Field label="Nombre" htmlFor="promo-name">
              <Input id="promo-name" required value={promoForm.name} onChange={e => setPromoForm({ ...promoForm, name: e.target.value })} placeholder="3x2 en gaseosas" />
            </Field>

            <Field label="Tipo" htmlFor="promo-type">
              <Select id="promo-type" value={promoForm.type} onChange={e => setPromoForm({ ...promoForm, type: e.target.value as Promotion['type'] })}>
                <option value="nxm">NxM — llevá 3, pagá 2</option>
                <option value="a_plus_b">A+B — comprá 2, llevate 1</option>
                <option value="percent">Descuento %</option>
                <option value="amount">Descuento en $</option>
                <option value="special_price">Precio especial</option>
              </Select>
            </Field>

            {promoForm.type === 'nxm' && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Se lleva" htmlFor="promo-n"><Input id="promo-n" required type="number" min="2" value={promoForm.n} onChange={e => setPromoForm({ ...promoForm, n: e.target.value })} /></Field>
                <Field label="Paga" htmlFor="promo-m"><Input id="promo-m" required type="number" min="1" value={promoForm.m} onChange={e => setPromoForm({ ...promoForm, m: e.target.value })} /></Field>
              </div>
            )}
            {promoForm.type === 'a_plus_b' && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Compra" htmlFor="promo-buy"><Input id="promo-buy" required type="number" min="1" value={promoForm.buyQty} onChange={e => setPromoForm({ ...promoForm, buyQty: e.target.value })} /></Field>
                <Field label="Se lleva gratis" htmlFor="promo-get"><Input id="promo-get" required type="number" min="1" value={promoForm.getQty} onChange={e => setPromoForm({ ...promoForm, getQty: e.target.value })} /></Field>
              </div>
            )}
            {promoForm.type === 'percent' && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Descuento %" htmlFor="promo-pct"><Input id="promo-pct" required type="number" min="1" max="99" value={promoForm.percent} onChange={e => setPromoForm({ ...promoForm, percent: e.target.value })} /></Field>
                <Field label="Desde la unidad" htmlFor="promo-desde" hint="(2 = la segunda)">
                  <Input id="promo-desde" required type="number" min="1" value={promoForm.desdeUnidad} onChange={e => setPromoForm({ ...promoForm, desdeUnidad: e.target.value })} />
                </Field>
              </div>
            )}
            {promoForm.type === 'amount' && (
              <Field label="Descuento en $" htmlFor="promo-amount"><Input id="promo-amount" required type="number" min="1" step="0.01" value={promoForm.amount} onChange={e => setPromoForm({ ...promoForm, amount: e.target.value })} /></Field>
            )}
            {promoForm.type === 'special_price' && (
              <Field label="Precio especial $" htmlFor="promo-price"><Input id="promo-price" required type="number" min="0.01" step="0.01" value={promoForm.price} onChange={e => setPromoForm({ ...promoForm, price: e.target.value })} /></Field>
            )}

            <Field label="Aplicar a" htmlFor="promo-scope">
              <Select id="promo-scope" value={promoForm.scopeType} onChange={e => setPromoForm({ ...promoForm, scopeType: e.target.value as ScopeType, scopeValue: '' })}>
                <option value="all">Todos los productos</option>
                <option value="category">Una categoría</option>
                <option value="brand">Una marca</option>
              </Select>
            </Field>
            {promoForm.scopeType === 'category' && (
              <Field label="Categoría" htmlFor="promo-cat">
                <Select id="promo-cat" required value={promoForm.scopeValue} onChange={e => setPromoForm({ ...promoForm, scopeValue: e.target.value })}>
                  <option value="">Elegí una…</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
            )}
            {promoForm.scopeType === 'brand' && (
              <Field label="Marca" htmlFor="promo-brand">
                <Input id="promo-brand" required value={promoForm.scopeValue} onChange={e => setPromoForm({ ...promoForm, scopeValue: e.target.value })} />
              </Field>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field label="Desde" htmlFor="promo-from"><Input id="promo-from" required type="date" value={promoForm.validFrom} onChange={e => setPromoForm({ ...promoForm, validFrom: e.target.value })} /></Field>
              <Field label="Hasta" htmlFor="promo-to" hint="(vacío = sin fin)"><Input id="promo-to" type="date" value={promoForm.validTo} onChange={e => setPromoForm({ ...promoForm, validTo: e.target.value })} /></Field>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPromoOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={savingPromo}>{savingPromo && <Spinner />} Crear promoción</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={listDialogOpen} onOpenChange={setListDialogOpen}>
        <DialogContent>
          <form onSubmit={saveList} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{editingList ? 'Editar lista' : 'Nueva lista de precios'}</DialogTitle>
            </DialogHeader>

            <Field label="Nombre" htmlFor="list-name">
              <Input id="list-name" required value={listForm.name} onChange={e => setListForm({ ...listForm, name: e.target.value })} placeholder="Minorista" />
            </Field>

            <Field label="Cómo se calcula" htmlFor="list-derives">
              <Select
                id="list-derives"
                value={listForm.derivesFromId}
                onChange={e => setListForm({ ...listForm, derivesFromId: e.target.value })}
                disabled={editingList?.isDefault}
              >
                <option value="">Precios propios</option>
                {priceLists
                  .filter(l => l.id !== editingList?.id)
                  .map(l => <option key={l.id} value={l.id}>Derivada de {l.name}</option>)}
              </Select>
            </Field>

            {editingList?.isDefault && (
              <p className="text-sm text-muted-foreground">La lista base siempre tiene precios propios: es el origen del resto.</p>
            )}

            {listForm.derivesFromId && (
              <Field label="Recargo %" htmlFor="list-markup" hint="(negativo = descuento)">
                <Input
                  id="list-markup"
                  required
                  type="number"
                  step="0.01"
                  value={listForm.markupPercent}
                  onChange={e => setListForm({ ...listForm, markupPercent: e.target.value })}
                  placeholder="40"
                />
              </Field>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setListDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingList}>
                {savingList && <Spinner />} {editingList ? 'Guardar' : 'Crear lista'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmingCatalog} onOpenChange={setConfirmingCatalog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cargar catálogo regional</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esto va a cargar el catálogo regional completo (miles de productos) como productos de este tenant, con un precio de venta sugerido. Los que ya existan por código de barras se saltean.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmingCatalog(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={importCatalog} disabled={importingCatalog}>
              {importingCatalog && <Spinner />} Cargar catálogo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar precios</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Subí un archivo .xlsx o .csv. Los productos se identifican por código de barras y las columnas se detectan por el nombre del encabezado.
          </p>
          <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
            <Checkbox checked={updateNames} onCheckedChange={value => setUpdateNames(value === true)} className="mt-0.5" />
            <span>
              <span className="font-medium">Actualizar también los nombres</span>
              <span className="block text-muted-foreground">
                Reemplaza el nombre de cada producto con el del archivo. Dejalo sin tildar si solo querés actualizar precios.
              </span>
            </span>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                setImportDialogOpen(false);
                fileInputRef.current?.click();
              }}
            >
              Elegir archivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
