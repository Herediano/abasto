import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Calculator, Download, Eye, PackagePlus, Pencil, Plus, Trash2, Upload } from 'lucide-react';
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
import { api, downloadFile, errorMessage, uploadFile, type Category, type PriceList } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type ScopeType = 'all' | 'category' | 'brand';
type Target = 'salePrice' | 'costPrice';
type OperationType = 'percent' | 'margin' | 'round';
type Rounding = 'nearest10' | 'nearest100' | 'ending99';

type BulkResult = {
  affected: number;
  skipped: number;
  skippedDetail: Array<{ id: string; name: string; reason: string }>;
  preview: Array<{ id: string; name: string; before: number | null; after: number }>;
  applied: boolean;
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

  useEffect(() => {
    api<Category[]>('/categories', {}, token).then(setCategories).catch(e => setError(errorMessage(e)));
    void loadLists();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setToolsMessage(`Listo: ${result.affected} precios actualizados.${result.skipped ? ` ${result.skipped} salteados.` : ''}`);
      setPreview(null);
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
