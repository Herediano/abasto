import { useEffect, useRef, useState } from 'react';
import { Calculator, Download, Eye, PackagePlus, Upload } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
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
import { api, downloadFile, errorMessage, uploadFile, type Category } from '@/lib/api';
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
  const [scopeType, setScopeType] = useState<ScopeType>('all');
  const [scopeValue, setScopeValue] = useState('');
  const [target, setTarget] = useState<Target>('salePrice');
  const [operationType, setOperationType] = useState<OperationType>('percent');
  const [operationValue, setOperationValue] = useState('10');
  const [rounding, setRounding] = useState<Rounding>('nearest10');
  const [preview, setPreview] = useState<BulkResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    api<Category[]>('/categories', {}, token).then(setCategories).catch(e => setError(errorMessage(e)));
  }, [token]);

  // Cualquier cambio en los parametros invalida la vista previa: aplicar sin
  // recalcular escribiria valores distintos a los que el usuario vio.
  useEffect(() => {
    setPreview(null);
  }, [scopeType, scopeValue, target, operationType, operationValue, rounding]);

  async function importCatalog() {
    setConfirmingCatalog(false);
    setImportingCatalog(true);
    setToolsMessage('');
    setError('');
    try {
      const result = await api<{ created: number; skipped: number }>('/products/import-reference', { method: 'POST' }, token);
      setToolsMessage(`Catálogo cargado: ${result.created} productos nuevos, ${result.skipped} ya existían.`);
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

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={calculate} disabled={calculating || !scopeReady}>
              {calculating ? <Spinner /> : <Eye />} Calcular
            </Button>
            <Button onClick={apply} disabled={!preview || preview.affected === 0 || applying}>
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
