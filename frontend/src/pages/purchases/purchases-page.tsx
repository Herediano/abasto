import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MagnifyingGlass, Plus, ShoppingCartSimple, Trash } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProductSearchDialog } from '@/components/product-search-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { ExportMenu } from '@/components/export-menu';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { Label } from '@/components/ui/label';
import { ListFilters, type ActiveFilter } from '@/components/list-filters';
import { ModuleScreen, ModuleSection } from '@/components/module-screen';
import { Select } from '@/components/ui/select';
import { PageSpinner, Spinner } from '@/components/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { api, errorMessage, type Lot, type Pagination, type Product, type PurchaseInvoice, type PurchaseOrder, type Supplier } from '@/lib/api';
import { fecha, inputDate, money } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';

/**
 * Compras: cargar, corregir y anular facturas de proveedor. Vivió mucho
 * tiempo escondida dentro de Stock → "Ingreso", detrás del permiso
 * `stock.mover` aunque las acciones de acá siempre usaron sus propios
 * permisos (`compras.*`) — comprar no es lo mismo que mover stock a mano, y
 * ahora tiene su propio módulo y su propio permiso de entrada.
 */

const STATUS_LABEL: Record<string, { label: string; variant: 'secondary' | 'success' | 'destructive' }> = {
  draft: { label: 'Borrador', variant: 'secondary' },
  received: { label: 'Recibida, factura pendiente', variant: 'secondary' },
  confirmed: { label: 'Confirmada', variant: 'success' },
  corrected: { label: 'Corregida', variant: 'secondary' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
};

// unitFactor sólo viaja al corregir una factura ya confirmada: manda el factor
// con el que se confirmó, no el actual del producto (que pudo cambiar).
type Line = { barcode: string; productName: string; productLotId: string; quantity: string; unitCost: string; discountPercent: string; taxRate: string; byPackage: boolean; packSize: string; unitFactor?: string };
const EMPTY_LINE: Line = { barcode: '', productName: '', productLotId: '', quantity: '', unitCost: '', discountPercent: '0', taxRate: '21', byPackage: false, packSize: '' };
const EMPTY_HEADER = { supplierId: '', invoiceType: 'A', pointOfSale: '', invoiceNumber: '', remitoNumber: '', dueDate: '', pendingInvoice: false, issueDate: inputDate(), notes: '' };

type OtherTax = { label: string; amount: string };

type Draft = { header: typeof EMPTY_HEADER; line: Line; lines: Line[]; otherTaxes: OtherTax[]; editingInvoice: PurchaseInvoice | null; correctionReason: string };

function draftKey(tenantId: string) {
  return `abasto-purchase-draft:${tenantId}`;
}

function readDraft(tenantId: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(tenantId));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

const netUnitCost = (l: { unitCost: string | number; discountPercent?: string | number }) =>
  Number(l.unitCost) * (1 - Number(l.discountPercent ?? 0) / 100);
const lineTotal = (l: { quantity: string | number; unitCost: string | number; discountPercent?: string | number; taxRate: string | number }) =>
  Number(l.quantity) * netUnitCost(l) * (1 + Number(l.taxRate) / 100);

export function PurchasesPage() {
  const { session, can } = useAuth();
  const puedeCrear = can('compras.crear');
  const puedeCorregir = can('compras.corregir');
  const puedeAnular = can('compras.anular');
  const token = session!.accessToken;
  const tenantId = session!.tenant.id;
  const [searchParams, setSearchParams] = useSearchParams();
  const storedDraft = useMemo(() => readDraft(tenantId), [tenantId]);

  const [view, setView] = useState<'facturas' | 'nueva' | 'pedidos'>('facturas');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState('');

  // --- pedidos a proveedor (orden de compra liviana, ver Reposición) ---
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [orderActionId, setOrderActionId] = useState<string | null>(null);

  const loadOrders = () => {
    setOrdersLoading(true);
    return api<PurchaseOrder[]>('/purchase-orders', {}, token)
      .then(setOrders)
      .catch(e => setOrdersError(errorMessage(e)))
      .finally(() => setOrdersLoading(false));
  };
  useEffect(() => { if (view === 'pedidos') void loadOrders(); }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  async function receiveOrder(id: string) {
    setOrderActionId(id);
    try { await api(`/purchase-orders/${id}/receive`, { method: 'POST' }, token); await loadOrders(); }
    catch (err) { setOrdersError(errorMessage(err)); }
    finally { setOrderActionId(null); }
  }

  async function cancelOrder(id: string) {
    setOrderActionId(id);
    try { await api(`/purchase-orders/${id}/cancel`, { method: 'POST' }, token); await loadOrders(); }
    catch (err) { setOrdersError(errorMessage(err)); }
    finally { setOrderActionId(null); }
  }

  function loadInvoiceFromOrder(order: PurchaseOrder) {
    setEditingInvoice(null);
    setCorrectionReason('');
    setHeader({ ...EMPTY_HEADER, supplierId: order.supplierId });
    setLines([]);
    setOtherTaxes([]);
    setError('');
    setView('nueva');
  }

  // --- listado ---
  const [items, setItems] = useState<PurchaseInvoice[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filtros, setFiltros] = useState({ supplierId: searchParams.get('supplierId') ?? '', status: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState<PurchaseInvoice | null>(null);
  const [cancellingInvoice, setCancellingInvoice] = useState<PurchaseInvoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // --- completar factura: una recibida por remito, ahora con el papel ---
  const [completingInvoice, setCompletingInvoice] = useState<PurchaseInvoice | null>(null);
  const [completeForm, setCompleteForm] = useState({ invoiceType: 'A', pointOfSale: '', invoiceNumber: '', dueDate: '' });
  const [completeError, setCompleteError] = useState('');
  const [completing, setCompleting] = useState(false);

  // --- formulario de alta / corrección ---
  const [product, setProduct] = useState<Product | null>(null);
  const [lookupPending, setLookupPending] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<PurchaseInvoice | null>(storedDraft?.editingInvoice ?? null);
  const [correctionReason, setCorrectionReason] = useState(storedDraft?.correctionReason ?? '');
  const [saving, setSaving] = useState(false);
  const [header, setHeader] = useState(storedDraft?.header ?? EMPTY_HEADER);
  const [line, setLine] = useState<Line>(storedDraft?.line ?? EMPTY_LINE);
  const [lines, setLines] = useState<Line[]>(storedDraft?.lines ?? []);
  const [otherTaxes, setOtherTaxes] = useState<OtherTax[]>(storedDraft?.otherTaxes ?? []);
  const [newLot, setNewLot] = useState({ expirationDate: '', receivedAt: '' });
  const [addingLine, setAddingLine] = useState(false);
  const [myWarehouseId, setMyWarehouseId] = useState<string | null>(session!.user.warehouseId ?? null);
  const [newProduct, setNewProduct] = useState({ name: '', unit: 'unidad', manejaVencimiento: false });
  const [newProductHint, setNewProductHint] = useState(false);
  const [buscarOpen, setBuscarOpen] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);

  useEffect(() => {
    localStorage.setItem(draftKey(tenantId), JSON.stringify({ header, line, lines, otherTaxes, editingInvoice, correctionReason }));
  }, [tenantId, header, line, lines, otherTaxes, editingInvoice, correctionReason]);

  const subtotal = lines.reduce((sum, l) => sum + Number(l.quantity) * netUnitCost(l), 0);
  const tax = lines.reduce((sum, l) => sum + (Number(l.quantity) * netUnitCost(l) * Number(l.taxRate)) / 100, 0);
  const otherTaxesTotal = otherTaxes.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  function addOtherTax() {
    setOtherTaxes([...otherTaxes, { label: '', amount: '' }]);
  }
  function updateOtherTax(index: number, patch: Partial<OtherTax>) {
    setOtherTaxes(otherTaxes.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }
  function removeOtherTax(index: number) {
    setOtherTaxes(otherTaxes.filter((_, i) => i !== index));
  }

  useEffect(() => {
    api<Supplier[]>('/suppliers', {}, token).then(setSuppliers).catch(e => setError(errorMessage(e)));
  }, [token]);

  // Keep the Proveedor combobox in sync with React state: a native <select> shows its first
  // <option> as selected even while `header.supplierId` is still empty, so an untouched form
  // would submit an empty supplierId. Default to the first supplier whenever the current value
  // isn't a valid one (initial load and after every EMPTY_HEADER reset).
  useEffect(() => {
    if (!suppliers.length) return;
    setHeader(h => (suppliers.some(s => s.id === h.supplierId) ? h : { ...h, supplierId: suppliers[0].id }));
  }, [suppliers, header.supplierId]);

  // F3 abre el buscador, igual que en la caja: es el mismo gesto en todo el
  // sistema cuando hay que encontrar un producto sin tener el código.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (view === 'nueva' && e.key === 'F3') { e.preventDefault(); setBuscarOpen(true); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view]);

  useEffect(() => {
    const barcode = line.barcode.trim();
    if (!barcode) {
      setProduct(null);
      return;
    }
    setLookupPending(true);
    const timeout = setTimeout(() => {
      api<{ items: Product[] }>(`/products?barcode=${encodeURIComponent(barcode)}`, {}, token)
        .then(r => {
          const found = r.items[0] ?? null;
          setProduct(found);
          // Si lo que se escaneó es el código del bulto cerrado, se carga por
          // bulto automáticamente (el backend hace lo mismo al confirmar).
          const esBulto = !!found?.packBarcode && found.packBarcode === barcode;
          if (found) setLine(l => (l.barcode.trim() === barcode ? { ...l, taxRate: found.taxRate, packSize: found.unitsPerPurchase ?? '1', byPackage: esBulto } : l));
        })
        .catch(() => setProduct(null))
        .finally(() => setLookupPending(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [line.barcode, token]);

  useEffect(() => {
    setLine(l => ({ ...l, productLotId: '' }));
    setNewLot({ expirationDate: '', receivedAt: '' });
    setNewProduct({ name: '', unit: 'unidad', manejaVencimiento: false });
    setNewProductHint(false);
  }, [product?.id]);

  useEffect(() => {
    const barcode = line.barcode.trim();
    if (lookupPending || product || !barcode) return;
    const timeout = setTimeout(() => {
      api<{ name: string; brand: string | null }>(`/product-reference/${encodeURIComponent(barcode)}`, {}, token)
        .then(ref => {
          setNewProduct(p => (p.name ? p : { ...p, name: ref.name }));
          setNewProductHint(true);
        })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timeout);
  }, [line.barcode, lookupPending, product, token]);

  async function createProductInline() {
    const barcode = line.barcode.trim();
    if (!newProduct.name.trim() || !newProduct.unit.trim()) {
      setError('Completá nombre y unidad para crear el producto');
      return;
    }
    setCreatingProduct(true);
    setError('');
    try {
      const created = await api<Product>('/products', { method: 'POST', body: JSON.stringify({ barcode, name: newProduct.name.trim(), unit: newProduct.unit.trim(), manejaVencimiento: newProduct.manejaVencimiento }) }, token);
      setProduct(created);
      setLine(l => ({ ...l, taxRate: created.taxRate }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCreatingProduct(false);
    }
  }

  async function addLine() {
    const current = product;
    if (!current || Number(line.quantity) <= 0 || Number(line.unitCost) < 0) {
      setError('Buscá un producto válido y completá cantidad y precio');
      return;
    }
    let productLotId = line.productLotId;
    if (current.manejaVencimiento) {
      if (!newLot.expirationDate) {
        setError('Indicá la fecha de vencimiento');
        return;
      }
      if (!myWarehouseId) {
        setError('Tu usuario no tiene depósito asignado');
        return;
      }
      setAddingLine(true);
      try {
        const created = await api<Lot>(
          `/products/${current.id}/lots`,
          { method: 'POST', body: JSON.stringify({ warehouseId: myWarehouseId, supplierId: header.supplierId || undefined, expirationDate: newLot.expirationDate, receivedAt: newLot.receivedAt || undefined }) },
          token,
        );
        productLotId = created.id;
      } catch (err) {
        setError(errorMessage(err));
        setAddingLine(false);
        return;
      }
      setAddingLine(false);
    }
    setLines([...lines, { ...line, barcode: current.barcode, productName: current.name, productLotId }]);
    setLine(EMPTY_LINE);
    setNewLot({ expirationDate: '', receivedAt: '' });
    setError('');
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  // --- listado: cargar con filtros/paginación, igual que Ventas ---
  const exportParams = { ...filtros, ...(search ? { search } : {}) };

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), pageSize: '20' });
    for (const [k, v] of Object.entries(exportParams)) if (v) p.set(k, v);
    return api<{ items: PurchaseInvoice[]; pagination: Pagination }>(`/purchases/invoices?${p}`, {}, token)
      .then(r => { setItems(r.items); setPagination(r.pagination); })
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);
  useEffect(() => { setPage(1); }, [filtros]);
  useEffect(() => { void load(); }, [token, page, filtros, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const nombreProveedor = (id: string) => suppliers.find(s => s.id === id)?.name ?? id;
  const activeFilters: ActiveFilter[] = [
    filtros.supplierId && { key: 'sup', label: nombreProveedor(filtros.supplierId), clear: () => setFiltros({ ...filtros, supplierId: '' }) },
    filtros.status && { key: 'status', label: STATUS_LABEL[filtros.status]?.label ?? filtros.status, clear: () => setFiltros({ ...filtros, status: '' }) },
    filtros.from && { key: 'from', label: `Desde ${filtros.from}`, clear: () => setFiltros({ ...filtros, from: '' }) },
    filtros.to && { key: 'to', label: `Hasta ${filtros.to}`, clear: () => setFiltros({ ...filtros, to: '' }) },
  ].filter(Boolean) as ActiveFilter[];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!lines.length) return setError('Agregá al menos un producto a la factura');
    if (editingInvoice && !correctionReason.trim()) return setError('Indicá el motivo de la corrección');
    setSaving(true);
    setError('');
    try {
      const body = {
        ...header,
        reason: correctionReason,
        lines: lines.map(l => ({ ...l, quantity: Number(l.quantity), unitCost: Number(l.unitCost), discountPercent: Number(l.discountPercent) || 0, taxRate: Number(l.taxRate) })),
        otherTaxes: otherTaxes.filter(t => t.label.trim()).map(t => ({ label: t.label.trim(), amount: Number(t.amount) || 0 })),
      };
      if (editingInvoice) {
        await api(`/purchases/invoices/${editingInvoice.id}/correct`, { method: 'POST', body: JSON.stringify(body) }, token);
      } else {
        const invoice = await api<{ id: string }>('/purchases/invoices', { method: 'POST', body: JSON.stringify(body) }, token);
        await api(`/purchases/invoices/${invoice.id}/confirm`, { method: 'POST' }, token);
      }
      localStorage.removeItem(draftKey(tenantId));
      setEditingInvoice(null);
      setCorrectionReason('');
      setHeader(EMPTY_HEADER);
      setLines([]);
      setOtherTaxes([]);
      setView('facturas');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function startCorrection(invoice: PurchaseInvoice) {
    setEditingInvoice(invoice);
    setCorrectionReason('');
    setError('');
    setHeader({
      supplierId: invoice.supplierId, invoiceType: invoice.invoiceType, pointOfSale: invoice.pointOfSale ?? '', invoiceNumber: invoice.invoiceNumber ?? '',
      remitoNumber: invoice.remitoNumber ?? '', dueDate: invoice.dueDate ? inputDate(invoice.dueDate) : '', pendingInvoice: false,
      issueDate: inputDate(invoice.issueDate), notes: invoice.notes ?? '',
    });
    setLines(invoice.lines.map(l => ({
      barcode: l.barcode,
      productName: l.description ?? l.barcode,
      productLotId: l.productLotId ?? '',
      quantity: l.quantity,
      unitCost: l.unitCost,
      discountPercent: l.discountPercent ?? '0',
      taxRate: l.taxRate,
      byPackage: Number(l.unitFactor ?? 1) > 1,
      packSize: l.unitFactor ?? '1',
      unitFactor: l.unitFactor ?? '1',
    })));
    setOtherTaxes((invoice.otherTaxes ?? []).map(t => ({ label: t.label, amount: String(t.amount) })));
    setView('nueva');
  }

  function cancelCorrection() {
    localStorage.removeItem(draftKey(tenantId));
    setEditingInvoice(null);
    setCorrectionReason('');
    setHeader(EMPTY_HEADER);
    setLines([]);
    setOtherTaxes([]);
    setError('');
    setView('facturas');
  }

  function openCompleteInvoice(invoice: PurchaseInvoice) {
    setCompletingInvoice(invoice);
    setCompleteForm({ invoiceType: invoice.invoiceType, pointOfSale: '', invoiceNumber: '', dueDate: invoice.dueDate ? inputDate(invoice.dueDate) : '' });
    setCompleteError('');
  }

  async function submitCompleteInvoice(e: FormEvent) {
    e.preventDefault();
    if (!completingInvoice) return;
    setCompleting(true);
    setCompleteError('');
    try {
      await api(`/purchases/invoices/${completingInvoice.id}/complete-invoice`, { method: 'POST', body: JSON.stringify(completeForm) }, token);
      setCompletingInvoice(null);
      await load();
    } catch (err) {
      setCompleteError(errorMessage(err));
    } finally {
      setCompleting(false);
    }
  }

  function openCancelInvoice(invoice: PurchaseInvoice) {
    setCancellingInvoice(invoice);
    setCancelReason('');
    setCancelError('');
  }

  async function submitCancelInvoice(e: FormEvent) {
    e.preventDefault();
    if (!cancellingInvoice) return;
    if (!cancelReason.trim()) return setCancelError('Indicá el motivo de la anulación');
    setCancelling(true);
    setCancelError('');
    try {
      await api(`/purchases/invoices/${cancellingInvoice.id}/cancel`, { method: 'POST', body: JSON.stringify({ reason: cancelReason }) }, token);
      setCancellingInvoice(null);
      await load();
    } catch (err) {
      setCancelError(errorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <ModuleScreen
        title="Compras"
        actions={
          <>
            <ExportMenu path="/purchases/invoices" params={exportParams} filename="compras" label="Exportar facturas" />
            {puedeCrear && view === 'facturas' && (
              <Button onClick={() => setView('nueva')}>
                <Plus /> Cargar factura
              </Button>
            )}
          </>
        }
        views={[
          { key: 'facturas', label: 'Facturas' },
          { key: 'pedidos', label: 'Pedidos' },
          ...(puedeCrear ? [{ key: 'nueva', label: editingInvoice ? 'Corregir factura' : 'Nueva factura' }] : []),
        ]}
        view={view}
        onView={k => setView(k as typeof view)}
      >
        {error && <Alert variant="destructive">{error}</Alert>}

        {view === 'facturas' ? (
          <ModuleSection title="Facturas cargadas" description="Cada factura confirmada movió stock. Corregirla o anularla revierte y vuelve a mover, nunca la borra.">
            <ListFilters
              search={searchInput}
              onSearch={setSearchInput}
              searchPlaceholder="Punto de venta o número"
              searchLabel="Buscar comprobante"
              activeFilters={activeFilters}
            >
              <Field label="Proveedor" htmlFor="f-supplier">
                <Select id="f-supplier" value={filtros.supplierId} onChange={e => { setFiltros({ ...filtros, supplierId: e.target.value }); setSearchParams(e.target.value ? { supplierId: e.target.value } : {}); }}>
                  <option value="">Todos</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
              <Field label="Estado" htmlFor="f-status">
                <Select id="f-status" value={filtros.status} onChange={e => setFiltros({ ...filtros, status: e.target.value })}>
                  <option value="">Todos</option>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </Select>
              </Field>
              <Field label="Desde" htmlFor="f-from">
                <Input id="f-from" type="date" value={filtros.from} onChange={e => setFiltros({ ...filtros, from: e.target.value })} />
              </Field>
              <Field label="Hasta" htmlFor="f-to">
                <Input id="f-to" type="date" value={filtros.to} onChange={e => setFiltros({ ...filtros, to: e.target.value })} />
              </Field>
            </ListFilters>

            {loading ? (
              <PageSpinner />
            ) : items.length === 0 ? (
              <EmptyState
                icon={ShoppingCartSimple}
                title={activeFilters.length > 0 ? 'Sin facturas con estos filtros' : 'Todavía no cargaste ninguna factura'}
                description={activeFilters.length > 0 ? 'Probá quitando algún filtro.' : 'Cargá la primera factura de un proveedor para que entre a stock.'}
                action={activeFilters.length === 0 && puedeCrear ? <Button onClick={() => setView('nueva')}><Plus /> Cargar factura</Button> : undefined}
              />
            ) : (
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Comprobante</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(i => (
                      <TableRow key={i.id}>
                        <TableCell>{fecha(i.issueDate)}</TableCell>
                        <TableCell>{i.supplier?.name ?? '—'}</TableCell>
                        <TableCell>{i.invoiceNumber ? `${i.invoiceType} ${i.pointOfSale}-${i.invoiceNumber}` : `Remito${i.remitoNumber ? ` ${i.remitoNumber}` : ''}`}</TableCell>
                        <TableCell className="text-right font-medium">{money(Number(i.total))}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_LABEL[i.status]?.variant ?? 'secondary'}>{STATUS_LABEL[i.status]?.label ?? i.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setDetalle(i)}>Ver</Button>
                            {puedeCrear && i.status === 'received' && (
                              <Button variant="outline" size="sm" onClick={() => openCompleteInvoice(i)}>Completar factura</Button>
                            )}
                            {puedeCorregir && (i.status === 'confirmed' || i.status === 'corrected' || i.status === 'received') && (
                              <Button variant="outline" size="sm" onClick={() => startCorrection(i)}>Corregir</Button>
                            )}
                            {puedeAnular && (i.status === 'confirmed' || i.status === 'corrected' || i.status === 'received') && (
                              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => openCancelInvoice(i)}>Anular</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border pt-3 text-chico">
                    <span className="text-muted-foreground">{pagination.total} factura{pagination.total === 1 ? '' : 's'}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                      <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Siguiente</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ModuleSection>
        ) : view === 'pedidos' ? (
          <ModuleSection title="Pedidos a proveedor" description="Nacen desde Reposición: no reconcilian cantidades contra la factura, sólo avisan qué se pidió y a quién hasta que llegue.">
            {ordersError && <Alert variant="destructive">{ordersError}</Alert>}
            {ordersLoading ? (
              <PageSpinner />
            ) : orders.length === 0 ? (
              <EmptyState icon={ShoppingCartSimple} title="Todavía no hay pedidos" description="Generalos desde Stock → Reposición, seleccionando productos por debajo del mínimo." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(o => (
                    <TableRow key={o.id}>
                      <TableCell>{fecha(o.createdAt)}</TableCell>
                      <TableCell>{o.supplier?.name ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{o.lines.map(l => l.product?.name ?? l.productId).join(', ')}</TableCell>
                      <TableCell>
                        <Badge variant={o.status === 'open' ? 'secondary' : o.status === 'received' ? 'success' : 'destructive'}>
                          {o.status === 'open' ? 'Abierto' : o.status === 'received' ? 'Recibido' : 'Cancelado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {o.status === 'open' && puedeCrear && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => loadInvoiceFromOrder(o)}>Cargar factura</Button>
                              <Button variant="outline" size="sm" disabled={orderActionId === o.id} onClick={() => receiveOrder(o.id)}>Marcar recibido</Button>
                              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={orderActionId === o.id} onClick={() => cancelOrder(o.id)}>Cancelar</Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ModuleSection>
        ) : (
          <form className="flex flex-col" onSubmit={submit}>
            {editingInvoice && <Alert>Estás corrigiendo una factura confirmada. La original queda registrada en el historial.</Alert>}

            <ModuleSection title={editingInvoice ? 'Corregir factura' : 'Datos de la factura'}>
              <div className="grid gap-4">
                <Field label="Proveedor" htmlFor="supplierId">
                  <Select id="supplierId" required value={header.supplierId} onChange={e => setHeader({ ...header, supplierId: e.target.value })}>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </Field>

                <div className="grid grid-cols-4 gap-4">
                  <Field label="Tipo" htmlFor="invoiceType">
                    <Select id="invoiceType" value={header.invoiceType} onChange={e => setHeader({ ...header, invoiceType: e.target.value })}>
                      <option>A</option>
                      <option>B</option>
                      <option>C</option>
                      <option>E</option>
                      <option value="other">Otro</option>
                    </Select>
                  </Field>
                  {!header.pendingInvoice && (
                    <>
                      <Field label="Punto de venta" htmlFor="pointOfSale">
                        <Input id="pointOfSale" required placeholder="0001" value={header.pointOfSale} onChange={e => setHeader({ ...header, pointOfSale: e.target.value })} />
                      </Field>
                      <Field label="Número" htmlFor="invoiceNumber">
                        <Input id="invoiceNumber" required placeholder="00001234" value={header.invoiceNumber} onChange={e => setHeader({ ...header, invoiceNumber: e.target.value })} />
                      </Field>
                    </>
                  )}
                  <Field label="Fecha" htmlFor="issueDate">
                    <Input id="issueDate" required type="date" value={header.issueDate} onChange={e => setHeader({ ...header, issueDate: e.target.value })} />
                  </Field>
                </div>

                {!editingInvoice && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="pendingInvoice"
                      checked={header.pendingInvoice}
                      onCheckedChange={checked => setHeader({ ...header, pendingInvoice: checked === true })}
                    />
                    <Label htmlFor="pendingInvoice" className="font-normal">
                      Todavía no tengo la factura (llegó con remito) — la mercadería entra a stock igual
                    </Label>
                  </div>
                )}

                {header.pendingInvoice && (
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Nº de remito" htmlFor="remitoNumber" hint="(opcional)">
                      <Input id="remitoNumber" value={header.remitoNumber} onChange={e => setHeader({ ...header, remitoNumber: e.target.value })} />
                    </Field>
                    <Field label="Vencimiento estimado" htmlFor="dueDate" hint="(opcional)">
                      <Input id="dueDate" type="date" value={header.dueDate} onChange={e => setHeader({ ...header, dueDate: e.target.value })} />
                    </Field>
                  </div>
                )}
              </div>
            </ModuleSection>

            <ModuleSection title="Productos">
              <div className="grid gap-3">
                <div className="grid grid-cols-6 gap-3">
                  <Field label="Código de barras" htmlFor="line-barcode" className="col-span-2">
                    <div className="flex gap-2">
                      <Input id="line-barcode" placeholder="Escanear o tipear" value={line.barcode} onChange={e => setLine({ ...line, barcode: e.target.value })} />
                      {/* Cuando el código no lee o no se sabe, se busca por
                          nombre. Mismo buscador que la caja. */}
                      <Button type="button" variant="outline" className="shrink-0" onClick={() => setBuscarOpen(true)} title="Buscar producto (F3)">
                        <MagnifyingGlass />
                        <Kbd>F3</Kbd>
                      </Button>
                    </div>
                  </Field>
                  <div className="col-span-2 flex items-end pb-2 text-sm text-muted-foreground">
                    {lookupPending ? 'Buscando...' : product ? `${product.name}${product.sku ? ` · SKU ${product.sku}` : ''}` : ''}
                  </div>
                  <Field label={line.byPackage ? `Cantidad (${product?.purchaseUnit || 'bultos'})` : 'Cantidad'} htmlFor="line-quantity">
                    <Input id="line-quantity" min="0.001" step="0.001" type="number" value={line.quantity} onChange={e => setLine({ ...line, quantity: e.target.value })} />
                  </Field>
                  <Field label={line.byPackage ? `Precio por ${product?.purchaseUnit || 'bulto'}` : 'Precio unitario'} htmlFor="line-unitCost">
                    <Input id="line-unitCost" min="0" step="0.01" type="number" value={line.unitCost} onChange={e => setLine({ ...line, unitCost: e.target.value })} />
                  </Field>
                </div>

                {/* Solo tiene sentido ofrecer el bulto si el producto define un factor. */}
                {product && Number(line.packSize) > 1 && (
                  <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/40 p-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="line-byPackage"
                        checked={line.byPackage}
                        onCheckedChange={checked => setLine({ ...line, byPackage: checked === true })}
                      />
                      <Label htmlFor="line-byPackage" className="font-normal">
                        Cargar por {product.purchaseUnit || 'bulto'} (x{Number(line.packSize)})
                      </Label>
                    </div>
                    {line.byPackage && Number(line.quantity) > 0 && (
                      <span className="text-sm text-muted-foreground">
                        Ingresan {(Number(line.quantity) * Number(line.packSize)).toLocaleString('es-AR')} {product.unit}
                        {Number(line.unitCost) > 0 && ` · costo unitario ${money(Number(line.unitCost) / Number(line.packSize))}`}
                      </span>
                    )}
                  </div>
                )}

                {!lookupPending && !product && line.barcode.trim() && (
                  <div className="grid gap-3 rounded-md border border-border bg-muted/40 p-3">
                    <p className="text-sm text-muted-foreground">Producto no encontrado. Completá los datos para crearlo sin salir de esta pantalla.</p>
                    {newProductHint && <p className="text-xs text-muted-foreground">Nombre sugerido desde la base de referencia. Revisalo antes de crear.</p>}
                    <div className="grid grid-cols-6 items-end gap-3">
                      <Field label="Nombre" htmlFor="new-product-name" className="col-span-3">
                        <Input id="new-product-name" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
                      </Field>
                      <Field label="Unidad" htmlFor="new-product-unit">
                        <Input id="new-product-unit" value={newProduct.unit} onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })} />
                      </Field>
                      <div className="col-span-2 flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-sm text-muted-foreground">
                          <input type="checkbox" checked={newProduct.manejaVencimiento} onChange={e => setNewProduct({ ...newProduct, manejaVencimiento: e.target.checked })} />
                          Maneja vencimiento
                        </label>
                        <Button type="button" variant="outline" onClick={createProductInline} disabled={creatingProduct}>
                          {creatingProduct ? <Spinner /> : <Plus />} Crear
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-6 items-end gap-3">
                  <Field label="Bonificación %" htmlFor="line-discountPercent" hint="(ej. 10+1 ≈ 9,09%)">
                    <Input id="line-discountPercent" min="0" max="100" step="0.01" type="number" value={line.discountPercent} onChange={e => setLine({ ...line, discountPercent: e.target.value })} />
                  </Field>
                  <Field label="IVA %" htmlFor="line-taxRate">
                    <Input id="line-taxRate" min="0" step="0.01" type="number" value={line.taxRate} onChange={e => setLine({ ...line, taxRate: e.target.value })} />
                  </Field>
                  <div className="col-span-2 flex items-end pb-2 text-sm text-muted-foreground">
                    {Number(line.discountPercent) > 0 && Number(line.unitCost) > 0 && `Costo neto: ${money(netUnitCost(line))}`}
                  </div>
                  <div className="col-span-2 flex items-end justify-end">
                    <Button type="button" variant="outline" onClick={addLine} disabled={addingLine}>
                      {addingLine ? <Spinner /> : <Plus />} Agregar línea
                    </Button>
                  </div>
                </div>

                {product?.manejaVencimiento && (
                  <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-muted/40 p-3">
                    <Field label="Vencimiento" htmlFor="new-lot-expiration">
                      <Input id="new-lot-expiration" required type="date" value={newLot.expirationDate} onChange={e => setNewLot({ ...newLot, expirationDate: e.target.value })} />
                    </Field>
                    <Field label="Recepción" htmlFor="new-lot-received" hint="(opcional)">
                      <Input id="new-lot-received" type="date" value={newLot.receivedAt} onChange={e => setNewLot({ ...newLot, receivedAt: e.target.value })} />
                    </Field>
                  </div>
                )}

                {lines.length > 0 && (
                  <div className="overflow-hidden rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead className="text-right">Unitario</TableHead>
                          <TableHead className="text-right">Importe</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((l, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{l.barcode}</TableCell>
                            <TableCell>{l.productName}</TableCell>
                            <TableCell className="text-right">{l.quantity}</TableCell>
                            <TableCell className="text-right">
                              {money(Number(l.unitCost))}
                              {Number(l.discountPercent) > 0 && <span className="text-xs text-muted-foreground"> (-{l.discountPercent}%)</span>}
                            </TableCell>
                            <TableCell className="text-right font-medium">{money(lineTotal(l))}</TableCell>
                            <TableCell>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(i)}>
                                <Trash />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </ModuleSection>

            <ModuleSection title="Otros impuestos" description="Percepciones, impuestos internos u otros cargos que la factura del proveedor liste aparte del IVA.">
              <div className="grid gap-3">
                {otherTaxes.map((t, i) => (
                  <div key={i} className="grid grid-cols-6 items-end gap-3">
                    <Field label="Concepto" htmlFor={`other-tax-label-${i}`} className="col-span-3">
                      <Input id={`other-tax-label-${i}`} placeholder="Ej.: Percepción IIBB" value={t.label} onChange={e => updateOtherTax(i, { label: e.target.value })} />
                    </Field>
                    <Field label="Monto" htmlFor={`other-tax-amount-${i}`} className="col-span-2">
                      <Input id={`other-tax-amount-${i}`} min="0" step="0.01" type="number" value={t.amount} onChange={e => updateOtherTax(i, { amount: e.target.value })} />
                    </Field>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeOtherTax(i)}>
                      <Trash />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" className="w-fit" onClick={addOtherTax}>
                  <Plus /> Agregar impuesto
                </Button>
              </div>
            </ModuleSection>

            <ModuleSection title="Confirmar">
              <div className="grid gap-4">
                <div className="flex flex-wrap justify-end gap-8 text-sm">
                  <div>Subtotal: <strong>{money(subtotal)}</strong></div>
                  <div>IVA: <strong>{money(tax)}</strong></div>
                  {otherTaxesTotal > 0 && <div>Otros impuestos: <strong>{money(otherTaxesTotal)}</strong></div>}
                  <div>Total: <strong>{money(subtotal + tax + otherTaxesTotal)}</strong></div>
                </div>

                <Field label="Notas" htmlFor="notes" hint="(opcional)">
                  <Textarea id="notes" value={header.notes} onChange={e => setHeader({ ...header, notes: e.target.value })} />
                </Field>

                {editingInvoice && (
                  <Field label="Motivo de la corrección" htmlFor="reason">
                    <Textarea id="reason" required value={correctionReason} onChange={e => setCorrectionReason(e.target.value)} placeholder="Ej.: se ingresó una cantidad incorrecta" />
                  </Field>
                )}

                <div className="flex gap-2">
                  <Button disabled={saving}>
                    {saving && <Spinner />} {editingInvoice ? 'Guardar corrección y actualizar stock' : 'Confirmar ingreso y actualizar stock'}
                  </Button>
                  <Button type="button" variant="outline" onClick={cancelCorrection}>
                    {editingInvoice ? 'Cancelar corrección' : 'Cancelar'}
                  </Button>
                </div>
              </div>
            </ModuleSection>
          </form>
        )}
      </ModuleScreen>

      {/* Ver una factura ya cargada, sin arrancar una corrección. */}
      <Dialog open={!!detalle} onOpenChange={open => !open && setDetalle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detalle ? (detalle.invoiceNumber ? `${detalle.invoiceType} ${detalle.pointOfSale}-${detalle.invoiceNumber}` : `Remito${detalle.remitoNumber ? ` ${detalle.remitoNumber}` : ''}`) : ''}</DialogTitle>
          </DialogHeader>
          {detalle && (
            <div className="flex flex-col gap-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Proveedor</span><span>{detalle.supplier?.name ?? '—'}</span>
                <span className="text-muted-foreground">Fecha</span><span>{fecha(detalle.issueDate)}</span>
                <span className="text-muted-foreground">Estado</span>
                <span><Badge variant={STATUS_LABEL[detalle.status]?.variant ?? 'secondary'}>{STATUS_LABEL[detalle.status]?.label ?? detalle.status}</Badge></span>
                {detalle.notes && <><span className="text-muted-foreground">Notas</span><span>{detalle.notes}</span></>}
              </div>
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead className="text-right">Unitario</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalle.lines.map((l, i) => (
                      <TableRow key={i}>
                        <TableCell>{l.description ?? l.barcode}</TableCell>
                        <TableCell className="text-right">{Number(l.quantity)}</TableCell>
                        <TableCell className="text-right">
                          {money(Number(l.unitCost))}
                          {Number(l.discountPercent) > 0 && <span className="text-xs text-muted-foreground"> (-{l.discountPercent}%)</span>}
                        </TableCell>
                        <TableCell className="text-right font-medium">{money(lineTotal(l))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-wrap justify-end gap-x-4 gap-y-1">
                <span className="text-muted-foreground">Subtotal: {money(Number(detalle.subtotal))}</span>
                <span className="text-muted-foreground">IVA: {money(Number(detalle.taxTotal))}</span>
                {Number(detalle.otherTaxesTotal ?? 0) > 0 && <span className="text-muted-foreground">Otros impuestos: {money(Number(detalle.otherTaxesTotal))}</span>}
                <span className="font-semibold">Total: {money(Number(detalle.total))}</span>
              </div>
              {Number(detalle.otherTaxesTotal ?? 0) > 0 && (detalle.status === 'confirmed' || detalle.status === 'corrected' || detalle.status === 'received') && (
                <p className="text-chico text-placeholder">Los otros impuestos se prorratearon entre las líneas: el costo que quedó cargado en cada producto incluye su parte proporcional.</p>
              )}
            </div>
          )}
          <DialogFooter>
            {puedeCrear && detalle && detalle.status === 'received' && (
              <Button type="button" variant="outline" onClick={() => { const inv = detalle; setDetalle(null); openCompleteInvoice(inv); }}>
                Completar factura
              </Button>
            )}
            {puedeCorregir && detalle && (detalle.status === 'confirmed' || detalle.status === 'corrected' || detalle.status === 'received') && (
              <Button type="button" variant="outline" onClick={() => { const inv = detalle; setDetalle(null); if (inv) startCorrection(inv); }}>
                Corregir
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setDetalle(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!completingInvoice} onOpenChange={open => !open && setCompletingInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completar factura</DialogTitle>
          </DialogHeader>
          {completingInvoice && (
            <p className="text-sm text-muted-foreground">
              Remito{completingInvoice.remitoNumber ? ` ${completingInvoice.remitoNumber}` : ''} · {completingInvoice.supplier?.name} · {money(Number(completingInvoice.total))}
              <br />La mercadería ya está en stock y la deuda ya está registrada; esto sólo carga el número real de la factura.
            </p>
          )}
          {completeError && <Alert variant="destructive">{completeError}</Alert>}
          <form className="grid gap-4" onSubmit={submitCompleteInvoice}>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Tipo" htmlFor="complete-type">
                <Select id="complete-type" value={completeForm.invoiceType} onChange={e => setCompleteForm({ ...completeForm, invoiceType: e.target.value })}>
                  <option>A</option>
                  <option>B</option>
                  <option>C</option>
                  <option>E</option>
                  <option value="other">Otro</option>
                </Select>
              </Field>
              <Field label="Punto de venta" htmlFor="complete-pos">
                <Input id="complete-pos" required placeholder="0001" value={completeForm.pointOfSale} onChange={e => setCompleteForm({ ...completeForm, pointOfSale: e.target.value })} />
              </Field>
              <Field label="Número" htmlFor="complete-num">
                <Input id="complete-num" required placeholder="00001234" value={completeForm.invoiceNumber} onChange={e => setCompleteForm({ ...completeForm, invoiceNumber: e.target.value })} />
              </Field>
            </div>
            <Field label="Vencimiento" htmlFor="complete-due" hint="(opcional)">
              <Input id="complete-due" type="date" value={completeForm.dueDate} onChange={e => setCompleteForm({ ...completeForm, dueDate: e.target.value })} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCompletingInvoice(null)}>Volver</Button>
              <Button type="submit" disabled={completing}>{completing && <Spinner />} Completar factura</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancellingInvoice} onOpenChange={open => !open && setCancellingInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular factura</DialogTitle>
          </DialogHeader>
          {cancellingInvoice && (
            <p className="text-sm text-muted-foreground">
              {cancellingInvoice.invoiceNumber ? `${cancellingInvoice.invoiceType} ${cancellingInvoice.pointOfSale}-${cancellingInvoice.invoiceNumber}` : `Remito${cancellingInvoice.remitoNumber ? ` ${cancellingInvoice.remitoNumber}` : ''}`} · {cancellingInvoice.supplier?.name} · {money(Number(cancellingInvoice.total))}
            </p>
          )}
          <Alert variant="destructive">Esto revierte todo el stock que generó esta factura y la marca como anulada. La factura original queda en el historial, no se borra.</Alert>
          {cancelError && <Alert variant="destructive">{cancelError}</Alert>}
          <form className="grid gap-4" onSubmit={submitCancelInvoice}>
            <Field label="Motivo de la anulación" htmlFor="cancel-reason">
              <Textarea id="cancel-reason" required value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Ej.: se cargó la factura equivocada" />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCancellingInvoice(null)}>
                Volver
              </Button>
              <Button type="submit" variant="destructive" disabled={cancelling}>
                {cancelling && <Spinner />} Anular factura
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* En una compra el producto puede no tener precio de venta todavía, así
          que no se exige ni se cotiza: sólo se elige y se completa el código. */}
      <ProductSearchDialog
        open={buscarOpen}
        onOpenChange={setBuscarOpen}
        onPick={p => setLine(l => ({ ...l, barcode: p.barcode }))}
        accion="Elegir"
        token={token}
      />
    </>
  );
}
