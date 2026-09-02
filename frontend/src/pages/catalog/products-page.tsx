import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Boxes, Download, Eye, PackagePlus, Pencil, Plus, Search, Upload } from 'lucide-react';
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
import { api, downloadFile, errorMessage, uploadFile, type Category, type Pagination, type Product } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const EMPTY_FORM = { barcode: '', name: '', categoryId: '', unit: 'unidad', brand: '', costPrice: '', salePrice: '', taxRate: '21', minStock: '', manejaVencimiento: false };
type FormState = typeof EMPTY_FORM;
const NEW_CATEGORY = '__new__';

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
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, totalPages: 0, pageSize: 20, page: 1 });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [saving, setSaving] = useState(false);
  const [referenceHint, setReferenceHint] = useState(false);
  const [importingCatalog, setImportingCatalog] = useState(false);
  const [confirmingCatalog, setConfirmingCatalog] = useState(false);
  const [exportingPrices, setExportingPrices] = useState(false);
  const [importingPrices, setImportingPrices] = useState(false);
  const [toolsMessage, setToolsMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCategories = () => api<Category[]>('/categories', {}, token).then(setCategories).catch(e => setError(errorMessage(e)));

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '20', status: showInactive ? 'inactive' : 'active' });
    if (search) params.set('search', search);
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

  useEffect(() => { void loadCategories(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [token, search, showInactive, page]); // eslint-disable-line react-hooks/exhaustive-deps

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
      brand: p.brand ?? '',
      costPrice: p.costPrice ?? '',
      salePrice: p.salePrice ?? '',
      taxRate: p.taxRate,
      minStock: p.minStock ?? '',
      manejaVencimiento: p.manejaVencimiento,
    });
    setNewCategoryName('');
    setError('');
    setOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      let categoryId = form.categoryId;
      if (categoryId === NEW_CATEGORY) {
        if (!newCategoryName.trim()) throw new Error('Escribí el nombre de la nueva categoría');
        const created = await api<Category>('/categories', { method: 'POST', body: JSON.stringify({ name: newCategoryName.trim() }) }, token);
        categoryId = created.id;
        setCategories(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      const body = { ...form, categoryId: categoryId || null, costPrice: form.costPrice || null, salePrice: form.salePrice || null, minStock: form.minStock || null };
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

  async function toggleActive(p: Product) {
    setError('');
    try {
      await api(`/products/${p.id}`, { method: 'PUT', body: JSON.stringify({ isActive: !p.isActive }) }, token);
      await load();
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
      const result = await api<{ created: number; skipped: number }>('/products/import-reference', { method: 'POST' }, token);
      setToolsMessage(`Catálogo cargado: ${result.created} productos nuevos, ${result.skipped} ya existían.`);
      setPage(1);
      await load();
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
      const result = await uploadFile<{ updated: number; notFound: string[]; invalid: string[]; matchedColumns: { barcode: string | null; costPrice: string | null; salePrice: string | null } }>('/products/import-prices', token, file);
      const cols = [result.matchedColumns.barcode && `código="${result.matchedColumns.barcode}"`, result.matchedColumns.costPrice && `costo="${result.matchedColumns.costPrice}"`, result.matchedColumns.salePrice && `venta="${result.matchedColumns.salePrice}"`].filter(Boolean).join(', ');
      setToolsMessage(`Precios actualizados: ${result.updated} (columnas detectadas: ${cols}).${result.notFound.length ? ` No encontrados: ${result.notFound.length}.` : ''}${result.invalid.length ? ` Valores inválidos: ${result.invalid.length}.` : ''}`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setImportingPrices(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <>
      <PageHeader
        title="Productos"
        description="Catálogo de productos del tenant."
        actions={
          <>
            {isAdmin && (
              <>
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => e.target.files?.[0] && importPrices(e.target.files[0])} />
                <Button variant="outline" onClick={() => setConfirmingCatalog(true)} disabled={importingCatalog}>
                  {importingCatalog ? <Spinner /> : <PackagePlus />} Cargar catálogo regional
                </Button>
                <Button variant="outline" onClick={exportPrices} disabled={exportingPrices}>
                  {exportingPrices ? <Spinner /> : <Download />} Exportar precios
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importingPrices}>
                  {importingPrices ? <Spinner /> : <Upload />} Importar precios
                </Button>
              </>
            )}
            <Button onClick={openCreate}>
              <Plus /> Nuevo producto
            </Button>
          </>
        }
      />
      {toolsMessage && <Alert>{toolsMessage}</Alert>}
      {error && !open && <Alert variant="destructive">{error}</Alert>}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4">
          <Field label="Buscar" htmlFor="filter-search" className="max-w-sm">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="filter-search" className="pl-8" placeholder="Nombre, código de barras o interno" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
            </div>
          </Field>
          <div className="flex items-center gap-2 pb-2">
            <Checkbox
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={checked => {
                setShowInactive(checked === true);
                setPage(1);
              }}
            />
            <Label htmlFor="show-inactive" className="font-normal">
              Mostrar desactivados
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <PageSpinner />
          ) : items.length === 0 ? (
            <EmptyState icon={Boxes} title={showInactive ? 'Sin productos desactivados' : 'Sin productos'} description={search ? 'No hay productos que coincidan con la búsqueda.' : 'Creá el primer producto para empezar a manejar stock.'} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Cód. barras</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
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
                        <TableCell>{p.categoryName ?? '—'}</TableCell>
                        <TableCell className="text-right">{p.salePrice ? `$${Number(p.salePrice).toFixed(2)}` : '—'}</TableCell>
                        <TableCell className="text-right">{m === null ? '—' : `${m.toFixed(0)}%`}</TableCell>
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
                <Select id="categoryId" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">Sin categoría</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value={NEW_CATEGORY}>+ Nueva categoría...</option>
                </Select>
              </Field>
              <Field label="Unidad" htmlFor="unit">
                <Input id="unit" required value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
              </Field>
            </div>
            {form.categoryId === NEW_CATEGORY && (
              <Field label="Nombre de la nueva categoría" htmlFor="newCategoryName">
                <Input id="newCategoryName" required value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
              </Field>
            )}
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
                <Input id="taxRate" required min="0" step="0.01" type="number" value={form.taxRate} onChange={e => setForm({ ...form, taxRate: e.target.value })} />
              </Field>
            </div>
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
    </>
  );
}
