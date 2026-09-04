import { useEffect, useState, type FormEvent } from 'react';
import { ShoppingCartSimple, DownloadSimple, Eye, Package, PencilSimple, Plus, MagnifyingGlass, SlidersHorizontal, Trash, X } from '@phosphor-icons/react';
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

const EMPTY_FORM = { barcode: '', name: '', categoryId: '', unit: 'unidad', purchaseUnit: '', unitsPerPurchase: '1', brand: '', taxRate: '21', internalTaxRate: '0', minStock: '', manejaVencimiento: false, isWeighed: false };
// Alicuotas vigentes en Argentina; el backend valida contra la misma lista.
const TAX_RATES = ['0', '2.5', '5', '10.5', '21', '27'];
type FormState = typeof EMPTY_FORM;

export function ProductsPage() {
  const { session, can } = useAuth();
  const puedeEditar = can('productos.editar');
  const puedeCrear = can('productos.crear');
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
  const [importingCatalog, setImportingCatalog] = useState(false);
  const [confirmingCatalog, setConfirmingCatalog] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearingCatalog, setClearingCatalog] = useState(false);
  const [catalogMessage, setCatalogMessage] = useState('');
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
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Lo que está filtrado se muestra como chips: se ve de un vistazo qué está
  // acotando el listado y se saca de a uno sin abrir el panel.
  const SORTS: Record<string, string> = {
    newest: 'Más nuevos', updated: 'Actualizados recién', price_desc: 'Mayor precio', price_asc: 'Menor precio',
  };
  const activeFilters: { key: string; label: string; clear: () => void }[] = [
    categoryId && { key: 'cat', label: categoryId === 'none' ? 'Sin categoría' : categories.find(c => c.id === categoryId)?.name ?? 'Categoría', clear: () => setCategoryId('') },
    brand && { key: 'brand', label: brand, clear: () => setBrand('') },
    status !== 'active' && { key: 'status', label: status === 'inactive' ? 'Desactivados' : 'Todos los estados', clear: () => setStatus('active') },
    priced && { key: 'priced', label: priced === 'yes' ? 'Con precio' : 'Sin precio', clear: () => setPriced('') },
    stock && { key: 'stock', label: stock === 'low' ? 'Bajo mínimo' : 'Sin stock', clear: () => setStock('') },
    sort !== 'name' && { key: 'sort', label: SORTS[sort] ?? sort, clear: () => setSort('name') },
    priceListId && { key: 'list', label: `Precios de ${priceLists.find(l => l.id === priceListId)?.name ?? 'otra lista'}`, clear: () => setPriceListId('') },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

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

  async function importCatalog() {
    setConfirmingCatalog(false);
    setImportingCatalog(true);
    setCatalogMessage('');
    setError('');
    try {
      const result = await api<{ created: number; skipped: number }>('/products/import-reference', { method: 'POST' }, token);
      setCatalogMessage(`Catálogo cargado: ${result.created} productos nuevos, ${result.skipped} ya existían.`);
      await Promise.all([load(), loadBrands()]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setImportingCatalog(false);
    }
  }

  async function clearCatalog() {
    setConfirmingClear(false);
    setClearingCatalog(true);
    setCatalogMessage('');
    setError('');
    try {
      const result = await api<{ deleted: number; kept: number }>('/products/clear-reference-catalog', { method: 'POST' }, token);
      setCatalogMessage(
        result.deleted === 0 && result.kept === 0
          ? 'No había productos del catálogo importado para borrar.'
          : `Se borraron ${result.deleted} productos del catálogo importado.${result.kept ? ` ${result.kept} se conservaron porque ya tuvieron movimientos.` : ''}`,
      );
      await Promise.all([load(), loadBrands()]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setClearingCatalog(false);
    }
  }

  useEffect(() => {
    if (editing || !open) return;
    const barcode = form.barcode.trim();
    setReferenceHint(false);
    if (!barcode) return;
    const timeout = setTimeout(() => {
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
    return () => clearTimeout(timeout);
  }, [form.barcode, editing, open, token]); // eslint-disable-line react-hooks/exhaustive-deps

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
      taxRate: p.taxRate,
      internalTaxRate: p.internalTaxRate ?? '0',
      minStock: p.minStock ?? '',
      manejaVencimiento: p.manejaVencimiento,
      isWeighed: p.isWeighed,
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
      const body = { ...form, categoryId: form.categoryId || null, minStock: form.minStock || null };
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
            {puedeEditar && (
              <Button variant="outline" onClick={() => setConfirmingCatalog(true)} disabled={importingCatalog}>
                {importingCatalog ? <Spinner /> : <Package />} Cargar catálogo regional
              </Button>
            )}
            <Button variant="outline" onClick={exportExcel} disabled={exporting || loading}>
              {exporting ? <Spinner /> : <DownloadSimple />} Exportar a Excel
            </Button>
            {puedeCrear && (
              <Button onClick={openCreate}>
                <Plus /> Nuevo producto
              </Button>
            )}
          </>
        }
      />
      {catalogMessage && <Alert>{catalogMessage}</Alert>}
      {error && !open && <Alert variant="destructive">{error}</Alert>}
      {/* Buscar está siempre a mano; el resto de los filtros vive en un panel y
          lo que queda activo vuelve como chips que se sacan de a uno. Siete
          selectores en fila era ruido: la mayoría de las veces se busca y nada
          más. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1 sm:max-w-md">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-placeholder" />
          <Input
            aria-label="Buscar productos"
            className="pl-9"
            placeholder="Nombre, código de barras o interno"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal /> Filtros
          {activeFilters.length > 0 && (
            <span className="ml-0.5 rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-foreground">
              {activeFilters.length}
            </span>
          )}
        </Button>
        {activeFilters.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={f.clear}
            className="inline-flex items-center gap-1.5 rounded-full border border-accent-border bg-accent py-1 pl-3 pr-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-80"
          >
            {f.label}
            <X className="size-3.5 opacity-70" />
          </button>
        ))}
        {activeFilters.length > 1 && (
          <Button variant="ghost" size="sm" onClick={() => activeFilters.forEach(f => f.clear())}>
            Limpiar
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <PageSpinner />
          ) : items.length === 0 ? (
            <EmptyState icon={ShoppingCartSimple} title={status === 'inactive' ? 'Sin productos desactivados' : 'Sin productos'} description={search || categoryId || brand || priced || stock ? 'No hay productos que coincidan con los filtros.' : 'Creá el primer producto para empezar a manejar stock.'} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  {/* Seis columnas, no diez. La categoría y el margen viven en
                      el detalle del producto: en el listado eran ruido. El
                      código de barras va debajo del nombre, no en su propia
                      columna. */}
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(p => {
                    const bajoMinimo = p.currentStock !== undefined && p.minStock != null && p.currentStock < Number(p.minStock);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium leading-snug">{p.name}</div>
                          <div className="mt-0.5 font-mono text-xs text-placeholder">
                            {p.barcode}
                            {p.internalCode && <> · #{p.internalCode}</>}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{p.brand ?? '—'}</TableCell>
                        <TableCell className="text-right">
                          {p.salePrice
                            ? <span className="font-semibold tabular">{money(Number(p.salePrice))}</span>
                            : <Badge variant="warning">Sin precio</Badge>}
                        </TableCell>
                        <TableCell className={`text-right tabular ${bajoMinimo ? 'font-semibold text-destructive' : ''}`}>
                          {p.currentStock === undefined ? '—' : Number.isInteger(p.currentStock) ? p.currentStock : p.currentStock.toFixed(3)}
                        </TableCell>
                        <TableCell>
                          {!p.isActive
                            ? <Badge variant="destructive">Desactivado</Badge>
                            : bajoMinimo
                              ? <Badge variant="destructive">Bajo mínimo</Badge>
                              : <Badge variant="success">Activo</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" asChild>
                              <Link to={`/catalog/products/${p.id}`}>
                                <Eye />
                              </Link>
                            </Button>
                            {puedeEditar && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                                  <PencilSimple />
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
                    {puedeEditar && (
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
            <div className="grid grid-cols-2 gap-4">
              <Field label="IVA %" htmlFor="taxRate">
                <Select id="taxRate" value={form.taxRate} onChange={e => setForm({ ...form, taxRate: e.target.value })}>
                  {TAX_RATES.map(rate => <option key={rate} value={rate}>{rate}%</option>)}
                </Select>
              </Field>
              <Field label="Impuestos internos %" htmlFor="internalTaxRate" hint="(opcional · bebidas alcohólicas, cigarrillos)">
                <Input id="internalTaxRate" min="0" step="0.01" type="number" value={form.internalTaxRate} onChange={e => setForm({ ...form, internalTaxRate: e.target.value })} />
              </Field>
            </div>
            <p className="-mt-1 text-xs text-muted-foreground">El precio de costo y el de venta se cargan desde el módulo de Precios.</p>
            <Field label="Stock mínimo" htmlFor="minStock" hint="(opcional · alerta de reposición cuando el stock total caiga por debajo)">
              <Input id="minStock" min="0" step="0.001" type="number" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })} />
            </Field>
            <div className="flex items-center gap-2">
              <Checkbox id="manejaVencimiento" checked={form.manejaVencimiento} onCheckedChange={checked => setForm({ ...form, manejaVencimiento: checked === true })} />
              <Label htmlFor="manejaVencimiento" className="font-normal">
                Maneja vencimiento
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="isWeighed" checked={form.isWeighed} onCheckedChange={checked => setForm({ ...form, isWeighed: checked === true })} />
              <Label htmlFor="isWeighed" className="font-normal">
                Pesable (se vende por peso, con balanza)
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

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filtros</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
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

            {/* Con más de una lista se puede mirar el catálogo con los precios
                de cualquiera de ellas, incluidas las que se calculan solas. */}
            {priceLists.length > 1 && (
              <Field label="Ver precios de" htmlFor="filter-pricelist" className="sm:col-span-2">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => activeFilters.forEach(f => f.clear())} disabled={activeFilters.length === 0}>
              Limpiar todo
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>Ver resultados</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmingCatalog} onOpenChange={setConfirmingCatalog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cargar catálogo regional</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Carga los códigos de barra del catálogo de referencia de la región como productos, para no tener que cargarlos uno por uno. No carga stock ni precios: los precios se ponen después desde el módulo de Precios. Los códigos que ya tengas se saltean.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmingCatalog(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={importCatalog} disabled={importingCatalog}>
              {importingCatalog && <Spinner />} Cargar catálogo
            </Button>
          </DialogFooter>
          <div className="mt-1 border-t border-border pt-3 text-sm text-muted-foreground">
            ¿Ya lo cargaste y querés empezar de nuevo?{' '}
            <button
              type="button"
              className="font-medium text-destructive hover:underline"
              onClick={() => { setConfirmingCatalog(false); setConfirmingClear(true); }}
            >
              Vaciar catálogo importado
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmingClear} onOpenChange={setConfirmingClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vaciar catálogo importado</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Borra los productos que se crearon con «Cargar catálogo regional» y que nunca tuvieron movimientos (stock, ventas o compras). Los que ya se usaron quedan como están. Esto no se puede deshacer.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmingClear(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={clearCatalog} disabled={clearingCatalog}>
              {clearingCatalog ? <Spinner /> : <Trash />} Vaciar catálogo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
