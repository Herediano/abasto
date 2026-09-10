import { useEffect, useMemo, useState } from 'react';
import { Package, Plus, Trash } from '@phosphor-icons/react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModuleScreen, ModuleSection, SummaryLine } from '@/components/module-screen';
import { PageSpinner, Spinner } from '@/components/spinner';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiError, api, errorMessage, type Category, type Lot, type PriceList, type PriceTier, type Product, type StockItem } from '@/lib/api';
import { fecha, money, quantity } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';

const PRICE_SOURCES: Record<string, string> = {
  manual: 'Edición manual',
  import: 'Importación',
  bulk: 'Acción masiva',
  invoice: 'Factura de compra',
};
// Situación frente al IVA, ordenada por frecuencia. Coincide con IVA_SITUACIONES
// del backend. 'exento' y 'no gravado' no son 0% (se facturan distinto).
const IVA_OPCIONES: { value: string; label: string }[] = [
  { value: '21', label: '21% (general)' },
  { value: '10.5', label: '10,5% (reducido)' },
  { value: '27', label: '27% (aumentado)' },
  { value: 'exento', label: 'Exento' },
  { value: 'no_gravado', label: 'No gravado' },
  { value: '0', label: '0%' },
  { value: '2.5', label: '2,5%' },
  { value: '5', label: '5%' },
];
const ivaLabel = (v: string) => IVA_OPCIONES.find(o => o.value === v)?.label ?? `${v}%`;

// Unidad de venta: lista cerrada, misma que valida el backend (SALE_UNITS).
const SALE_UNITS: { value: string; label: string }[] = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'kg', label: 'Kilo' },
  { value: 'g', label: 'Gramo' },
  { value: 'litro', label: 'Litro' },
  { value: 'ml', label: 'Mililitro' },
  { value: 'metro', label: 'Metro' },
  { value: 'docena', label: 'Docena' },
];
const PACK_NAMES = ['Caja', 'Pack', 'Plancha', 'Display', 'Bolsón', 'Bulto', 'Pallet'];
const unitLabel = (u: string) => SALE_UNITS.find(x => x.value === u)?.label.toLowerCase() ?? u;
const unitPlural = (u: string) => (u === 'unidad' ? 'unidades' : unitLabel(u));

const EMPTY_FORM = {
  barcode: '', name: '', brand: '', categoryId: '', unit: 'unidad', purchaseUnit: '', unitsPerPurchase: '1', packBarcode: '',
  ivaSituacion: '21', internalTaxRate: '0', minStock: '', manejaVencimiento: false, isWeighed: false,
};
type FormState = typeof EMPTY_FORM;

function formOf(p: Product): FormState {
  return {
    barcode: p.barcode,
    name: p.name,
    brand: p.brand ?? '',
    categoryId: p.categoryId ?? '',
    unit: p.unit,
    purchaseUnit: p.purchaseUnit ?? '',
    unitsPerPurchase: p.unitsPerPurchase ?? '1',
    packBarcode: p.packBarcode ?? '',
    ivaSituacion: p.ivaSituacion ?? '21',
    internalTaxRate: p.internalTaxRate ?? '0',
    minStock: p.minStock ?? '',
    manejaVencimiento: p.manejaVencimiento,
    isWeighed: p.isWeighed,
  };
}

function margin(costPrice?: string | null, salePrice?: string | null) {
  const cost = Number(costPrice);
  const sale = Number(salePrice);
  if (!costPrice || !salePrice || !Number.isFinite(cost) || !Number.isFinite(sale) || sale <= 0) return null;
  return ((sale - cost) / sale) * 100;
}

type View = 'general' | 'stock' | 'precios';

/**
 * La pantalla del producto: única casa de todo lo que se hace con UN producto.
 * Se edita en el lugar (sin diálogo) y se organiza en tres pestañas —General,
 * Stock, Precios—. El mismo componente da de alta un producto nuevo (`/new`):
 * ahí solo se ve General y el botón dice «Crear».
 */
