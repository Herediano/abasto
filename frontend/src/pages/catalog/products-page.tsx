import { useEffect, useState } from 'react';
import { ShoppingCartSimple, Package, PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { ListFilters } from '@/components/list-filters';
import { ModuleScreen, SummaryLine } from '@/components/module-screen';
import { ExportMenu } from '@/components/export-menu';
import { ProductFormDialog } from '@/components/product-form-dialog';
import { PageSpinner, Spinner } from '@/components/spinner';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, type Category, type Pagination, type PriceList, type Product } from '@/lib/api';
import { quantity } from '@/lib/format';
import { money } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';

// Alícuotas vigentes en Argentina; el backend valida contra la misma lista.
const TAX_RATES = ['0', '2.5', '5', '10.5', '21', '27'];

export function ProductsPage() {
  const { session, can } = useAuth();
  const navigate = useNavigate();
  const puedeEditar = can('productos.editar');
  const puedeCrear = can('productos.crear');
  const puedeEliminar = can('productos.eliminar');
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
  const [importingCatalog, setImportingCatalog] = useState(false);
  const [confirmingCatalog, setConfirmingCatalog] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearingCatalog, setClearingCatalog] = useState(false);
  const [catalogMessage, setCatalogMessage] = useState('');
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [priceListId, setPriceListId] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, totalPages: 0, pageSize: 20, page: 1 });
  // Edición: el lápiz de la fila abre este diálogo directo (atajo); las demás
  // acciones de UN producto (activar, eliminar) viven en su pantalla de detalle.
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  // Selección para acciones en lote — la única forma de actuar desde la lista.
  // Se limpia sola cuando cambia el filtro o la página.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Cifra de cabecera: cuántos productos están bajo su mínimo (lo mismo que
  // muestra Reposición). Una sola llamada al montar.
  const [bajoMinimoTotal, setBajoMinimoTotal] = useState<number | null>(null);
  useEffect(() => {
    api<unknown[]>('/products/low-stock', {}, token)
      .then(r => setBajoMinimoTotal(Array.isArray(r) ? r.length : null))
      .catch(() => {});
  }, [token]);

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
  useEffect(() => { setSelected(new Set()); }, [search, categoryId, brand, status, priced, stock, sort, priceListId, page]);
  useEffect(() => { void load(); }, [token, search, categoryId, brand, status, priced, stock, sort, priceListId, page]); // eslint-disable-line react-hooks/exhaustive-deps


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

  const openCreate = () => { setEditing(null); setError(''); setDialogOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setError(''); setDialogOpen(true); };

  // --- Selección + acciones en lote ------------------------------------------
  const pageIds = items.map(p => p.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const toggleOne = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleAllOnPage = () =>
    setSelected(prev => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach(id => next.delete(id));
      else pageIds.forEach(id => next.add(id));
      return next;
    });

  async function bulkSet(set: Record<string, unknown>) {
    setBulkBusy(true);
    setError('');
    setCatalogMessage('');
    try {
      const { updated } = await api<{ updated: number }>('/products/bulk', { method: 'PATCH', body: JSON.stringify({ ids: [...selected], set }) }, token);
      setCatalogMessage(`${updated} ${updated === 1 ? 'producto actualizado' : 'productos actualizados'}.`);
      setSelected(new Set());
      await Promise.all([load(), loadBrands()]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkDelete() {
    setDeleting(true);
    setError('');
    setCatalogMessage('');
    try {
      const r = await api<{ deleted: number; deactivated: number }>('/products/bulk-delete', { method: 'POST', body: JSON.stringify({ ids: [...selected] }) }, token);
      setCatalogMessage(
        [
          r.deleted && `${r.deleted} ${r.deleted === 1 ? 'producto borrado' : 'productos borrados'}`,
          r.deactivated && `${r.deactivated} ${r.deactivated === 1 ? 'desactivado' : 'desactivados'} (ya tenían movimientos)`,
        ].filter(Boolean).join(' · ') || 'No había nada para borrar.',
      );
      setSelected(new Set());
      setConfirmDelete(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const resumen = !loading && pagination.total > 0 && (
    <SummaryLine
      items={[
        { label: 'Productos', value: String(pagination.total) },
        ...(bajoMinimoTotal ? [{ label: 'Bajo mínimo', value: String(bajoMinimoTotal), tone: 'warn' as const }] : []),
      ]}
    />
  );

  return (
    <>
      <ModuleScreen
        title="Productos"
        actions={
          <>
            {puedeEditar && (
              <Button variant="outline" onClick={() => setConfirmingCatalog(true)} disabled={importingCatalog}>
                {importingCatalog ? <Spinner /> : <Package />} Cargar catálogo regional
              </Button>
            )}
            <ExportMenu path="/products" params={filterParams()} filename="productos" />
            {puedeCrear && (
              <Button onClick={openCreate}>
                <Plus /> Nuevo producto
              </Button>
            )}
          </>
        }
        summary={resumen || undefined}
      >
      {catalogMessage && <Alert>{catalogMessage}</Alert>}
      {error && !dialogOpen && <Alert variant="destructive">{error}</Alert>}
      <ListFilters
        search={searchInput}
        onSearch={setSearchInput}
        searchPlaceholder="Nombre, código de barras o interno"
        searchLabel="Buscar productos"
        activeFilters={activeFilters}
      >
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
      </ListFilters>

          {!loading && selected.size > 0 && (puedeEditar || puedeEliminar) && (
            <div className="sticky top-[57px] z-10 flex flex-wrap items-center gap-2 rounded-md border border-accent-border bg-accent/60 px-3 py-2 text-chico backdrop-blur">
              <span className="font-semibold text-accent-foreground">
                {selected.size} {selected.size === 1 ? 'seleccionado' : 'seleccionados'}
              </span>
              <button type="button" className="text-muted-foreground hover:text-foreground hover:underline" onClick={() => setSelected(new Set())}>
                Limpiar
              </button>
              <span className="mx-1 h-4 w-px bg-border" />
              {puedeEditar && (
                <>
                  <Select
                    aria-label="Cambiar categoría"
                    className="h-8 w-auto min-w-40 text-chico"
                    value=""
                    disabled={bulkBusy}
                    onChange={e => { if (e.target.value) void bulkSet({ categoryId: e.target.value === '__none__' ? null : e.target.value }); }}
                  >
                    <option value="">Categoría…</option>
                    <option value="__none__">Sin categoría</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                  <Select
                    aria-label="Cambiar IVA"
                    className="h-8 w-auto min-w-24 text-chico"
                    value=""
                    disabled={bulkBusy}
                    onChange={e => { if (e.target.value) void bulkSet({ taxRate: e.target.value }); }}
                  >
                    <option value="">IVA…</option>
                    {TAX_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                  </Select>
                  <Button variant="outline" size="sm" disabled={bulkBusy} onClick={() => void bulkSet({ isActive: true })}>Activar</Button>
                  <Button variant="outline" size="sm" disabled={bulkBusy} onClick={() => void bulkSet({ isActive: false })}>Desactivar</Button>
                </>
              )}
              {puedeEliminar && (
                <Button variant="destructive" size="sm" disabled={bulkBusy} onClick={() => setConfirmDelete(true)}>
                  <Trash /> Eliminar
                </Button>
              )}
              {bulkBusy && <Spinner />}
            </div>
          )}

          {loading ? (
            <PageSpinner />
          ) : items.length === 0 ? (
            <EmptyState
              icon={ShoppingCartSimple}
              title={status === 'inactive' ? 'Sin productos desactivados' : (search || categoryId || brand || priced || stock ? 'Sin resultados' : 'Todavía no hay productos')}
              description={search || categoryId || brand || priced || stock ? 'No hay productos que coincidan con los filtros.' : 'Creá el primer producto para empezar a manejar stock.'}
              action={
                puedeCrear && !(search || categoryId || brand || priced || stock) && status !== 'inactive'
                  ? <Button onClick={openCreate}><Plus /> Nuevo producto</Button>
                  : undefined
              }
            />
          ) : (
            <div>
              <Table>
                <TableHeader>
                  {/* Seis columnas, no diez. La categoría y el margen viven en
                      el detalle del producto: en el listado eran ruido. El
                      código de barras va debajo del nombre, no en su propia
                      columna. */}
                  <TableRow>
                    {(puedeEditar || puedeEliminar) && (
                      <TableHead className="w-9">
                        <Checkbox
                          aria-label="Seleccionar todos"
                          checked={allOnPageSelected}
                          onCheckedChange={toggleAllOnPage}
                        />
                      </TableHead>
                    )}
                    <TableHead>Producto</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Estado</TableHead>
                    {puedeEditar && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(p => {
                    const bajoMinimo = p.currentStock !== undefined && p.minStock != null && p.currentStock < Number(p.minStock);
                    const abrir = () => navigate(`/catalog/products/${p.id}`);
                    return (
                      <TableRow
                        key={p.id}
                        data-state={selected.has(p.id) ? 'selected' : undefined}
                        className="cursor-pointer"
                        role="link"
                        tabIndex={0}
                        onClick={abrir}
                        onKeyDown={e => { if (e.key === 'Enter') abrir(); }}
                      >
                        {(puedeEditar || puedeEliminar) && (
                          <TableCell className="w-9" onClick={e => e.stopPropagation()}>
                            <Checkbox
                              aria-label={`Seleccionar ${p.name}`}
                              checked={selected.has(p.id)}
                              onCheckedChange={() => toggleOne(p.id)}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="font-medium leading-snug">{p.name}</div>
                          <div className="mt-0.5 font-mono text-chico text-placeholder">
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
                          {p.currentStock === undefined ? '—' : quantity(p.currentStock)}
                        </TableCell>
                        <TableCell>
                          {!p.isActive
                            ? <Badge variant="destructive">Desactivado</Badge>
                            : bajoMinimo
                              ? <Badge variant="destructive">Bajo mínimo</Badge>
                              : <Badge variant="success">Activo</Badge>}
                        </TableCell>
                        {puedeEditar && (
                          <TableCell className="w-10 text-right" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" aria-label={`Editar ${p.name}`} onClick={() => openEdit(p)}>
                              <PencilSimple />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between border-t border-border pt-3 text-chico text-muted-foreground">
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
            </div>
          )}
      </ModuleScreen>

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editing}
        onSaved={() => { void load(); void loadCategories(); void loadBrands(); }}
      />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar {selected.size} {selected.size === 1 ? 'producto' : 'productos'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Los que nunca tuvieron movimientos se borran; los que ya se usaron (stock, ventas o compras) se desactivan —sus registros son parte de la historia—. Esto no se puede deshacer.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
            <Button type="button" variant="destructive" onClick={bulkDelete} disabled={deleting}>
              {deleting ? <Spinner /> : <Trash />} Eliminar
            </Button>
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
