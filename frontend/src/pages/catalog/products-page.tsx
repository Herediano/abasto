import { useEffect, useState, type FormEvent } from 'react';
import { Boxes, Download, Eye, Pencil, Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/page-header';
import { PageSpinner, Spinner } from '@/components/spinner';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, downloadFile, errorMessage, type Category, type Pagination, type PriceList, type Product } from '@/lib/api';
import { money } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';

const EMPTY_FORM = { barcode: '', name: '', categoryId: '', unit: 'unidad', purchaseUnit: '', unitsPerPurchase: '1', brand: '', costPrice: '', salePrice: '', taxRate: '21', internalTaxRate: '0', minStock: '', manejaVencimiento: false };
// Alicuotas vigentes en Argentina; el backend valida contra la misma lista.
const TAX_RATES = ['0', '2.5', '5', '10.5', '21', '27'];
type FormState = typeof EMPTY_FORM;

function margin(costPrice?: string | null, salePrice?: string | null) {
  const cost = Number(costPrice);
  const sale = Number(salePrice);
  if (!costPrice || !salePrice || !Number.isFinite(cost) || !Number.isFinite(sale) || sale <= 0) return null;
  return ((sale - cost) / sale) * 100;
}

export function ProductsPage() {
  const { session, isAdmin } = useAuth();
  const token = session!.accessToken;
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [brands, setBrands] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [status, setStatus] = useState('active');
  const [priced, setPriced] = useState('');
  const [stock, setStock] = useState('');
  const [sort, setSort] = useState('name');
  const [exporting, setExporting] = useState(false);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [priceListId, setPriceListId] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, totalPages: 0, pageSize: 20, page: 1 });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [referenceHint, setReferenceHint] = useState(false);

  const loadCategories = () => api<Category[]>('/categories', {}, token).then(setCategories).catch(e => setError(errorMessage(e)));
  const loadBrands = () => api<string[]>('/products/brands', {}, token).then(setBrands).catch(() => {});
  const loadPriceLists = () => api<PriceList[]>('/price-lists', {}, token).then(setPriceLists).catch(() => {});

  const filterParams = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryId) params.set('categoryId', categoryId);
    if (brand) params.set('brand', brand);
    if (status !== 'active') params.set('status', status);
    if (priced) params.set('priced', priced);
    if (stock) params.set('stock', stock);
    if (sort !== 'name') params.set('sort', sort);
    if (priceListId) params.set('priceListId', priceListId);
    return params;
  };

  const load = () => {
    setLoading(true);
    const params = filterParams();
    params.set('page', String(page));
    params.set('pageSize', '20');
    return api<{ items: Product[]; pagination: Pagination }>(`/products?${params}`, {}, token)
      .then(r => {
        setItems(r.items);
        setPagination(r.pagination);
      })
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => { void loadCategories(); void loadBrands(); void loadPriceLists(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); }, [search, categoryId, brand, status, priced, stock, sort, priceListId]);
  useEffect(() => { void load(); }, [token, search, categoryId, brand, status, priced, stock, sort, priceListId, page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function exportExcel() {
    setExporting(true);
    setError('');
    try {
      await downloadFile(`/products/export?${filterParams()}`, token, 'productos.xlsx');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    if (editing || !open) return;
    const barcode = form.barcode.trim();
    setReferenceHint(false);
    if (!barcode) return;
    const timeout = setTimeout(() => {
      api<{ name: string; brand: string | null; category: string | null }>(`/product-reference/${encodeURIComponent(barcode)}`, {}, token)
        .then(ref => {
          // El rubro de referencia solo se aplica si el tenant ya tiene una
          // categoría con ese nombre; no se crea sola para no ensuciar el listado.
          const matchedCategory = ref.category
            ? categories.find(c => c.name.toLowerCase() === ref.category!.toLowerCase())
            : undefined;
          let applied = false;
          setForm(f => {
            if (f.barcode.trim() !== barcode || f.name) return f;
            applied = true;
            return { ...f, name: ref.name, brand: ref.brand ?? f.brand, categoryId: f.categoryId || matchedCategory?.id || '' };
          });
          if (applied) setReferenceHint(true);
        })
        .catch(() => {});
    }, 400);
    return () => clearTimeout(timeout);
  }, [form.barcode, editing, open, token, categories]); // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setNewCategoryName('');
    setCreatingCategory(false);
    setReferenceHint(false);
    setError('');
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      barcode: p.barcode,
      name: p.name,
      categoryId: p.categoryId ?? '',
      unit: p.unit,
      purchaseUnit: p.purchaseUnit ?? '',
      unitsPerPurchase: p.unitsPerPurchase ?? '1',
      brand: p.brand ?? '',
      costPrice: p.costPrice ?? '',
      salePrice: p.salePrice ?? '',
      taxRate: p.taxRate,
      internalTaxRate: p.internalTaxRate ?? '0',
      minStock: p.minStock ?? '',
      manejaVencimiento: p.manejaVencimiento,
    });
    setNewCategoryName('');
    setCreatingCategory(false);
    setError('');
    setOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = { ...form, categoryId: form.categoryId || null, costPrice: form.costPrice || null, salePrice: form.salePrice || null, minStock: form.minStock || null };
      if (editing) await api(`/products/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) }, token);
      else await api('/products', { method: 'POST', body: JSON.stringify(body) }, token);
      setOpen(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function createCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setSavingCategory(true);
    setError('');
    try {
      const created = await api<Category>('/categories', { method: 'POST', body: JSON.stringify({ name }) }, token);
      setCategories(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(f => ({ ...f, categoryId: created.id }));
      setNewCategoryName('');
      setCreatingCategory(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingCategory(false);
    }
  }

  async function toggleActive(p: Product) {
    setError('');
    try {
      await api(`/products/${p.id}`, { method: 'PUT', body: JSON.stringify({ isActive: !p.isActive }) }, token);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Productos"
        description="Catálogo de productos del tenant."
        actions={
          <>
            <Button variant="outline" onClick={exportExcel} disabled={exporting || loading}>
              {exporting ? <Spinner /> : <Download />} Exportar a Excel
            </Button>
            <Button onClick={openCreate}>
              <Plus /> Nuevo producto
            </Button>
          </>
        }
      />
      {error && !open && <Alert variant="destructive">{error}</Alert>}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4">
          <Field label="Buscar" htmlFor="filter-search" className="max-w-sm">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="filter-search" className="pl-8" placeholder="Nombre, código de barras o interno" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
            </div>
          </Field>
          <Field label="Categoría" htmlFor="filter-category">
            <Select id="filter-category" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">Todas</option>
              <option value="none">Sin categoría</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Marca" htmlFor="filter-brand">
            <Select id="filter-brand" value={brand} onChange={e => setBrand(e.target.value)}>
              <option value="">Todas</option>
              {brands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </Select>
          </Field>
          <Field label="Estado" htmlFor="filter-status">
            <Select id="filter-status" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="active">Activos</option>
              <option value="inactive">Desactivados</option>
              <option value="all">Todos</option>
            </Select>
          </Field>
          <Field label="Precio de venta" htmlFor="filter-priced">
            <Select id="filter-priced" value={priced} onChange={e => setPriced(e.target.value)}>
              <option value="">Todos</option>
              <option value="yes">Con precio</option>
              <option value="no">Sin precio</option>
            </Select>
          </Field>
          <Field label="Stock" htmlFor="filter-stock">
            <Select id="filter-stock" value={stock} onChange={e => setStock(e.target.value)}>
              <option value="">Todos</option>
              <option value="low">Bajo mínimo</option>
              <option value="out">Sin stock</option>
            </Select>
          </Field>
          <Field label="Ordenar por" htmlFor="filter-sort">
            <Select id="filter-sort" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="name">Nombre (A-Z)</option>
              <option value="newest">Más nuevos</option>
              <option value="updated">Actualizados recién</option>
              <option value="price_desc">Mayor precio</option>
              <option value="price_asc">Menor precio</option>
            </Select>
          </Field>

          {/* Con más de una lista se puede mirar el catálogo con los precios de
              cualquiera de ellas, incluidas las que se calculan solas. */}
          {priceLists.length > 1 && (
            <Field label="Ver precios de" htmlFor="filter-pricelist">
              <Select id="filter-pricelist" value={priceListId} onChange={e => setPriceListId(e.target.value)}>
                {priceLists.map(l => (
                  <option key={l.id} value={l.isDefault ? '' : l.id}>
                    {l.name}
                    {l.derivesFromName ? ` (${l.derivesFromName} ${Number(l.markupPercent) >= 0 ? '+' : ''}${Number(l.markupPercent)}%)` : ''}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <PageSpinner />
          ) : items.length === 0 ? (
            <EmptyState icon={Boxes} title={status === 'inactive' ? 'Sin productos desactivados' : 'Sin productos'} description={search || categoryId || brand || priced || stock ? 'No hay productos que coincidan con los filtros.' : 'Creá el primer producto para empezar a manejar stock.'} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Cód. barras</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(p => {
                    const m = margin(p.costPrice, p.salePrice);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.internalCode}</TableCell>
                        <TableCell className="font-mono text-xs">{p.barcode}</TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.brand ?? '—'}</TableCell>
                        <TableCell>{p.categoryName ?? '—'}</TableCell>
                        <TableCell className="text-right">{p.salePrice ? `${money(Number(p.salePrice))}` : '—'}</TableCell>
                        <TableCell className="text-right">{m === null ? '—' : `${m.toFixed(0)}%`}</TableCell>
                        <TableCell className={`text-right tabular-nums ${p.currentStock !== undefined && p.minStock != null && p.currentStock < Number(p.minStock) ? 'font-medium text-destructive' : ''}`}>
                          {p.currentStock === undefined ? '—' : Number.isInteger(p.currentStock) ? p.currentStock : p.currentStock.toFixed(3)}
                        </TableCell>
                        <TableCell>{p.isActive ? <Badge variant="success">Activo</Badge> : <Badge variant="destructive">Desactivado</Badge>}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" asChild>
                              <Link to={`/catalog/products/${p.id}`}>
                                <Eye />
                              </Link>
                            </Button>
                            {isAdmin && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                                  <Pencil />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => toggleActive(p)}>
                                  {p.isActive ? 'Desactivar' : 'Activar'}
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
                <span>
                  Página {page} de {pagination.totalPages || 1} · {pagination.total} productos
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          </DialogHeader>
          {error && <Alert variant="destructive">{error}</Alert>}
          <form className="grid gap-4" onSubmit={submit}>
            <Field label="Código de barras" htmlFor="barcode">
              <Input id="barcode" required value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} />
            </Field>
            {editing && (
              <p className="text-xs text-muted-foreground">
                Código interno: <span className="font-mono">{editing.internalCode}</span> (asignado automáticamente, no se puede cambiar)
              </p>
            )}
            <Field label="Nombre" htmlFor="name">
              <Input id="name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </Field>
            {referenceHint && !editing && <p className="-mt-2 text-xs text-muted-foreground">Nombre y marca autocompletados desde la base de referencia. Revisalos antes de guardar.</p>}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Categoría" htmlFor="categoryId" hint="(opcional)">
                {creatingCategory ? (
                  <div className="flex gap-2">
                    <Input
                      id="newCategoryName"
                      autoFocus
                      placeholder="Nombre de la categoría"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); void createCategory(); }
                        if (e.key === 'Escape') { setCreatingCategory(false); setNewCategoryName(''); }
                      }}
                    />
                    <Button type="button" size="sm" onClick={() => void createCategory()} disabled={savingCategory || !newCategoryName.trim()}>
                      {savingCategory ? <Spinner /> : 'Crear'}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => { setCreatingCategory(false); setNewCategoryName(''); }}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Select id="categoryId" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                      <option value="">Sin categoría</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                    {isAdmin && (
                      <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => setCreatingCategory(true)}>
                        <Plus /> Nueva
                      </Button>
                    )}
                  </div>
                )}
              </Field>
              <Field label="Unidad de venta" htmlFor="unit">
                <Input id="unit" required value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Unidad de compra" htmlFor="purchaseUnit" hint="(opcional · bulto, caja, pack)">
                <Input id="purchaseUnit" value={form.purchaseUnit} onChange={e => setForm({ ...form, purchaseUnit: e.target.value })} placeholder="bulto" />
              </Field>
              <Field
                label={`Unidades de venta por ${form.purchaseUnit.trim() || 'bulto'}`}
                htmlFor="unitsPerPurchase"
                hint="(1 = se compra y se vende en la misma unidad)"
              >
                <Input id="unitsPerPurchase" min="0.001" step="0.001" type="number" value={form.unitsPerPurchase} onChange={e => setForm({ ...form, unitsPerPurchase: e.target.value })} />
              </Field>
            </div>
            <Field label="Marca" htmlFor="brand" hint="(opcional)">
              <Input id="brand" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Costo" htmlFor="costPrice" hint="(opcional)">
                <Input id="costPrice" min="0" step="0.01" type="number" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} />
              </Field>
              <Field label="Precio de venta" htmlFor="salePrice" hint="(opcional)">
                <Input id="salePrice" min="0" step="0.01" type="number" value={form.salePrice} onChange={e => setForm({ ...form, salePrice: e.target.value })} />
              </Field>
              <Field label="IVA %" htmlFor="taxRate">
                <Select id="taxRate" value={form.taxRate} onChange={e => setForm({ ...form, taxRate: e.target.value })}>
                  {TAX_RATES.map(rate => <option key={rate} value={rate}>{rate}%</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Impuestos internos %" htmlFor="internalTaxRate" hint="(opcional · bebidas alcohólicas, cigarrillos)">
              <Input id="internalTaxRate" min="0" step="0.01" type="number" value={form.internalTaxRate} onChange={e => setForm({ ...form, internalTaxRate: e.target.value })} />
            </Field>
            <Field label="Stock mínimo" htmlFor="minStock" hint="(opcional · alerta de reposición cuando el stock total caiga por debajo)">
              <Input id="minStock" min="0" step="0.001" type="number" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })} />
            </Field>
            <div className="flex items-center gap-2">
              <Checkbox id="manejaVencimiento" checked={form.manejaVencimiento} onCheckedChange={checked => setForm({ ...form, manejaVencimiento: checked === true })} />
              <Label htmlFor="manejaVencimiento" className="font-normal">
                Maneja vencimiento
              </Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Spinner />} {editing ? 'Guardar cambios' : 'Crear producto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