export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const creando = id === 'new';
  const { session, can } = useAuth();
  const token = session!.accessToken;
  const navigate = useNavigate();
  const puedeEditar = can('productos.editar');
  const puedeCrear = can('productos.crear');
  const puedeEliminar = can('productos.eliminar');
  const puedeEditarPrecios = can('precios.editar');
  const soloLectura = creando ? !puedeCrear : !puedeEditar;

  const [product, setProduct] = useState<Product | null>(null);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(!creando);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>('general');

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [baseline, setBaseline] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [referenceHint, setReferenceHint] = useState(false);
  const [impuestosAbierto, setImpuestosAbierto] = useState(false);
  const [internoManual, setInternoManual] = useState(false);

  const [newBarcode, setNewBarcode] = useState('');
  const [savingBarcode, setSavingBarcode] = useState(false);
  const [tierForm, setTierForm] = useState({ minQty: '', price: '', priceListId: '' });
  const [savingTier, setSavingTier] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deactivatePrompt, setDeactivatePrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  // `lots` se carga para futuros usos (edición de lote); hoy no se lista suelto.
  void lots;

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseline), [form, baseline]);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));
  // "Se compra por bulto cerrado" está activo cuando hay nombre de bulto.
  const comprado = form.purchaseUnit.trim() !== '';
  const packInvalido = comprado && !(Number(form.unitsPerPurchase) > 1);

  const loadProduct = () => api<Product>(`/products/${id}`, {}, token).then(p => {
    setProduct(p);
    setForm(formOf(p));
    setBaseline(formOf(p));
  });
  const loadTiers = () => api<PriceTier[]>(`/products/${id}/tiers`, {}, token).then(setTiers).catch(() => {});

  useEffect(() => {
    api<Category[]>('/categories', {}, token).then(setCategories).catch(() => {});
    api<PriceList[]>('/price-lists', {}, token).then(setPriceLists).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (creando) {
      setForm(EMPTY_FORM);
      setBaseline(EMPTY_FORM);
      setView('general');
      return;
    }
    setLoading(true);
    setError('');
    Promise.all([
      api<Product>(`/products/${id}`, {}, token),
      api<{ productId: string; items: StockItem[] }>(`/stock/products/${id}`, {}, token),
      api<Lot[]>(`/products/${id}/lots`, {}, token),
      api<PriceTier[]>(`/products/${id}/tiers`, {}, token),
    ])
      .then(([p, s, l, t]) => {
        setProduct(p);
        setForm(formOf(p));
        setBaseline(formOf(p));
        setStock(s.items);
        setLots(l);
        setTiers(t);
      })
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [id, token, creando]);

  // Autocompletar nombre y marca contra la base de referencia — solo al dar de
  // alta y mientras el nombre siga vacío.
  useEffect(() => {
    if (!creando) return;
    const barcode = form.barcode.trim();
    setReferenceHint(false);
    if (!barcode) return;
    const t = setTimeout(() => {
      api<{ name: string; brand: string | null }>(`/product-reference/${encodeURIComponent(barcode)}`, {}, token)
        .then(ref => {
          let applied = false;
          setForm(f => {
            if (f.barcode.trim() !== barcode || f.name) return f;
            applied = true;
            return { ...f, name: ref.name, brand: ref.brand ?? f.brand };
          });
          if (applied) setReferenceHint(true);
        })
        .catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [form.barcode, creando, token]);

  async function save() {
    setSaving(true);
    setError('');
    try {
      const body = {
        ...form,
        categoryId: form.categoryId || null,
        minStock: form.minStock || null,
        purchaseUnit: comprado ? form.purchaseUnit.trim() : '',
        packBarcode: comprado ? form.packBarcode.trim() : '',
      };
      if (creando) {
        const created = await api<Product>('/products', { method: 'POST', body: JSON.stringify(body) }, token);
        navigate(`/catalog/products/${created.id}`, { replace: true });
      } else {
        await api(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }, token);
        await loadProduct();
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function addBarcode() {
    const barcode = newBarcode.trim();
    if (!barcode) return;
    setSavingBarcode(true);
    setError('');
    try {
      await api(`/products/${id}/barcodes`, { method: 'POST', body: JSON.stringify({ barcode }) }, token);
      setNewBarcode('');
      await loadProduct();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingBarcode(false);
    }
  }

  async function removeBarcode(barcodeId: string) {
    setError('');
    try {
      await api(`/products/${id}/barcodes/${barcodeId}`, { method: 'DELETE' }, token);
      await loadProduct();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function addTier() {
    setSavingTier(true);
    setError('');
    try {
      await api(`/products/${id}/tiers`, { method: 'POST', body: JSON.stringify({
        minQty: Number(tierForm.minQty),
        price: Number(tierForm.price),
        priceListId: tierForm.priceListId || undefined,
      }) }, token);
      setTierForm({ minQty: '', price: '', priceListId: tierForm.priceListId });
      await loadTiers();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingTier(false);
    }
  }

  async function removeTier(tierId: string) {
    setError('');
    try {
      await api(`/products/${id}/tiers/${tierId}`, { method: 'DELETE' }, token);
      await loadTiers();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function setActive(isActive: boolean) {
    if (!product) return;
    setBusy(true);
    setError('');
    try {
      await api(`/products/${product.id}`, { method: 'PUT', body: JSON.stringify({ isActive }) }, token);
      setDeactivatePrompt(false);
      await loadProduct();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!product) return;
    setBusy(true);
    setError('');
    try {
      await api(`/products/${product.id}`, { method: 'DELETE' }, token);
      navigate('/catalog/products');
    } catch (err) {
      if (err instanceof ApiError && err.data.code === 'PRODUCT_HAS_ACTIVITY') {
        setConfirmDelete(false);
        setDeactivatePrompt(true);
      } else {
        setError(errorMessage(err));
        setConfirmDelete(false);
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageSpinner />;
  if (error && !product && !creando) return <Alert variant="destructive">{error}</Alert>;
  if (!creando && !product) return null;

  const totalStock = stock.reduce((sum, s) => sum + Number(s.quantity), 0);
  const m = product ? margin(product.costPrice, product.salePrice) : null;

  const generalTab = (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3">
        <p className="text-chico font-semibold text-muted-foreground">Identificación</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Código de barras" htmlFor="p-barcode">
            <Input id="p-barcode" value={form.barcode} disabled={soloLectura} onChange={e => set('barcode', e.target.value)} />
          </Field>
          <Field label="Marca" htmlFor="p-brand" hint="(opcional)">
            <Input id="p-brand" value={form.brand} disabled={soloLectura} onChange={e => set('brand', e.target.value)} />
          </Field>
        </div>
        <Field label="Nombre" htmlFor="p-name">
          <Input id="p-name" value={form.name} disabled={soloLectura} onChange={e => set('name', e.target.value)} />
        </Field>
        {referenceHint && creando && <p className="text-xs text-muted-foreground">Nombre y marca autocompletados desde la base de referencia. Revisalos antes de guardar.</p>}
        <Field label="Categoría" htmlFor="p-category" hint="(opcional)">
          <Select id="p-category" value={form.categoryId} disabled={soloLectura} onChange={e => set('categoryId', e.target.value)}>
            <option value="">Sin categoría</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
      </div>

      <div className="grid gap-3">
        <p className="text-chico font-semibold text-muted-foreground">Unidades</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Se vende por" htmlFor="p-unit" hint={form.isWeighed ? '(pesable · siempre por kilo)' : undefined}>
            <Select id="p-unit" value={form.unit} disabled={soloLectura || form.isWeighed} onChange={e => set('unit', e.target.value)}>
              {SALE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              {!SALE_UNITS.some(u => u.value === form.unit) && <option value={form.unit}>{form.unit}</option>}
            </Select>
          </Field>
          <Field label="Se compra" htmlFor="p-buymode">
            <Select
              id="p-buymode"
              value={comprado ? 'pack' : 'same'}
              disabled={soloLectura}
              onChange={e => {
                if (e.target.value === 'same') setForm(f => ({ ...f, purchaseUnit: '', unitsPerPurchase: '1', packBarcode: '' }));
                else setForm(f => ({ ...f, purchaseUnit: f.purchaseUnit || 'Caja', unitsPerPurchase: f.unitsPerPurchase === '1' ? '' : f.unitsPerPurchase }));
              }}
            >
              <option value="same">En la misma unidad que se vende</option>
              <option value="pack">Por bulto cerrado (caja, pack…)</option>
            </Select>
          </Field>
        </div>
        {comprado && (
          <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-2">
            <Field label="Nombre del bulto" htmlFor="p-punit">
              <Input id="p-punit" list="pack-names" value={form.purchaseUnit} disabled={soloLectura} onChange={e => set('purchaseUnit', e.target.value)} />
              <datalist id="pack-names">{PACK_NAMES.map(n => <option key={n} value={n} />)}</datalist>
            </Field>
            <Field label={`Unidades por ${form.purchaseUnit.trim() || 'bulto'}`} htmlFor="p-upp">
              <Input id="p-upp" type="number" min="2" step="1" value={form.unitsPerPurchase} disabled={soloLectura} onChange={e => set('unitsPerPurchase', e.target.value)} />
            </Field>
            <Field label="Código de barras del bulto" htmlFor="p-packbc" hint="(opcional · para escanear la caja al recibir)" className="sm:col-span-2">
              <Input id="p-packbc" value={form.packBarcode} disabled={soloLectura} onChange={e => set('packBarcode', e.target.value)} />
            </Field>
            {Number(form.unitsPerPurchase) > 1 ? (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                1 {form.purchaseUnit.trim() || 'bulto'} = {Number(form.unitsPerPurchase)} {unitPlural(form.unit)}. Al recibir 1 {(form.purchaseUnit.trim() || 'bulto').toLowerCase()} entran {Number(form.unitsPerPurchase)} al stock; el costo se prorratea.
              </p>
            ) : form.unitsPerPurchase !== '' && (
              <p className="text-xs text-destructive sm:col-span-2">Un bulto tiene que traer más de una unidad.</p>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <p className="text-chico font-semibold text-muted-foreground">Impuestos</p>
          {!impuestosAbierto && (
            <button type="button" className="text-chico text-muted-foreground hover:text-foreground hover:underline" onClick={() => setImpuestosAbierto(true)}>
              Editar
            </button>
          )}
        </div>
        {!impuestosAbierto ? (
          <p className="text-sm text-muted-foreground">
            IVA {ivaLabel(form.ivaSituacion)}
            {Number(form.internalTaxRate) > 0 ? ` · Impuestos internos ${form.internalTaxRate}%` : ''}
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="IVA" htmlFor="p-iva">
                <Select id="p-iva" value={form.ivaSituacion} disabled={soloLectura} onChange={e => set('ivaSituacion', e.target.value)}>
                  {IVA_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>
              {(internoManual || Number(form.internalTaxRate) > 0) ? (
                <Field label="Impuestos internos %" htmlFor="p-int" hint="(alcohol, cigarrillos, bebidas)">
                  <Input id="p-int" type="number" min="0" step="0.01" value={form.internalTaxRate} disabled={soloLectura} onChange={e => set('internalTaxRate', e.target.value)} />
                </Field>
              ) : !soloLectura && (
                <div className="flex items-end">
                  <button type="button" className="text-chico text-primary hover:underline" onClick={() => setInternoManual(true)}>
                    + Impuesto interno
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="grid gap-3">
        <p className="text-chico font-semibold text-muted-foreground">Reposición y tipo</p>
        <Field label="Stock mínimo" htmlFor="p-min" hint="(opcional · alerta de reposición cuando el stock total caiga por debajo)">
          <Input id="p-min" type="number" min="0" step="0.001" value={form.minStock} disabled={soloLectura} onChange={e => set('minStock', e.target.value)} />
        </Field>
        <div className="flex items-center gap-2">
          <Checkbox id="p-venc" checked={form.manejaVencimiento} disabled={soloLectura} onCheckedChange={c => set('manejaVencimiento', c === true)} />
          <Label htmlFor="p-venc" className="font-normal">Maneja vencimiento</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="p-pes" checked={form.isWeighed} disabled={soloLectura} onCheckedChange={c => setForm(f => ({ ...f, isWeighed: c === true, unit: c === true ? 'kg' : f.unit }))} />
          <Label htmlFor="p-pes" className="font-normal">Pesable (se vende por peso, con balanza)</Label>
        </div>
      </div>

      {!creando && product && (
        <ModuleSection title="Códigos de barras" description="El principal se edita arriba. Acá se agregan los alternativos (packs, cambios de proveedor).">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-mono">{product.barcode}</Badge>
            <span className="text-xs text-muted-foreground">principal</span>
            {(product.extraBarcodes ?? []).map(b => (
              <span key={b.id} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-xs">
                {b.barcode}
                {puedeEditar && (
                  <button type="button" onClick={() => removeBarcode(b.id)} className="text-muted-foreground hover:text-destructive" aria-label={`Quitar ${b.barcode}`}>
                    <Trash className="size-3.5" />
                  </button>
                )}
              </span>
            ))}
          </div>
          {puedeEditar && (
            <form className="flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); void addBarcode(); }}>
              <Input value={newBarcode} onChange={e => setNewBarcode(e.target.value)} placeholder="Agregar otro código" className="max-w-xs" />
              <Button type="submit" variant="outline" size="sm" disabled={savingBarcode || !newBarcode.trim()}>
                {savingBarcode ? <Spinner /> : <Plus />} Agregar
              </Button>
            </form>
          )}
        </ModuleSection>
      )}
    </div>
  );

  const stockTab = (
    <div className="flex flex-col gap-6">
      <ModuleSection title="Stock por depósito">
        {stock.length === 0 ? (
          <EmptyState icon={Package} title="Sin stock" description="Este producto todavía no tiene existencias registradas." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Depósito</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stock.map(s => (
                <TableRow key={`${s.warehouseId}-${s.productLotId}`}>
                  <TableCell>{s.warehouseName}</TableCell>
                  <TableCell>{s.lotNumber ?? '—'}</TableCell>
                  <TableCell>{fecha(s.expirationDate)}</TableCell>
                  <TableCell>{s.supplierName ?? '—'}</TableCell>
                  <TableCell className="text-right font-medium tabular">{quantity(s.quantity)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ModuleSection>

      <ModuleSection title="Proveedores" description="Se arma solo con las compras registradas de este producto.">
        {(product?.suppliers ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no se registraron compras de este producto.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">Último costo</TableHead>
                <TableHead>Última compra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(product?.suppliers ?? []).map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.supplierName}</TableCell>
                  <TableCell className="text-right">{s.lastCost ? money(Number(s.lastCost)) : '—'}</TableCell>
                  <TableCell>{fecha(s.lastPurchaseAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ModuleSection>
    </div>
  );

  const preciosTab = (
    <div className="flex flex-col gap-6">
      <ModuleSection title="Costo y precio de venta" description="Se cargan y se auditan en el módulo de Precios.">
        <p className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span>Costo <span className="font-semibold tabular text-foreground">{product?.costPrice ? money(Number(product.costPrice)) : '—'}</span></span>
          <span>Venta <span className="font-semibold tabular text-foreground">{product?.salePrice ? money(Number(product.salePrice)) : '—'}</span></span>
          <span>Margen <span className="font-semibold tabular text-foreground">{m === null ? '—' : `${m.toFixed(0)}%`}</span></span>
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/precios')}>Ir a Precios</Button>
      </ModuleSection>

      <ModuleSection title="Escalas por cantidad" description="A partir de cierta cantidad rige otro precio. Todavía no se aplican: las va a usar el módulo de ventas.">
        {tiers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tiers.map(t => (
              <span key={t.id} className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1 text-sm">
                Desde {Number(t.minQty)} u. → {money(Number(t.price))}
                <Badge variant="outline">{t.priceListName}</Badge>
                {puedeEditarPrecios && (
                  <button type="button" onClick={() => removeTier(t.id)} className="text-muted-foreground hover:text-destructive" aria-label="Quitar escala">
                    <Trash className="size-3.5" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        {puedeEditarPrecios && (
          <form className="flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); void addTier(); }}>
            <Field label="Desde cantidad" htmlFor="tier-qty" className="max-w-36">
              <Input id="tier-qty" required type="number" min="2" step="0.001" value={tierForm.minQty} onChange={e => setTierForm({ ...tierForm, minQty: e.target.value })} />
            </Field>
            <Field label="Precio" htmlFor="tier-price" className="max-w-36">
              <Input id="tier-price" required type="number" min="0" step="0.01" value={tierForm.price} onChange={e => setTierForm({ ...tierForm, price: e.target.value })} />
            </Field>
            <Field label="Lista" htmlFor="tier-list" className="max-w-48">
              <Select id="tier-list" value={tierForm.priceListId} onChange={e => setTierForm({ ...tierForm, priceListId: e.target.value })}>
                {priceLists.map(l => <option key={l.id} value={l.isDefault ? '' : l.id}>{l.name}</option>)}
              </Select>
            </Field>
            <Button type="submit" variant="outline" size="sm" disabled={savingTier}>
              {savingTier ? <Spinner /> : <Plus />} Agregar
            </Button>
          </form>
        )}
      </ModuleSection>

      <ModuleSection title="Historial de precios">
        {(product?.priceHistory ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hubo cambios de precio registrados.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead className="text-right">Antes</TableHead>
                <TableHead className="text-right">Después</TableHead>
                <TableHead>Origen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(product?.priceHistory ?? []).map(h => (
                <TableRow key={h.id}>
                  <TableCell className="whitespace-nowrap">{fecha(h.createdAt)}</TableCell>
                  <TableCell>{h.field === 'cost' ? 'Costo' : 'Venta'}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{h.oldValue ? money(Number(h.oldValue)) : '—'}</TableCell>
                  <TableCell className="text-right font-medium">{money(Number(h.newValue))}</TableCell>
                  <TableCell><Badge variant="outline">{PRICE_SOURCES[h.source] ?? h.source}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ModuleSection>
    </div>
  );

  return (
    <>
      <ModuleScreen
        title={creando ? 'Nuevo producto' : (product?.name ?? '')}
        actions={
          !creando && product && (
            <>
              {puedeEditar && (
                <Button variant="outline" disabled={busy} onClick={() => void setActive(!product.isActive)}>
                  {product.isActive ? 'Desactivar' : 'Activar'}
                </Button>
              )}
              {puedeEliminar && (
                <Button variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash /> Eliminar
                </Button>
              )}
            </>
          )
        }
        summary={
          !creando && product ? (
            <div className="flex flex-col gap-2">
              <SummaryLine
                items={[
                  { label: 'Stock total', value: quantity(totalStock) },
                  { label: 'Costo', value: product.costPrice ? money(Number(product.costPrice)) : '—' },
                  { label: 'Precio de venta', value: product.salePrice ? money(Number(product.salePrice)) : '—' },
                  { label: 'Margen', value: m === null ? '—' : `${m.toFixed(0)}%` },
                ]}
              />
              <p className="text-micro text-placeholder">
                <span className="font-mono">{product.barcode}</span>
                {product.internalCode ? <> · Código interno <span className="font-mono">{product.internalCode}</span></> : null}
                {!product.isActive ? ' · Desactivado' : ''}
              </p>
            </div>
          ) : undefined
        }
        views={creando ? undefined : [
          { key: 'general', label: 'General' },
          { key: 'stock', label: 'Stock' },
          { key: 'precios', label: 'Precios' },
        ]}
        view={view}
        onView={k => setView(k as View)}
      >
        {error && <Alert variant="destructive">{error}</Alert>}

        {(creando || dirty) && !soloLectura && (
          <div className="sticky top-[57px] z-10 flex flex-wrap items-center justify-between gap-2 rounded-md border border-accent-border bg-accent/60 px-3 py-2 text-chico backdrop-blur">
            <span className="font-medium text-accent-foreground">
              {creando ? 'Producto nuevo — completá los datos y creá.' : 'Tenés cambios sin guardar.'}
            </span>
            <div className="flex gap-2">
              {!creando && (
                <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => setForm(baseline)}>Descartar</Button>
              )}
              {creando && (
                <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => navigate('/catalog/products')}>Cancelar</Button>
              )}
              <Button type="button" size="sm" disabled={saving || !form.barcode.trim() || !form.name.trim() || !form.unit.trim() || packInvalido} onClick={() => void save()}>
                {saving && <Spinner />} {creando ? 'Crear producto' : 'Guardar cambios'}
              </Button>
            </div>
          </div>
        )}

        {creando || view === 'general' ? generalTab : view === 'stock' ? stockTab : preciosTab}
      </ModuleScreen>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar «{product?.name}»</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se borra de verdad si nunca tuvo movimientos. Si ya se usó (stock, ventas o compras), te vamos a ofrecer desactivarlo. Esto no se puede deshacer.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
            <Button type="button" variant="destructive" onClick={doDelete} disabled={busy}>
              {busy ? <Spinner /> : <Trash />} Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deactivatePrompt} onOpenChange={setDeactivatePrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No se puede borrar</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            «{product?.name}» ya tuvo movimientos, así que es parte de la historia. Podés desactivarlo: deja de aparecer en la caja y en los listados, pero sus registros quedan.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeactivatePrompt(false)}>Cancelar</Button>
            <Button type="button" onClick={() => void setActive(false)} disabled={busy}>
              {busy && <Spinner />} Desactivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
