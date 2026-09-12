import { useEffect, useMemo, useState } from 'react';
import { Package, PencilSimple, Plus, Printer, Star, Trash } from '@phosphor-icons/react';
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
import { LabelPrint, PER_PAGE_OPTIONS, type LabelItem, type PerPage } from '@/components/label-print';
import { ModuleScreen, ModuleSection, SummaryLine } from '@/components/module-screen';
import { ProductSearchDialog } from '@/components/product-search-dialog';
import { PageSpinner, Spinner } from '@/components/spinner';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiError, api, errorMessage, type Branch, type Category, type Lot, type PriceList, type PriceTier, type Product, type ProductComponentLink, type ProductSupplierLink, type StockItem, type Supplier } from '@/lib/api';
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
  ivaSituacion: '21', internalTaxRate: '0', minStock: '', maxStock: '', costPrice: '', salePrice: '', manejaVencimiento: false, isWeighed: false,
};

// Redondeo suave del "calcular venta": a la decena de peso más cercana.
const redondearPrecio = (n: number) => (Number.isFinite(n) && n > 0 ? Math.round(n / 10) * 10 : 0);
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
    maxStock: p.maxStock ?? '',
    costPrice: p.costPrice ?? '',
    salePrice: p.salePrice ?? '',
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
  const [printingLabel, setPrintingLabel] = useState(false);
  const [labelCopies, setLabelCopies] = useState('1');
  const [labelPerPage, setLabelPerPage] = useState<PerPage>(6);
  const [label, setLabel] = useState<LabelItem[] | null>(null);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(!creando);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>('general');

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [baseline, setBaseline] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [referenceHint, setReferenceHint] = useState(false);

  const [newBarcode, setNewBarcode] = useState('');
  const [savingBarcode, setSavingBarcode] = useState(false);
  const [tierForm, setTierForm] = useState({ minQty: '', price: '', priceListId: '' });
  const [savingTier, setSavingTier] = useState(false);
  const [margenObjetivo, setMargenObjetivo] = useState('');
  // Proveedores del producto (se cargan a mano además de venir de las compras).
  const [supplierOptions, setSupplierOptions] = useState<Supplier[]>([]);
  const [newSupplier, setNewSupplier] = useState({ supplierId: '', supplierCode: '', cost: '' });
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [editSupplierId, setEditSupplierId] = useState('');
  const [editSupplier, setEditSupplier] = useState({ supplierCode: '', cost: '' });
  const [removeSupplierLink, setRemoveSupplierLink] = useState<ProductSupplierLink | null>(null);
  // Kit/combo: componentes armados con otros productos (buscador + cantidad).
  const [kitSearchOpen, setKitSearchOpen] = useState(false);
  const [pendingComponent, setPendingComponent] = useState<Product | null>(null);
  const [componentQty, setComponentQty] = useState('1');
  const [savingComponent, setSavingComponent] = useState(false);
  const [editComponentId, setEditComponentId] = useState('');
  const [editComponentQty, setEditComponentQty] = useState('');
  const [removeComponentLink, setRemoveComponentLink] = useState<ProductComponentLink | null>(null);
  // Reposición por sucursal (solo si el negocio tiene más de una): pisa el valor
  // general del producto. Se guarda con la misma barra "Guardar cambios".
  const [ruleBranchId, setRuleBranchId] = useState('');
  const [branchRule, setBranchRule] = useState({ minStock: '', maxStock: '' });
  const [branchRuleBase, setBranchRuleBase] = useState({ minStock: '', maxStock: '' });

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deactivatePrompt, setDeactivatePrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  // `lots` se carga para futuros usos (edición de lote); hoy no se lista suelto.
  void lots;

  // Comparador de proveedores: el más barato primero, los que todavía no
  // tienen costo cargado al final (no son "gratis", son un dato que falta).
  const sortedSuppliers = useMemo(() => {
    const list = product?.suppliers ?? [];
    return [...list].sort((a, b) => {
      const costA = a.lastCost ? Number(a.lastCost) : Infinity;
      const costB = b.lastCost ? Number(b.lastCost) : Infinity;
      return costA - costB;
    });
  }, [product?.suppliers]);
  const cheapestSupplierId = sortedSuppliers.find(s => s.lastCost)?.supplierId;

  const branchRuleDirty = JSON.stringify(branchRule) !== JSON.stringify(branchRuleBase);
  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(baseline) || branchRuleDirty,
    [form, baseline, branchRuleDirty],
  );
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));
  // "Se compra por bulto cerrado" está activo cuando hay nombre de bulto.
  const comprado = form.purchaseUnit.trim() !== '';
  const packInvalido = comprado && !(Number(form.unitsPerPurchase) > 1);
  const multiSucursal = branches.length > 1;

  const ruleFor = (p: Product, branchId: string) => {
    const r = (p.stockRules ?? []).find(x => x.branchId === branchId);
    return { minStock: r?.minStock ?? '', maxStock: r?.maxStock ?? '' };
  };
  // Cuando cambia la sucursal elegida en el editor por-sucursal, cargar su regla.
  useEffect(() => {
    if (!product || !ruleBranchId) return;
    const r = ruleFor(product, ruleBranchId);
    setBranchRule(r);
    setBranchRuleBase(r);
  }, [ruleBranchId, product]);

  const loadProduct = () => api<Product>(`/products/${id}`, {}, token).then(p => {
    setProduct(p);
    setForm(formOf(p));
    setBaseline(formOf(p));
    const bid = p.activeBranchId ?? '';
    setRuleBranchId(bid);
    const br = ruleFor(p, bid);
    setBranchRule(br);
    setBranchRuleBase(br);
  });
  const loadTiers = () => api<PriceTier[]>(`/products/${id}/tiers`, {}, token).then(setTiers).catch(() => {});

  useEffect(() => {
    api<Category[]>('/categories', {}, token).then(setCategories).catch(() => {});
    api<PriceList[]>('/price-lists', {}, token).then(setPriceLists).catch(() => {});
    api<Branch[]>('/branches', {}, token).then(setBranches).catch(() => {});
    if (can('proveedores.ver')) api<Supplier[]>('/suppliers', {}, token).then(setSupplierOptions).catch(() => {});
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

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
        const bid = p.activeBranchId ?? '';
        setRuleBranchId(bid);
        const br = ruleFor(p, bid);
        setBranchRule(br);
        setBranchRuleBase(br);
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
        maxStock: form.maxStock || null,
        purchaseUnit: comprado ? form.purchaseUnit.trim() : '',
        packBarcode: comprado ? form.packBarcode.trim() : '',
      };
      if (creando) {
        const created = await api<Product>('/products', { method: 'POST', body: JSON.stringify(body) }, token);
        navigate(`/catalog/products/${created.id}`, { replace: true });
      } else {
        await api(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }, token);
        if (branchRuleDirty && ruleBranchId) {
          await api(`/products/${id}/stock-rule`, {
            method: 'PUT',
            body: JSON.stringify({ branchId: ruleBranchId, minStock: branchRule.minStock || null, maxStock: branchRule.maxStock || null }),
          }, token);
        }
        const precioBody: Record<string, unknown> = {};
        if (puedeEditarPrecios) {
          if (form.costPrice !== baseline.costPrice) precioBody.costPrice = form.costPrice.trim() === '' ? null : form.costPrice;
          if (form.salePrice !== baseline.salePrice && form.salePrice.trim() !== '') precioBody.salePrice = form.salePrice;
        }
        if (Object.keys(precioBody).length) {
          await api(`/products/${id}/price`, { method: 'PUT', body: JSON.stringify(precioBody) }, token);
        }
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

  async function addSupplier() {
    if (!newSupplier.supplierId) return;
    setSavingSupplier(true);
    setError('');
    try {
      await api(`/products/${id}/suppliers`, { method: 'POST', body: JSON.stringify({
        supplierId: newSupplier.supplierId,
        supplierCode: newSupplier.supplierCode.trim() || undefined,
        cost: newSupplier.cost.trim() || undefined,
      }) }, token);
      setNewSupplier({ supplierId: '', supplierCode: '', cost: '' });
      await loadProduct();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingSupplier(false);
    }
  }

  async function patchSupplier(supplierId: string, body: Record<string, unknown>) {
    setError('');
    try {
      await api(`/products/${id}/suppliers/${supplierId}`, { method: 'PATCH', body: JSON.stringify(body) }, token);
      setEditSupplierId('');
      await loadProduct();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function doRemoveSupplier() {
    if (!removeSupplierLink) return;
    setError('');
    try {
      await api(`/products/${id}/suppliers/${removeSupplierLink.supplierId}`, { method: 'DELETE' }, token);
      setRemoveSupplierLink(null);
      await loadProduct();
    } catch (err) {
      setError(errorMessage(err));
      setRemoveSupplierLink(null);
    }
  }

  async function addComponent() {
    if (!pendingComponent) return;
    setSavingComponent(true);
    setError('');
    try {
      await api(`/products/${id}/components`, { method: 'POST', body: JSON.stringify({ componentProductId: pendingComponent.id, quantity: componentQty }) }, token);
      setPendingComponent(null);
      setComponentQty('1');
      await loadProduct();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingComponent(false);
    }
  }

  async function patchComponent(componentId: string, quantity: string) {
    setError('');
    try {
      await api(`/products/${id}/components/${componentId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) }, token);
      setEditComponentId('');
      await loadProduct();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function doRemoveComponent() {
    if (!removeComponentLink) return;
    setError('');
    try {
      await api(`/products/${id}/components/${removeComponentLink.id}`, { method: 'DELETE' }, token);
      setRemoveComponentLink(null);
      await loadProduct();
    } catch (err) {
      setError(errorMessage(err));
      setRemoveComponentLink(null);
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
  // Margen y ganancia en vivo, sobre lo que hay en el formulario (no lo guardado).
  const mForm = margin(form.costPrice || null, form.salePrice || null);
  const gananciaForm = Number(form.costPrice) > 0 && Number(form.salePrice) > 0 ? Number(form.salePrice) - Number(form.costPrice) : null;

  const generalTab = (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3">
        <p className="text-chico font-semibold text-muted-foreground">Identificación</p>
        <Field label="Nombre" htmlFor="p-name">
          <Input id="p-name" value={form.name} disabled={soloLectura} onChange={e => set('name', e.target.value)} />
        </Field>
        {referenceHint && creando && <p className="text-xs text-muted-foreground">Nombre y marca autocompletados desde la base de referencia. Revisalos antes de guardar.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Marca" htmlFor="p-brand" hint="(opcional)">
            <Input id="p-brand" value={form.brand} disabled={soloLectura} onChange={e => set('brand', e.target.value)} />
          </Field>
          <Field label="Categoría" htmlFor="p-category" hint="(opcional)">
            <Select id="p-category" value={form.categoryId} disabled={soloLectura} onChange={e => set('categoryId', e.target.value)}>
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
      </div>

      <div className="grid gap-3">
        <p className="text-chico font-semibold text-muted-foreground">Códigos de barras</p>
        <Field label="Principal" htmlFor="p-barcode">
          <Input id="p-barcode" value={form.barcode} disabled={soloLectura} onChange={e => set('barcode', e.target.value)} />
        </Field>
        {comprado && (
          <Field label="Del bulto" htmlFor="p-packbc" hint="(opcional · para escanear la caja cerrada al recibir)">
            <Input id="p-packbc" value={form.packBarcode} disabled={soloLectura} onChange={e => set('packBarcode', e.target.value)} />
          </Field>
        )}
        {!creando && product && (
          <div className="flex flex-col gap-2">
            {(product.extraBarcodes ?? []).length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Alternativos:</span>
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
            )}
            {puedeEditar && (
              <form className="flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); void addBarcode(); }}>
                <Input value={newBarcode} onChange={e => setNewBarcode(e.target.value)} placeholder="Agregar código alternativo" className="max-w-xs" />
                <Button type="submit" variant="outline" size="sm" disabled={savingBarcode || !newBarcode.trim()}>
                  {savingBarcode ? <Spinner /> : <Plus />} Agregar
                </Button>
              </form>
            )}
            <p className="text-xs text-muted-foreground">El principal se edita arriba. Los alternativos son otros EAN del mismo producto (packs, cambios de proveedor).</p>
          </div>
        )}
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
        <p className="text-chico font-semibold text-muted-foreground">Impuestos</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="IVA" htmlFor="p-iva">
            <Select id="p-iva" value={form.ivaSituacion} disabled={soloLectura} onChange={e => set('ivaSituacion', e.target.value)}>
              {IVA_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Impuestos internos %" htmlFor="p-int" hint="(opcional · alcohol, cigarrillos, bebidas)">
            <Input id="p-int" type="number" min="0" step="0.01" value={form.internalTaxRate} disabled={soloLectura} onChange={e => set('internalTaxRate', e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="grid gap-3">
        <p className="text-chico font-semibold text-muted-foreground">Tipo de producto</p>
        <div className="flex items-center gap-2">
          <Checkbox id="p-venc" checked={form.manejaVencimiento} disabled={soloLectura} onCheckedChange={c => set('manejaVencimiento', c === true)} />
          <Label htmlFor="p-venc" className="font-normal">Maneja vencimiento</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="p-pes" checked={form.isWeighed} disabled={soloLectura} onCheckedChange={c => setForm(f => ({ ...f, isWeighed: c === true, unit: c === true ? 'kg' : f.unit }))} />
          <Label htmlFor="p-pes" className="font-normal">Pesable (se vende por peso, con balanza)</Label>
        </div>
      </div>

    </div>
  );

  const stockTab = (
    <div className="flex flex-col gap-6">
      <ModuleSection title="Reposición" description="Cuando el stock cae por debajo del mínimo, el producto aparece en la lista de Reposición.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Stock mínimo" htmlFor="s-min">
            <Input id="s-min" type="number" min="0" step="0.001" value={form.minStock} disabled={soloLectura} onChange={e => set('minStock', e.target.value)} />
          </Field>
          <Field label="Reponer hasta" htmlFor="s-max" hint="(opcional · cuánto pedir para volver a este nivel)">
            <Input id="s-max" type="number" min="0" step="0.001" value={form.maxStock} disabled={soloLectura} onChange={e => set('maxStock', e.target.value)} />
          </Field>
        </div>

        {multiSucursal && (
          <details className="mt-1">
            <summary className="w-fit cursor-pointer text-chico text-muted-foreground hover:text-foreground">
              Fijar un valor distinto para una sucursal
            </summary>
            <div className="mt-3 grid gap-3 rounded-md border border-border p-3">
              <Field label="Sucursal" htmlFor="s-branch">
                <Select id="s-branch" value={ruleBranchId} disabled={soloLectura} onChange={e => setRuleBranchId(e.target.value)}>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Stock mínimo" htmlFor="br-min" hint={form.minStock ? `(general: ${form.minStock})` : undefined}>
                  <Input id="br-min" type="number" min="0" step="0.001" value={branchRule.minStock} disabled={soloLectura}
                    onChange={e => setBranchRule(r => ({ ...r, minStock: e.target.value }))} />
                </Field>
                <Field label="Reponer hasta" htmlFor="br-max" hint={form.maxStock ? `(general: ${form.maxStock})` : undefined}>
                  <Input id="br-max" type="number" min="0" step="0.001" value={branchRule.maxStock} disabled={soloLectura}
                    onChange={e => setBranchRule(r => ({ ...r, maxStock: e.target.value }))} />
                </Field>
              </div>
              <p className="text-xs text-muted-foreground">Vacío = esta sucursal usa el valor general de arriba.</p>
            </div>
          </details>
        )}
      </ModuleSection>

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

      <ModuleSection title="Proveedores" description="Quién te vende este producto y a qué costo — ordenados del más barato al más caro. La ★ marca a quién pedirle al reponer, y no siempre coincide con el más barato: a veces pesa más la entrega o la confianza.">
        {sortedSuppliers.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-9" />
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead>Última compra</TableHead>
                {puedeEditar && <TableHead className="w-16" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSuppliers.map(s => {
                const editing = editSupplierId === s.supplierId;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="w-9">
                      <button
                        type="button"
                        disabled={!puedeEditar || s.isPreferred}
                        onClick={() => void patchSupplier(s.supplierId, { preferred: true })}
                        className={s.isPreferred ? 'text-primary' : 'text-placeholder hover:text-foreground disabled:hover:text-placeholder'}
                        aria-label={s.isPreferred ? 'Proveedor principal' : 'Marcar como principal'}
                        title={s.isPreferred ? 'Principal' : 'Marcar como principal'}
                      >
                        <Star weight={s.isPreferred ? 'fill' : 'regular'} />
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{s.supplierName}</div>
                      {editing ? (
                        <Input value={editSupplier.supplierCode} placeholder="Código del proveedor" onChange={e => setEditSupplier(f => ({ ...f, supplierCode: e.target.value }))} className="mt-1 h-8 max-w-40" />
                      ) : s.supplierCode ? (
                        <div className="text-chico text-placeholder">Cód. {s.supplierCode}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      {editing ? (
                        <Input type="number" min="0" step="0.01" value={editSupplier.cost} onChange={e => setEditSupplier(f => ({ ...f, cost: e.target.value }))} className="h-8 max-w-28 text-right" />
                      ) : s.lastCost ? (
                        <div className="flex items-center justify-end gap-2">
                          {sortedSuppliers.length > 1 && s.supplierId === cheapestSupplierId && <Badge variant="success">Más barato</Badge>}
                          {money(Number(s.lastCost))}
                        </div>
                      ) : (
                        <span className="text-placeholder">—</span>
                      )}
                    </TableCell>
                    <TableCell>{s.lastPurchaseAt ? fecha(s.lastPurchaseAt) : <span className="text-placeholder">a mano</span>}</TableCell>
                    {puedeEditar && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {editing ? (
                            <>
                              <Button type="button" size="sm" variant="outline" onClick={() => void patchSupplier(s.supplierId, { supplierCode: editSupplier.supplierCode.trim() || null, cost: editSupplier.cost.trim() || null })}>Guardar</Button>
                              <Button type="button" size="sm" variant="ghost" onClick={() => setEditSupplierId('')}>Cancelar</Button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => { setEditSupplierId(s.supplierId); setEditSupplier({ supplierCode: s.supplierCode ?? '', cost: s.lastCost ?? '' }); }} className="text-muted-foreground hover:text-foreground" aria-label={`Editar ${s.supplierName}`}>
                                <PencilSimple className="size-4" />
                              </button>
                              <button type="button" onClick={() => setRemoveSupplierLink(s)} className="text-muted-foreground hover:text-destructive" aria-label={`Quitar ${s.supplierName}`}>
                                <Trash className="size-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {(product?.suppliers ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay proveedores para este producto.</p>
        )}
        {puedeEditar && can('proveedores.ver') && (
          <form className="flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); void addSupplier(); }}>
            <Field label="Agregar proveedor" htmlFor="add-supplier" className="min-w-48">
              <Select id="add-supplier" value={newSupplier.supplierId} onChange={e => setNewSupplier(f => ({ ...f, supplierId: e.target.value }))}>
                <option value="">Elegir…</option>
                {supplierOptions.filter(o => !(product?.suppliers ?? []).some(l => l.supplierId === o.id)).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </Select>
            </Field>
            <Field label="Código" htmlFor="add-supplier-code" className="max-w-32" hint="(opcional)">
              <Input id="add-supplier-code" value={newSupplier.supplierCode} onChange={e => setNewSupplier(f => ({ ...f, supplierCode: e.target.value }))} />
            </Field>
            <Field label="Costo" htmlFor="add-supplier-cost" className="max-w-28" hint="(opcional)">
              <Input id="add-supplier-cost" type="number" min="0" step="0.01" value={newSupplier.cost} onChange={e => setNewSupplier(f => ({ ...f, cost: e.target.value }))} />
            </Field>
            <Button type="submit" variant="outline" size="sm" disabled={savingSupplier || !newSupplier.supplierId}>
              {savingSupplier ? <Spinner /> : <Plus />} Agregar
            </Button>
          </form>
        )}
      </ModuleSection>

      <ModuleSection
        title="Kit / combo"
        description={
          (product?.components ?? []).length > 0
            ? 'Este producto no tiene stock propio: vender uno descuenta el de sus componentes, en la cantidad de acá abajo.'
            : product?.isComponentOfKit
              ? 'Ya es componente de otro combo, así que no puede tener sus propios componentes (un combo no puede contener otro combo).'
              : 'Si este producto es un combo armado con otros (ej. "combo desayuno" = café + medialuna), sumá acá sus componentes.'
        }
      >
        {(product?.components ?? []).length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Componente</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                {puedeEditar && <TableHead className="w-16" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(product?.components ?? []).map(c => {
                const editing = editComponentId === c.id;
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.componentName}</div>
                      <div className="text-chico text-placeholder">{c.componentBarcode}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      {editing
                        ? <Input type="number" min="0.001" step="0.001" value={editComponentQty} onChange={e => setEditComponentQty(e.target.value)} className="ml-auto h-8 max-w-24 text-right" />
                        : quantity(c.quantity)}
                    </TableCell>
                    {puedeEditar && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {editing ? (
                            <>
                              <Button type="button" size="sm" variant="outline" onClick={() => void patchComponent(c.id, editComponentQty)}>Guardar</Button>
                              <Button type="button" size="sm" variant="ghost" onClick={() => setEditComponentId('')}>Cancelar</Button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => { setEditComponentId(c.id); setEditComponentQty(c.quantity); }} className="text-muted-foreground hover:text-foreground" aria-label={`Editar ${c.componentName}`}>
                                <PencilSimple className="size-4" />
                              </button>
                              <button type="button" onClick={() => setRemoveComponentLink(c)} className="text-muted-foreground hover:text-destructive" aria-label={`Quitar ${c.componentName}`}>
                                <Trash className="size-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {(product?.components ?? []).length > 0 && (
          <p className="text-chico text-muted-foreground">
            Costo sugerido del combo: {money((product?.components ?? []).reduce((sum, c) => sum + Number(c.quantity) * Number(c.componentCostPrice ?? 0), 0))}
            {' '}(suma de sus componentes al costo de hoy — el costo del combo se sigue cargando a mano arriba, en Precios).
          </p>
        )}
        {puedeEditar && !product?.isComponentOfKit && (
          <Button type="button" variant="outline" size="sm" onClick={() => setKitSearchOpen(true)}>
            <Plus /> Agregar componente
          </Button>
        )}
      </ModuleSection>
    </div>
  );

  const preciosTab = (
    <div className="flex flex-col gap-6">
      <ModuleSection
        title="Costo y precio de venta"
        description={puedeEditarPrecios
          ? 'La venta es el precio de la lista base (mostrador). Las otras listas y las actualizaciones masivas van en el módulo Precios. Cada cambio queda en el historial de abajo.'
          : 'Se cargan desde el módulo de Precios.'}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Precio de costo" htmlFor="p-cost" hint="(lo que te cuesta)">
            <Input id="p-cost" type="number" min="0" step="0.01" value={form.costPrice} disabled={soloLectura || !puedeEditarPrecios} onChange={e => set('costPrice', e.target.value)} />
          </Field>
          <Field label="Precio de venta" htmlFor="p-sale" hint="(mostrador · lista base)">
            <Input id="p-sale" type="number" min="0" step="0.01" value={form.salePrice} disabled={soloLectura || !puedeEditarPrecios} onChange={e => set('salePrice', e.target.value)} />
          </Field>
        </div>
        <p className="text-sm text-muted-foreground">
          Margen <span className="font-semibold tabular text-foreground">{mForm === null ? '—' : `${mForm.toFixed(0)}%`}</span>
          {gananciaForm !== null && <> · ganás <span className="font-medium text-foreground">{money(gananciaForm)}</span> por {unitLabel(form.unit)}</>}
        </p>
        {puedeEditarPrecios && !soloLectura && Number(form.costPrice) > 0 && (
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Calcular la venta con margen" htmlFor="p-margobj" hint="%" className="max-w-40">
              <Input id="p-margobj" type="number" min="0" max="99" step="1" value={margenObjetivo} onChange={e => setMargenObjetivo(e.target.value)} />
            </Field>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!(Number(margenObjetivo) > 0 && Number(margenObjetivo) < 100)}
              onClick={() => set('salePrice', String(redondearPrecio(Number(form.costPrice) / (1 - Number(margenObjetivo) / 100))))}
            >
              Calcular venta
            </Button>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={() => navigate('/precios')}>Abrir módulo Precios</Button>
      </ModuleSection>

      <ModuleSection title="Escalas por cantidad" description="A partir de cierta cantidad rige otro precio. Se aplican en la caja.">
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
      <LabelPrint items={label} perPage={labelPerPage} onPrinted={() => setLabel(null)} />
      <ModuleScreen
        title={creando ? 'Nuevo producto' : (product?.name ?? '')}
        actions={
          !creando && product && (
            <>
              <Button variant="outline" onClick={() => { setLabelCopies('1'); setPrintingLabel(true); }}>
                <Printer /> Imprimir etiqueta
              </Button>
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
                {product.sku ? <> · SKU <span className="font-mono">{product.sku}</span></> : null}
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
                <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => { setForm(baseline); setBranchRule(branchRuleBase); }}>Descartar</Button>
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

      <Dialog open={printingLabel} onOpenChange={setPrintingLabel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Imprimir etiqueta</DialogTitle>
          </DialogHeader>
          {!product?.salePrice && (
            <Alert variant="destructive">Este producto no tiene precio de venta cargado — la etiqueta saldría sin precio.</Alert>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cantidad de copias" htmlFor="label-copies" hint="una por cada punta de góndola donde va este producto">
              <Input id="label-copies" type="number" min="1" step="1" value={labelCopies} onChange={e => setLabelCopies(e.target.value)} />
            </Field>
            <Field label="Por hoja" htmlFor="label-per-page">
              <Select id="label-per-page" value={labelPerPage} onChange={e => setLabelPerPage(Number(e.target.value) as PerPage)}>
                {PER_PAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPrintingLabel(false)}>Cancelar</Button>
            <Button
              type="button"
              onClick={() => {
                if (!product) return;
                setPrintingLabel(false);
                setLabel([{
                  name: product.name, brand: product.brand, barcode: product.barcode,
                  price: product.salePrice ? Number(product.salePrice) : null, copies: Math.max(1, Number(labelCopies) || 1),
                }]);
              }}
            >
              <Printer /> Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <Dialog open={!!removeSupplierLink} onOpenChange={o => { if (!o) setRemoveSupplierLink(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quitar «{removeSupplierLink?.supplierName}»</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {removeSupplierLink?.lastPurchaseAt
              ? 'Este proveedor tiene compras registradas de este producto. Quitarlo del listado no borra esas compras —siguen en el historial y en el stock—, solo deja de figurar como proveedor del producto.'
              : 'Se quita este proveedor del producto. No afecta nada más.'}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRemoveSupplierLink(null)}>Cancelar</Button>
            <Button type="button" variant="destructive" onClick={() => void doRemoveSupplier()}>
              <Trash /> Quitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProductSearchDialog
        open={kitSearchOpen}
        onOpenChange={setKitSearchOpen}
        titulo="Buscar componente"
        accion="Elegir"
        token={token}
        onPick={p => { setKitSearchOpen(false); setComponentQty('1'); setPendingComponent(p); }}
      />

      <Dialog open={!!pendingComponent} onOpenChange={o => { if (!o) setPendingComponent(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar «{pendingComponent?.name}»</DialogTitle>
          </DialogHeader>
          <Field label="Cantidad por combo" htmlFor="component-qty" hint="cuántas unidades de este producto lleva cada combo vendido">
            <Input id="component-qty" type="number" min="0.001" step="0.001" autoFocus value={componentQty} onChange={e => setComponentQty(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingComponent(null)}>Cancelar</Button>
            <Button type="button" onClick={() => void addComponent()} disabled={savingComponent}>
              {savingComponent ? <Spinner /> : <Plus />} Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeComponentLink} onOpenChange={o => { if (!o) setRemoveComponentLink(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quitar «{removeComponentLink?.componentName}»</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Deja de formar parte de este combo. No afecta el stock ya vendido.</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRemoveComponentLink(null)}>Cancelar</Button>
            <Button type="button" variant="destructive" onClick={() => void doRemoveComponent()}>
              <Trash /> Quitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
