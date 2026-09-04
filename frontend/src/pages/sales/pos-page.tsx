import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Barcode, CreditCard, Money, ShoppingCartSimple, Trash, User } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/spinner';
import { api, errorMessage, type Customer, type Product } from '@/lib/api';
import { money } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

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

// El backend acepta un solo medio por venta. El pago dividido (varios medios en
// la misma venta) necesita cambios de modelo; hasta entonces esto es de a uno.
const PAGOS: { id: string; label: string; icon: typeof Money }[] = [
  { id: 'cash', label: 'Efectivo', icon: Money },
  { id: 'transfer', label: 'Transferencia', icon: Barcode },
  { id: 'card', label: 'Tarjeta', icon: CreditCard },
];

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
  const customerRef = useRef<HTMLSelectElement>(null);

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

  const agregar = useCallback(async (codigo: string) => {
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
  }, [token]);

  function cambiarCantidad(productId: string, quantity: number) {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.productId !== productId));
      return;
    }
    setItems(prev => prev.map(i => (i.productId === productId ? { ...i, quantity } : i)));
  }

  // Atajos reales, los que un cajero usa sin soltar el lector. Sólo se declaran
  // los que están implementados: una tecla que no hace nada es peor que ninguna.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'F2') { e.preventDefault(); barcodeRef.current?.focus(); }
      if (e.key === 'F4') { e.preventDefault(); customerRef.current?.focus(); }
      if (e.key === 'F8') {
        e.preventDefault();
        setItems(prev => prev.slice(0, -1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
  const sinPrecio = quote?.withoutPrice ?? [];
  const puedeCobrar = items.length > 0 && sinPrecio.length === 0 && !!quote;
  const clienteElegido = customers.find(c => c.id === customerId);

  return (
    // La caja ocupa la pantalla entera: sin riel, sin encabezado de aplicación.
    // El cajero está acá todo el día y no tiene que ver nada más.
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Esto no es navegación: es el estado del turno, que el cajero necesita
          a la vista permanentemente. */}
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-2.5">
        <p className="font-display text-base font-bold tracking-tight">
          abasto<span className="text-primary">.ai</span>
        </p>
        <span className="h-5 w-px bg-border" aria-hidden="true" />
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className="size-2 rounded-full bg-success" aria-hidden="true" />
          Caja abierta
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/ventas/historial">Ver ventas</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/">Salir</Link>
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_380px]">
        {/* Izquierda: escanear y el carrito. */}
        <div className="flex min-h-0 flex-col gap-3 p-4">
          {aviso && <Alert>{aviso}</Alert>}
          {error && <Alert variant="destructive">{error}</Alert>}
          {sinPrecio.length > 0 && (
            <Alert variant="destructive">
              Sin precio cargado: {sinPrecio.join(', ')}. Cargales un precio desde Precios antes de vender.
            </Alert>
          )}

          {/* El lector es el centro de la pantalla: siempre enfocado, con el
              anillo verde marcando dónde va a caer lo que se escanee. */}
          <div className="flex shrink-0 items-center gap-3 rounded-lg border-2 border-primary bg-card px-4 py-3 ring-4 ring-accent">
            <Barcode weight="bold" className="size-6 shrink-0 text-primary" />
            <input
              ref={barcodeRef}
              autoFocus
              aria-label="Código de barras"
              placeholder="Escaneá o escribí el código"
              className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-placeholder"
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void agregar(barcode);
                }
              }}
            />
            {buscando && <Spinner />}
            <span className="shrink-0 text-sm text-placeholder">
              {items.length === 0 ? 'sin artículos' : `${items.length} ${items.length === 1 ? 'artículo' : 'artículos'}`}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border bg-card">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
                <ShoppingCartSimple className="size-10 text-placeholder" />
                <p className="font-display text-lg font-semibold">Carrito vacío</p>
                <p className="text-sm text-muted-foreground">Escaneá un producto para empezar la venta.</p>
              </div>
            ) : (
              items.map(i => {
                const l = lineaDe(i.productId);
                const conDescuento = l && (l.discountAmount > 0 || l.unitPrice !== l.listPrice);
                return (
                  <div
                    key={i.productId}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b border-border-soft px-4 py-3 last:border-0 sm:grid-cols-[1fr_5rem_7rem_7rem_auto]"
                  >
                    <div className="min-w-0">
                      <p className="font-medium leading-snug">{i.name}</p>
                      <p className="mt-0.5 font-mono text-xs text-placeholder">{i.barcode}</p>
                      {l?.promotionName && (
                        <Badge variant="success" className="mt-1">
                          {l.promotionName} · −{money(l.discountAmount)}
                        </Badge>
                      )}
                    </div>
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      aria-label={`Cantidad de ${i.name}`}
                      value={i.quantity}
                      onChange={e => cambiarCantidad(i.productId, Number(e.target.value))}
                      className="h-9 text-center tabular"
                    />
                    <div className="text-right text-sm tabular">
                      {l ? (
                        conDescuento ? (
                          <>
                            <span className="text-placeholder line-through">{money(l.listPrice)}</span>{' '}
                            <span className="font-medium">{money(l.unitPrice)}</span>
                          </>
                        ) : money(l.listPrice)
                      ) : '—'}
                    </div>
                    <div className="text-right font-semibold tabular">{l ? money(l.lineTotal) : '—'}</div>
                    <Button variant="ghost" size="icon" onClick={() => cambiarCantidad(i.productId, 0)} aria-label={`Quitar ${i.name}`}>
                      <Trash className="size-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 text-sm">
            {[
              { k: 'F2', l: 'Ir al lector' },
              { k: 'F4', l: 'Cliente' },
              { k: 'F8', l: 'Quitar la última' },
            ].map(a => (
              <span key={a.k} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 font-medium">
                <kbd className="rounded border border-border px-1 font-mono text-xs text-placeholder">{a.k}</kbd>
                {a.l}
              </span>
            ))}
          </div>
        </div>

        {/* Derecha: a quién se le vende, cuánto, y cómo paga. */}
        <aside className="flex min-h-0 flex-col overflow-y-auto border-border bg-card lg:border-l">
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
            <User className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <Select
                ref={customerRef}
                aria-label="Cliente"
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                className="h-8 border-0 bg-transparent px-0 font-semibold shadow-none focus-visible:ring-0"
              >
                <option value="">Consumidor final</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              <p className="truncate text-xs text-placeholder">
                {quote?.priceList ? `Lista ${quote.priceList.name}` : clienteElegido?.priceListName ?? 'Lista mostrador'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 border-b border-border px-4 py-4">
            <div className="flex justify-between text-sm text-muted-foreground tabular">
              <span>Subtotal</span><span>{quote ? money(quote.subtotal) : money(0)}</span>
            </div>
            {quote && quote.discountTotal > 0 && (
              <div className="flex justify-between text-sm text-primary tabular">
                <span>Descuentos</span><span>−{money(quote.discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-muted-foreground tabular">
              <span>IVA incluido</span><span>{quote ? money(quote.taxTotal) : money(0)}</span>
            </div>
            <div className="mt-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-placeholder">Total a cobrar</p>
              <p className="font-display text-[2.75rem] font-bold leading-none tracking-tight tabular">
                {quote ? money(quote.total) : money(0)}
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-placeholder">Medio de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {PAGOS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPaymentMethod(p.id)}
                  aria-pressed={paymentMethod === p.id}
                  className={cn(
                    'flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors',
                    paymentMethod === p.id
                      ? 'border-primary bg-accent font-semibold text-accent-foreground'
                      : 'border-border bg-background font-medium hover:border-accent-border',
                  )}
                >
                  <p.icon weight={paymentMethod === p.id ? 'fill' : 'regular'} className="size-4 shrink-0" />
                  {p.label}
                </button>
              ))}
            </div>

            <Button
              size="lg"
              className="mt-auto h-14 font-display text-lg font-bold"
              onClick={() => setCobrarOpen(true)}
              disabled={!puedeCobrar}
            >
              Cobrar {quote ? money(quote.total) : ''}
            </Button>
          </div>
        </aside>
      </div>

      <Dialog open={cobrarOpen} onOpenChange={setCobrarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cobrar {quote ? money(quote.total) : ''}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {PAGOS.find(p => p.id === paymentMethod)?.label} · {clienteElegido?.name ?? 'Consumidor final'}
          </p>
          <p className="text-sm text-muted-foreground">
            Al confirmar se descuenta el stock y se emite el comprobante. La venta no se puede editar después, sólo anular.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCobrarOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={cobrar} disabled={cobrando}>{cobrando && <Spinner />} Confirmar venta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
