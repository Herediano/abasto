import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlass, Plus, Trash } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProductSearchDialog } from '@/components/product-search-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/page-header';
import { StockNav } from '@/components/stock-nav';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { api, errorMessage, type Lot, type Product, type PurchaseInvoice, type Supplier } from '@/lib/api';
import { money } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';

const STATUS_LABEL: Record<string, { label: string; variant: 'secondary' | 'success' | 'destructive' }> = {
  draft: { label: 'Borrador', variant: 'secondary' },
  confirmed: { label: 'Confirmada', variant: 'success' },
  corrected: { label: 'Corregida', variant: 'secondary' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
};

// unitFactor sólo viaja al corregir una factura ya confirmada: manda el factor
// con el que se confirmó, no el actual del producto (que pudo cambiar).
type Line = { barcode: string; productName: string; productLotId: string; quantity: string; unitCost: string; taxRate: string; byPackage: boolean; packSize: string; unitFactor?: string };
const EMPTY_LINE: Line = { barcode: '', productName: '', productLotId: '', quantity: '', unitCost: '', taxRate: '21', byPackage: false, packSize: '' };
const EMPTY_HEADER = { supplierId: '', invoiceType: 'A', pointOfSale: '', invoiceNumber: '', issueDate: new Date().toISOString().slice(0, 10), notes: '' };

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

export function StockInPage() {
  const { session, can } = useAuth();
  const puedeCorregir = can('compras.corregir');
  const token = session!.accessToken;
  const tenantId = session!.tenant.id;
  const navigate = useNavigate();
  const storedDraft = useMemo(() => readDraft(tenantId), [tenantId]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [lookupPending, setLookupPending] = useState(false);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [editingInvoice, setEditingInvoice] = useState<PurchaseInvoice | null>(storedDraft?.editingInvoice ?? null);
  const [correctionReason, setCorrectionReason] = useState(storedDraft?.correctionReason ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [header, setHeader] = useState(storedDraft?.header ?? EMPTY_HEADER);
  const [line, setLine] = useState<Line>(storedDraft?.line ?? EMPTY_LINE);
  const [lines, setLines] = useState<Line[]>(storedDraft?.lines ?? []);
  const [otherTaxes, setOtherTaxes] = useState<OtherTax[]>(storedDraft?.otherTaxes ?? []);
  const [newLot, setNewLot] = useState({ expirationDate: '', receivedAt: '' });
  const [addingLine, setAddingLine] = useState(false);
  const [myWarehouseId, setMyWarehouseId] = useState<string | null>(session!.user.warehouseId ?? null);
  const [cancellingInvoice, setCancellingInvoice] = useState<PurchaseInvoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [newProduct, setNewProduct] = useState({ name: '', unit: 'unidad', manejaVencimiento: false });
  const [newProductHint, setNewProductHint] = useState(false);
  const [buscarOpen, setBuscarOpen] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);

  useEffect(() => {
    localStorage.setItem(draftKey(tenantId), JSON.stringify({ header, line, lines, otherTaxes, editingInvoice, correctionReason }));
  }, [tenantId, header, line, lines, otherTaxes, editingInvoice, correctionReason]);

  const subtotal = lines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.unitCost), 0);
  const tax = lines.reduce((sum, l) => sum + (Number(l.quantity) * Number(l.unitCost) * Number(l.taxRate)) / 100, 0);
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

  const loadInvoices = () => api<PurchaseInvoice[]>('/purchases/invoices', {}, token).then(setInvoices).catch(e => setError(errorMessage(e)));

  useEffect(() => {
    setMyWarehouseId(session!.user.warehouseId ?? null);
    Promise.all([api<Supplier[]>('/suppliers', {}, token), api<PurchaseInvoice[]>('/purchases/invoices', {}, token)])
      .then(([s, i]) => {
        setSuppliers(s);
        setInvoices(i);
      })
      .catch(e => setError(errorMessage(e)));
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
      if (e.key === 'F3') { e.preventDefault(); setBuscarOpen(true); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
          if (found) setLine(l => (l.barcode.trim() === barcode ? { ...l, taxRate: found.taxRate, packSize: found.unitsPerPurchase ?? '1', byPackage: false } : l));
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
        lines: lines.map(l => ({ ...l, quantity: Number(l.quantity), unitCost: Number(l.unitCost), taxRate: Number(l.taxRate) })),
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
      await loadInvoices();
      if (!editingInvoice) navigate('/stock');
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
    setHeader({ supplierId: invoice.supplierId, invoiceType: invoice.invoiceType, pointOfSale: invoice.pointOfSale, invoiceNumber: invoice.invoiceNumber, issueDate: invoice.issueDate.slice(0, 10), notes: invoice.notes ?? '' });
    setLines(invoice.lines.map(l => ({
      barcode: l.barcode,
      productName: l.description ?? l.barcode,
      productLotId: l.productLotId ?? '',
      quantity: l.quantity,
      unitCost: l.unitCost,
      taxRate: l.taxRate,
      byPackage: Number(l.unitFactor ?? 1) > 1,
      packSize: l.unitFactor ?? '1',
      unitFactor: l.unitFactor ?? '1',
    })));
    setOtherTaxes((invoice.otherTaxes ?? []).map(t => ({ label: t.label, amount: String(t.amount) })));
  }

  function cancelCorrection() {
    localStorage.removeItem(draftKey(tenantId));
    setEditingInvoice(null);
    setCorrectionReason('');
    setHeader(EMPTY_HEADER);
    setLines([]);
    setOtherTaxes([]);
    setError('');
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
      await loadInvoices();
    } catch (err) {
      setCancelError(errorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <PageHeader title={editingInvoice ? 'Corregir factura' : 'Ingreso por factura'} description="La sucursal/depósito se toma del usuario logueado. Al confirmar se genera el ingreso de stock." />
      <StockNav />
      {error && <Alert variant="destructive">{error}</Alert>}
      {editingInvoice && <Alert>Estás corrigiendo una factura confirmada. La original queda registrada en el historial.</Alert>}

      <Card>
        <CardContent>
          <form className="grid gap-5" onSubmit={submit}>
            <Field label="Proveedor" htmlFor="supplierId">
              <Select id="supplierId" required value={header.supplierId} onChange={e => setHeader({ ...header, supplierId: e.target.value })}>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
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
              <Field label="Punto de venta" htmlFor="pointOfSale">
                <Input id="pointOfSale" required placeholder="0001" value={header.pointOfSale} onChange={e => setHeader({ ...header, pointOfSale: e.target.value })} />
              </Field>
              <Field label="Número" htmlFor="invoiceNumber">
                <Input id="invoiceNumber" required placeholder="00001234" value={header.invoiceNumber} onChange={e => setHeader({ ...header, invoiceNumber: e.target.value })} />
              </Field>
              <Field label="Fecha" htmlFor="issueDate">
                <Input id="issueDate" required type="date" value={header.issueDate} onChange={e => setHeader({ ...header, issueDate: e.target.value })} />
              </Field>
            </div>

            <Card className="bg-secondary/40">
              <CardHeader className="border-none pb-0">
                <CardTitle className="text-sm">Agregar producto</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="grid grid-cols-6 gap-3">
                  <Field label="Código de barras" htmlFor="line-barcode" className="col-span-2">
                    <div className="flex gap-2">
                      <Input id="line-barcode" placeholder="Escanear o tipear" value={line.barcode} onChange={e => setLine({ ...line, barcode: e.target.value })} />
                      {/* Cuando el código no lee o no se sabe, se busca por
                          nombre. Mismo buscador que la caja. */}
                      <Button type="button" variant="outline" className="shrink-0" onClick={() => setBuscarOpen(true)} title="Buscar producto (F3)">
                        <MagnifyingGlass />
                        <kbd className="font-mono text-micro text-placeholder">F3</kbd>
                      </Button>
                    </div>
                  </Field>
                  <div className="col-span-2 flex items-end pb-2 text-sm text-muted-foreground">
                    {lookupPending ? 'Buscando...' : product ? `${product.name}${product.internalCode ? ` · ${product.internalCode}` : ''}` : ''}
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
                  <div className="grid gap-3 rounded-md border border-border bg-card p-3">
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
                  <Field label="IVA %" htmlFor="line-taxRate">
                    <Input id="line-taxRate" min="0" step="0.01" type="number" value={line.taxRate} onChange={e => setLine({ ...line, taxRate: e.target.value })} />
                  </Field>
                  <div className="col-span-5 flex items-end justify-end">
                    <Button type="button" variant="outline" onClick={addLine} disabled={addingLine}>
                      {addingLine ? <Spinner /> : <Plus />} Agregar línea
                    </Button>
                  </div>
                </div>

                {product?.manejaVencimiento && (
                  <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-card p-3">
                    <Field label="Vencimiento" htmlFor="new-lot-expiration">
                      <Input id="new-lot-expiration" required type="date" value={newLot.expirationDate} onChange={e => setNewLot({ ...newLot, expirationDate: e.target.value })} />
                    </Field>
                    <Field label="Recepción" htmlFor="new-lot-received" hint="(opcional)">
                      <Input id="new-lot-received" type="date" value={newLot.receivedAt} onChange={e => setNewLot({ ...newLot, receivedAt: e.target.value })} />
                    </Field>
                  </div>
                )}

                {lines.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Barcode</TableHead>
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
                          <TableCell className="text-right">{money(Number(l.unitCost))}</TableCell>
                          <TableCell className="text-right font-medium">{money(Number(l.quantity) * Number(l.unitCost) * (1 + Number(l.taxRate) / 100))}</TableCell>
                          <TableCell>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(i)}>
                              <Trash />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="bg-secondary/40">
              <CardHeader className="border-none pb-0">
                <CardTitle className="text-sm">Otros impuestos</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <p className="text-xs text-muted-foreground">Percepciones, impuestos internos u otros cargos que la factura del proveedor liste aparte del IVA.</p>
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
              </CardContent>
            </Card>

            <div className="flex flex-wrap justify-end gap-8 text-sm">
              <div>
                Subtotal: <strong>{money(subtotal)}</strong>
              </div>
              <div>
                IVA: <strong>{money(tax)}</strong>
              </div>
              {otherTaxesTotal > 0 && (
                <div>
                  Otros impuestos: <strong>{money(otherTaxesTotal)}</strong>
                </div>
              )}
              <div>
                Total: <strong>{money(subtotal + tax + otherTaxesTotal)}</strong>
              </div>
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
              {editingInvoice && (
                <Button type="button" variant="outline" onClick={cancelCorrection}>
                  Cancelar corrección
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Facturas cargadas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
              {invoices.map(i => (
                <TableRow key={i.id}>
                  <TableCell>{i.issueDate.slice(0, 10)}</TableCell>
                  <TableCell>{i.supplier?.name ?? '—'}</TableCell>
                  <TableCell>
                    {i.invoiceType} {i.pointOfSale}-{i.invoiceNumber}
                  </TableCell>
                  <TableCell className="text-right font-medium">{money(Number(i.total))}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_LABEL[i.status]?.variant ?? 'secondary'}>{STATUS_LABEL[i.status]?.label ?? i.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {puedeCorregir && (i.status === 'confirmed' || i.status === 'corrected') && (
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => startCorrection(i)}>
                          Corregir
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => openCancelInvoice(i)}>
                          Anular
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!cancellingInvoice} onOpenChange={open => !open && setCancellingInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular factura</DialogTitle>
          </DialogHeader>
          {cancellingInvoice && (
            <p className="text-sm text-muted-foreground">
              {cancellingInvoice.invoiceType} {cancellingInvoice.pointOfSale}-{cancellingInvoice.invoiceNumber} · {cancellingInvoice.supplier?.name} · {money(Number(cancellingInvoice.total))}
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
