import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, ShoppingCart, Trash2 } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, type Customer, type Product } from '@/lib/api';
import { money } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';

type Item = { productId: string; name: string; barcode: string; quantity: number };

type QuoteLine = {
  productId: string;
  name: string;
  quantity: number;
  listPrice: number;
  unitPrice: number;
  discountAmount: number;
  promotionName: string | null;
  lineTotal: number;
};

type Quote = {
  priceList: { id: string; name: string } | null;
  lines: QuoteLine[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  withoutPrice: string[];
};

const PAGOS: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' };


export function PosPage() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [items, setItems] = useState<Item[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [cobrando, setCobrando] = useState(false);
  const [cobrarOpen, setCobrarOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<Customer[]>('/customers', {}, token).then(setCustomers).catch(() => {});
  }, [token]);

  // El foco vuelve siempre al lector: es una pantalla de mostrador, se opera
  // escaneando uno atrás de otro sin tocar el mouse.
  useEffect(() => {
    barcodeRef.current?.focus();
  }, [items.length]);

  // Cada cambio del carrito o del cliente re-cotiza: el precio depende de la
  // lista del cliente, de la cantidad (escalas) y de las promociones vigentes.
  useEffect(() => {
    if (!items.length) {
      setQuote(null);
      return;
    }
    let cancelado = false;
    api<Quote>('/sales/quote', {
      method: 'POST',
      body: JSON.stringify({ customerId: customerId || undefined, lines: items.map(i => ({ productId: i.productId, quantity: i.quantity })) }),
    }, token)
      .then(q => { if (!cancelado) setQuote(q); })
      .catch(e => { if (!cancelado) setError(errorMessage(e)); });
    return () => { cancelado = true; };
  }, [items, customerId, token]);

  async function agregar(codigo: string) {
    const limpio = codigo.trim();
    if (!limpio) return;
    setBuscando(true);
    setError('');
    try {
      const r = await api<{ items: Product[] }>(`/products?barcode=${encodeURIComponent(limpio)}`, {}, token);
      const p = r.items[0];
      if (!p) {
        setError(`No hay ningún producto con el código ${limpio}`);
        return;
      }
      setItems(prev => {
        const existente = prev.find(i => i.productId === p.id);
        if (existente) return prev.map(i => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
        return [...prev, { productId: p.id, name: p.name, barcode: p.barcode, quantity: 1 }];
      });
      setBarcode('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBuscando(false);
    }
  }

  function cambiarCantidad(productId: string, quantity: number) {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.productId !== productId));
      return;
    }
    setItems(prev => prev.map(i => (i.productId === productId ? { ...i, quantity } : i)));
  }

  async function cobrar() {
    setCobrando(true);
    setError('');
    try {
      const venta = await api<{ pointOfSale: string; number: number; total: string }>('/sales', {
        method: 'POST',
        body: JSON.stringify({
          customerId: customerId || undefined,
          paymentMethod,
          lines: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        }),
      }, token);
      setCobrarOpen(false);
      setItems([]);
      setQuote(null);
      setAviso(`Venta ${venta.pointOfSale}-${String(venta.number).padStart(8, '0')} cobrada por ${money(Number(venta.total))}.`);
    } catch (err) {
      setError(errorMessage(err));
      setCobrarOpen(false);
    } finally {
      setCobrando(false);
    }
  }

  const lineaDe = (productId: string) => quote?.lines.find(l => l.productId === productId);

  return (
    <>
      <PageHeader
        title="Mostrador"
        description="Escaneá los productos y cobrá. El precio sale de la lista del cliente."
        actions={
          <Button variant="outline" asChild>
            <Link to="/ventas/historial">Ver ventas</Link>
          </Button>
        }
      />

      {aviso && <Alert>{aviso}</Alert>}
      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4">
          <Field label="Cliente" htmlFor="pos-customer" hint="(opcional)" className="max-w-xs">
            <Select id="pos-customer" value={customerId} onChange={e => setCustomerId(e.target.value)}>
              <option value="">Consumidor final</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.priceListName ? ` — ${c.priceListName}` : ''}</option>
              ))}
            </Select>
          </Field>

          <Field label="Código de barras" htmlFor="pos-barcode" className="max-w-sm">
            <Input
              id="pos-barcode"
              ref={barcodeRef}
              autoFocus
              placeholder="Escanear o tipear y Enter"
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void agregar(barcode);
                }
              }}
            />
          </Field>
          {buscando && <Spinner />}
          {quote?.priceList && <Badge variant="secondary">Lista: {quote.priceList.name}</Badge>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="Carrito vacío" description="Escaneá un producto para empezar la venta." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="w-28">Cantidad</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead>Promoción</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Quitar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(i => {
                  const l = lineaDe(i.productId);
                  const conDescuento = l && (l.discountAmount > 0 || l.unitPrice !== l.listPrice);
                  return (
                    <TableRow key={i.productId}>
                      <TableCell className="font-medium">{i.name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          value={i.quantity}
                          onChange={e => cambiarCantidad(i.productId, Number(e.target.value))}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {l ? (
                          conDescuento ? (
                            <span>
                              <span className="text-muted-foreground line-through">{money(l.listPrice)}</span>{' '}
                              <span className="font-medium">{money(l.unitPrice)}</span>
                            </span>
                          ) : (
                            money(l.listPrice)
                          )
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {l?.promotionName ? <Badge variant="success">{l.promotionName} · −{money(l.discountAmount)}</Badge> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-medium">{l ? money(l.lineTotal) : '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => cambiarCantidad(i.productId, 0)} aria-label={`Quitar ${i.name}`}>
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {quote && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <span>Subtotal: <strong>{money(quote.subtotal)}</strong></span>
              {quote.discountTotal > 0 && <span className="text-emerald-600">Descuentos: <strong>−{money(quote.discountTotal)}</strong></span>}
              <span>IVA: <strong>{money(quote.taxTotal)}</strong></span>
              <span className="text-lg">Total: <strong>{money(quote.total)}</strong></span>
            </div>
            <Button size="lg" onClick={() => setCobrarOpen(true)} disabled={!items.length || quote.withoutPrice.length > 0}>
              <Banknote /> Cobrar {money(quote.total)}
            </Button>
          </CardContent>
        </Card>
      )}

      {quote && quote.withoutPrice.length > 0 && (
        <Alert variant="destructive">
          Sin precio cargado: {quote.withoutPrice.join(', ')}. Cargales un precio antes de vender.
        </Alert>
      )}

      <Dialog open={cobrarOpen} onOpenChange={setCobrarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cobrar {quote ? money(quote.total) : ''}</DialogTitle>
          </DialogHeader>
          <Field label="Forma de pago" htmlFor="pos-payment">
            <Select id="pos-payment" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              {Object.entries(PAGOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <p className="text-sm text-muted-foreground">
            Al confirmar se descuenta el stock y se emite el comprobante. La venta no se puede editar después, sólo anular.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCobrarOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={cobrar} disabled={cobrando}>{cobrando && <Spinner />} Confirmar venta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
