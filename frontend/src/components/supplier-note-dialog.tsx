import { useEffect, useMemo, useState } from 'react';
import { Trash } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, type PurchaseInvoice, type SupplierNoteKind } from '@/lib/api';
import { fecha, money } from '@/lib/format';

type Borrador = {
  key: string;
  purchaseInvoiceId: string;
  invoiceComprobante: string;
  purchaseInvoiceLineId?: string;
  description: string;
  returnsStock: boolean;
  quantity?: number;
  unitAmount?: number;
  amount?: number;
  taxRate: number;
  lineTotal: number;
};

function comprobanteFactura(f: PurchaseInvoice) {
  return f.invoiceNumber ? `${f.invoiceType} ${f.pointOfSale}-${f.invoiceNumber}` : `Remito${f.remitoNumber ? ` ${f.remitoNumber}` : ''} (factura pendiente)`;
}

/**
 * Nota de crédito/débito de proveedor — a diferencia del "ajuste manual"
 * suelto de la cuenta corriente, ésta queda linkeada línea por línea a la(s)
 * factura(s) que corrige, con o sin devolución física de mercadería, y puede
 * juntar varias facturas del mismo proveedor en una sola nota (como a veces
 * llega el papel real).
 */
export function SupplierNoteDialog({
  open, onOpenChange, token, supplierId, supplierName, onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  supplierId: string;
  supplierName: string;
  onCreated: () => void;
}) {
  const [kind, setKind] = useState<SupplierNoteKind>('credit_note');
  const [reason, setReason] = useState('');
  const [supplierDocType, setSupplierDocType] = useState('');
  const [supplierPointOfSale, setSupplierPointOfSale] = useState('');
  const [supplierNumber, setSupplierNumber] = useState('');
  const [supplierIssueDate, setSupplierIssueDate] = useState('');

  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // El "cargador" de una línea a la vez, se resetea (menos la factura) después de "Agregar".
  const [invoiceId, setInvoiceId] = useState('');
  const [lineId, setLineId] = useState('');
  const [returnsStock, setReturnsStock] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [unitAmount, setUnitAmount] = useState('');
  const [amount, setAmount] = useState('');

  const [lineas, setLineas] = useState<Borrador[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind('credit_note'); setReason(''); setSupplierDocType(''); setSupplierPointOfSale(''); setSupplierNumber(''); setSupplierIssueDate('');
    setInvoiceId(''); setLineId(''); setReturnsStock(false); setQuantity(''); setUnitAmount(''); setAmount('');
    setLineas([]); setError('');
    setLoadingInvoices(true);
    api<PurchaseInvoice[]>(`/suppliers/${supplierId}/notable-invoices`, {}, token)
      .then(setInvoices)
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoadingInvoices(false));
  }, [open, supplierId, token]);

  const invoice = invoices.find(i => i.id === invoiceId);
  const line = invoice?.lines.find(l => l.id === lineId);

  // Al elegir una línea puntual, el costo neto de esa línea es el punto de partida.
  useEffect(() => {
    if (!line) { setUnitAmount(''); return; }
    const neto = Number(line.unitCost) * (1 - Number(line.discountPercent ?? 0) / 100);
    setUnitAmount(neto.toFixed(2));
  }, [line]);

  function agregarLinea() {
    setError('');
    if (!invoice) { setError('Elegí de qué factura viene esta línea'); return; }
    if (returnsStock && !line) { setError('Para devolver stock elegí un producto puntual de la factura'); return; }
    let lineTotal: number; let q: number | undefined; let u: number | undefined; let a: number | undefined;
    if (line && quantity && unitAmount) {
      q = Number(quantity); u = Number(unitAmount);
      if (!Number.isFinite(q) || q <= 0) { setError('La cantidad tiene que ser mayor a cero'); return; }
      lineTotal = q * u;
    } else if (amount) {
      a = Number(amount);
      if (!Number.isFinite(a) || a <= 0) { setError('El monto tiene que ser mayor a cero'); return; }
      lineTotal = a;
    } else {
      setError('Cargá cantidad y costo unitario, o un monto directo');
      return;
    }
    const taxRate = Number(line?.taxRate ?? 0);
    lineTotal = lineTotal * (1 + taxRate / 100);
    setLineas(prev => [...prev, {
      key: `${Date.now()}-${prev.length}`, purchaseInvoiceId: invoice.id, invoiceComprobante: comprobanteFactura(invoice),
      purchaseInvoiceLineId: line?.id, description: line?.description ?? `Ajuste sobre ${comprobanteFactura(invoice)}`,
      returnsStock, quantity: q, unitAmount: u, amount: a, taxRate, lineTotal,
    }]);
    setLineId(''); setReturnsStock(false); setQuantity(''); setUnitAmount(''); setAmount('');
  }

  function quitarLinea(key: string) {
    setLineas(prev => prev.filter(l => l.key !== key));
  }

  const total = useMemo(() => lineas.reduce((s, l) => s + l.lineTotal, 0), [lineas]);

  async function guardar() {
    if (!reason.trim()) { setError('Indicá el motivo de la nota'); return; }
    if (lineas.length === 0) { setError('Agregá al menos una línea'); return; }
    setSaving(true); setError('');
    try {
      await api(`/suppliers/${supplierId}/notes`, {
        method: 'POST',
        body: JSON.stringify({
          kind, reason: reason.trim(),
          supplierDocType: supplierDocType || undefined, supplierPointOfSale: supplierPointOfSale || undefined,
          supplierNumber: supplierNumber || undefined, supplierIssueDate: supplierIssueDate || undefined,
          lines: lineas.map(l => ({
            purchaseInvoiceId: l.purchaseInvoiceId, purchaseInvoiceLineId: l.purchaseInvoiceLineId, returnsStock: l.returnsStock,
            quantity: l.quantity, unitAmount: l.unitAmount, amount: l.amount, taxRate: l.taxRate, description: l.description,
          })),
        }),
      }, token);
      onOpenChange(false);
      onCreated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nota de crédito / débito · {supplierName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {error && <Alert variant="destructive">{error}</Alert>}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo" htmlFor="note-kind">
              <Select id="note-kind" value={kind} onChange={e => setKind(e.target.value as SupplierNoteKind)}>
                <option value="credit_note">Nota de crédito (nos reduce la deuda)</option>
                <option value="debit_note">Nota de débito (nos aumenta la deuda)</option>
              </Select>
            </Field>
            <Field label="Motivo" htmlFor="note-reason">
              <Input id="note-reason" required value={reason} onChange={e => setReason(e.target.value)} placeholder="Devolución por avería, bonificación, corrección de precio…" />
            </Field>
          </div>

          <p className="text-chico font-semibold text-placeholder">Comprobante del proveedor (opcional, dato de referencia)</p>
          <div className="grid grid-cols-4 gap-3">
            <Field label="Tipo" htmlFor="sup-doc-type"><Input id="sup-doc-type" value={supplierDocType} onChange={e => setSupplierDocType(e.target.value)} placeholder="NC A" /></Field>
            <Field label="Punto de venta" htmlFor="sup-pos"><Input id="sup-pos" value={supplierPointOfSale} onChange={e => setSupplierPointOfSale(e.target.value)} placeholder="0001" /></Field>
            <Field label="Número" htmlFor="sup-num"><Input id="sup-num" value={supplierNumber} onChange={e => setSupplierNumber(e.target.value)} placeholder="00004521" /></Field>
            <Field label="Fecha" htmlFor="sup-date"><Input id="sup-date" type="date" value={supplierIssueDate} onChange={e => setSupplierIssueDate(e.target.value)} /></Field>
          </div>

          <div className="rounded-md border border-border p-3">
            <p className="mb-2 text-chico font-semibold text-placeholder">Agregar línea</p>
            {loadingInvoices ? (
              <PageSpinnerInline />
            ) : invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Este proveedor no tiene facturas confirmadas para acreditar.</p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Factura" htmlFor="note-invoice">
                    <Select id="note-invoice" value={invoiceId} onChange={e => { setInvoiceId(e.target.value); setLineId(''); }}>
                      <option value="">Elegir…</option>
                      {invoices.map(i => <option key={i.id} value={i.id}>{comprobanteFactura(i)} · {fecha(i.issueDate)}</option>)}
                    </Select>
                  </Field>
                  <Field label="Línea" htmlFor="note-line" hint="(opcional)">
                    <Select id="note-line" value={lineId} onChange={e => { setLineId(e.target.value); setReturnsStock(false); }} disabled={!invoice}>
                      <option value="">Ajuste general de la factura</option>
                      {invoice?.lines.map(l => <option key={l.id} value={l.id}>{l.description} · {l.quantity} u.</option>)}
                    </Select>
                  </Field>
                </div>

                {line && (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={returnsStock} onCheckedChange={v => setReturnsStock(v === true)} />
                    Devuelve stock ({kind === 'credit_note' ? 'resta' : 'suma'} existencias de este producto)
                  </label>
                )}

                {line ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Cantidad" htmlFor="note-qty"><Input id="note-qty" type="number" min="0" step="0.001" value={quantity} onChange={e => setQuantity(e.target.value)} /></Field>
                    <Field label="Costo unitario" htmlFor="note-unit"><Input id="note-unit" type="number" min="0" step="0.01" value={unitAmount} onChange={e => setUnitAmount(e.target.value)} /></Field>
                  </div>
                ) : (
                  <Field label="Monto" htmlFor="note-amount" hint="(sin IVA)"><Input id="note-amount" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
                )}

                <Button type="button" variant="outline" onClick={agregarLinea} className="self-start">Agregar línea</Button>
              </div>
            )}
          </div>

          {lineas.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factura</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineas.map(l => (
                  <TableRow key={l.key}>
                    <TableCell className="text-chico">{l.invoiceComprobante}</TableCell>
                    <TableCell>{l.description}{l.quantity ? ` · ${l.quantity} u.` : ''}</TableCell>
                    <TableCell>{l.returnsStock ? 'Sí' : 'No'}</TableCell>
                    <TableCell className="text-right tabular">{money(l.lineTotal)}</TableCell>
                    <TableCell>
                      <button type="button" onClick={() => quitarLinea(l.key)} className="text-muted-foreground hover:text-destructive" aria-label="Quitar línea">
                        <Trash className="size-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <DialogFooter className="items-center">
          {lineas.length > 0 && <p className="mr-auto text-sm font-semibold">Total: {money(total)}</p>}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" onClick={guardar} disabled={saving || lineas.length === 0}>
            {saving && <Spinner />} Guardar nota
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PageSpinnerInline() {
  return <div className="flex justify-center py-4"><Spinner /></div>;
}
