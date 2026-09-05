import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowCircleDown, ArrowCircleUp, Barcode, CreditCard, Lock, Money, Percent, QrCode,
  Receipt, ShoppingCartSimple, Trash, User, Wallet,
} from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/field';
import { ProductSearchDialog } from '@/components/product-search-dialog';
import { SupervisorAuthDialog } from '@/components/supervisor-auth-dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner, PageSpinner } from '@/components/spinner';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  api, errorMessage, type CashRegister, type CashShift, type Customer, type CustomerAccount,
  type PaymentMethod, type Product, type Promotion,
} from '@/lib/api';
import { money } from '@/lib/format';
import { parseWeighedBarcode } from '@/lib/pesable';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

type Item = { productId: string; name: string; barcode: string; quantity: number; pesable?: boolean };

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

type Pago = { method: PaymentMethod; amount: string; reference: string };

const PAGOS: { id: PaymentMethod; label: string; icon: typeof Money }[] = [
  { id: 'cash', label: 'Efectivo', icon: Money },
  { id: 'transfer', label: 'Transferencia', icon: Barcode },
  { id: 'card', label: 'Tarjeta', icon: CreditCard },
  { id: 'qr', label: 'QR', icon: QrCode },
  { id: 'account', label: 'Cuenta corriente', icon: Wallet },
];

const MOVIMIENTOS: { id: 'deposit' | 'withdrawal' | 'expense'; label: string }[] = [
  { id: 'deposit', label: 'Ingreso (cambio)' },
  { id: 'withdrawal', label: 'Retiro a caja fuerte' },
  { id: 'expense', label: 'Gasto menor' },
];

/** Texto legible de la promoción: en el mostrador nadie lee un JSON. */
function describirPromo(p: Promotion) {
  const c = p.config;
  switch (p.type) {
    case 'nxm': return `Llevá ${c.n}, pagá ${c.m}`;
    case 'a_plus_b': return `Comprá ${c.buyQty}, llevate ${c.getQty} de regalo`;
    case 'percent': return c.desdeUnidad > 1 ? `${c.percent}% off desde la unidad ${c.desdeUnidad}` : `${c.percent}% de descuento`;
    case 'amount': return `${money(c.amount)} de descuento`;
    case 'special_price': return `Precio especial ${money(c.price)}`;
    default: return '';
  }
}

/** Vigente hoy: activa y dentro de su ventana de fechas. */
function vigente(p: Promotion) {
  if (!p.isActive) return false;
  const hoy = Date.now();
  if (new Date(p.validFrom).getTime() > hoy) return false;
  if (p.validTo && new Date(p.validTo).getTime() < hoy) return false;
  return true;
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export function PosPage() {
  const { session, can } = useAuth();
  const puedeAutorizarAnulacion = can('caja.autorizar_anulacion');
  const token = session!.accessToken;
  const [items, setItems] = useState<Item[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [customerAccount, setCustomerAccount] = useState<CustomerAccount | null>(null);
  const [barcode, setBarcode] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [cobrando, setCobrando] = useState(false);
  const [cobrarOpen, setCobrarOpen] = useState(false);
  const [pagos, setPagos] = useState<Pago[]>([{ method: 'cash', amount: '', reference: '' }]);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const customerRef = useRef<HTMLSelectElement>(null);

  // Turno de caja: sin uno abierto no se puede vender. Es lo primero que se
  // resuelve al entrar; mientras se resuelve, la pantalla no muestra nada.
  const [shift, setShift] = useState<CashShift | null | undefined>(undefined);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [selectedRegisterId, setSelectedRegisterId] = useState('');
  const [openingCash, setOpeningCash] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState('');

  // Panel de caja (F7): movimientos de efectivo y cierre con arqueo.
  const [cajaOpen, setCajaOpen] = useState(false);
  const [cajaView, setCajaView] = useState<'panel' | 'cerrar' | 'resultado'>('panel');
  const [movType, setMovType] = useState<'deposit' | 'withdrawal' | 'expense'>('deposit');
  const [movAmount, setMovAmount] = useState('');
  const [movReason, setMovReason] = useState('');
  const [movSaving, setMovSaving] = useState(false);
  const [movError, setMovError] = useState('');
  const [countedCash, setCountedCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [closing, setClosing] = useState(false);
  const [closeResult, setCloseResult] = useState<CashShift | null>(null);

  // Anular un ítem del carrito: un cajero no-supervisor necesita que un
  // supervisor lo autorice con sus propias credenciales.
  const [supervisorOpen, setSupervisorOpen] = useState(false);
  const pendingVoidRef = useRef<(() => void) | null>(null);

  // Buscador (F3): sirve para las dos consultas del mostrador — "¿cuánto sale
  // esto?" mirándolo, y "el código no lee" con Agregar.
  const [buscarOpen, setBuscarOpen] = useState(false);

  // Ofertas del día (F6): el cajero tiene que poder responder "¿qué promos hay?"
  // sin salir de la caja.
  const [ofertasOpen, setOfertasOpen] = useState(false);
  const [promos, setPromos] = useState<Promotion[]>([]);

  const cargarTurno = useCallback(() => {
    return api<CashShift | null>('/cash-shifts/current', {}, token).then(setShift).catch(() => setShift(null));
  }, [token]);

  useEffect(() => { void cargarTurno(); }, [cargarTurno]);

  useEffect(() => {
    api<Customer[]>('/customers', {}, token).then(setCustomers).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (shift !== null || !session?.user.warehouseId) return;
    api<CashRegister[]>(`/cash-registers?warehouseId=${session.user.warehouseId}`, {}, token).then(regs => {
      setRegisters(regs);
      if (regs.length === 1) setSelectedRegisterId(regs[0].id);
    }).catch(() => {});
  }, [shift, session?.user.warehouseId, token]);

  // El foco vuelve siempre al lector: es una pantalla de mostrador, se opera
  // escaneando uno atrás de otro sin tocar el mouse.
  useEffect(() => {
    if (shift) barcodeRef.current?.focus();
  }, [items.length, shift]);

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

  // El saldo de cuenta corriente del cliente elegido: contexto para decidir si
  // conviene pagarle a cuenta, y cuánto le queda disponible.
  useEffect(() => {
    if (!customerId) { setCustomerAccount(null); return; }
    let cancelado = false;
    api<CustomerAccount>(`/customers/${customerId}/account`, {}, token)
      .then(c => { if (!cancelado) setCustomerAccount(c); })
      .catch(() => { if (!cancelado) setCustomerAccount(null); });
    return () => { cancelado = true; };
  }, [customerId, token]);

  useEffect(() => {
    if (!ofertasOpen) return;
    api<Promotion[]>('/promotions', {}, token).then(setPromos).catch(() => {});
  }, [ofertasOpen, token]);

  const agregar = useCallback(async (codigo: string) => {
    const limpio = codigo.trim();
    if (!limpio) return;
    setBuscando(true);
    setError('');
    try {
      // Un código de balanza no es el barcode del producto: trae el peso
      // embebido y hay que resolver el producto por su código interno.
      const pesado = parseWeighedBarcode(limpio);
      if (pesado) {
        const rp = await api<{ items: Product[] }>(`/products?internalCode=${encodeURIComponent(pesado.internalCode)}`, {}, token);
        const p = rp.items.find(x => x.isWeighed);
        if (p) {
          setItems(prev => [...prev, { productId: p.id, name: p.name, barcode: p.barcode, quantity: pesado.weightKg, pesable: true }]);
          setBarcode('');
          return;
        }
      }
      const r = await api<{ items: Product[] }>(`/products?barcode=${encodeURIComponent(limpio)}`, {}, token);
      const p = r.items[0];
      if (!p) {
        setError(`No hay ningún producto con el código ${limpio}`);
        return;
      }
      setItems(prev => {
        const existente = prev.find(i => i.productId === p.id && !i.pesable);
        if (existente) return prev.map(i => (i === existente ? { ...i, quantity: i.quantity + 1 } : i));
        return [...prev, { productId: p.id, name: p.name, barcode: p.barcode, quantity: 1 }];
      });
      setBarcode('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBuscando(false);
    }
  }, [token]);

  /** Un cajero normal necesita que un supervisor apruebe antes de anular una línea; un supervisor lo hace directo. */
  function pedirAutorizacion(accion: () => void) {
    if (puedeAutorizarAnulacion) { accion(); return; }
    pendingVoidRef.current = accion;
    setSupervisorOpen(true);
  }

  function cambiarCantidad(productId: string, quantity: number) {
    if (quantity <= 0) {
      pedirAutorizacion(() => setItems(prev => prev.filter(i => i.productId !== productId)));
      return;
    }
    setItems(prev => prev.map(i => (i.productId === productId ? { ...i, quantity } : i)));
  }

  function quitarUltima() {
    if (!items.length) return;
    pedirAutorizacion(() => setItems(prev => prev.slice(0, -1)));
  }

  // Atajos reales, los que un cajero usa sin soltar el lector. Sólo se declaran
  // los que están implementados: una tecla que no hace nada es peor que ninguna.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'F3') { e.preventDefault(); setBuscarOpen(true); }
      if (e.key === 'F4') { e.preventDefault(); customerRef.current?.focus(); }
      if (e.key === 'F6') { e.preventDefault(); setOfertasOpen(true); }
      if (e.key === 'F7') { e.preventDefault(); setCajaView('panel'); setCajaOpen(true); }
      if (e.key === 'F8') { e.preventDefault(); quitarUltima(); }
      // Escape devuelve al lector, que es el estado de reposo de la pantalla.
      if (e.key === 'Escape') barcodeRef.current?.focus();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items.length, puedeAutorizarAnulacion]); // eslint-disable-line react-hooks/exhaustive-deps

  function agregarDesdeBusqueda(p: Product) {
    setItems(prev => {
      const existente = prev.find(i => i.productId === p.id && !i.pesable);
      if (existente) return prev.map(i => (i === existente ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { productId: p.id, name: p.name, barcode: p.barcode, quantity: 1 }];
    });
    setBuscarOpen(false);
  }

  function abrirCobrar() {
    if (!quote) return;
    setPagos([{ method: pagos[0]?.method ?? 'cash', amount: quote.total.toFixed(2), reference: '' }]);
    setCobrarOpen(true);
  }

  function elegirMedioPrincipal(m: PaymentMethod) {
    setPagos([{ method: m, amount: quote ? quote.total.toFixed(2) : '', reference: '' }]);
  }

  function agregarPago() {
    const usados = new Set(pagos.map(p => p.method));
    const libre = PAGOS.find(p => !usados.has(p.id) && (p.id !== 'account' || customerId))?.id ?? 'cash';
    const sumado = pagos.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const resto = Math.max(0, (quote?.total ?? 0) - sumado);
    setPagos(prev => [...prev, { method: libre, amount: resto ? resto.toFixed(2) : '', reference: '' }]);
  }

  function actualizarPago(i: number, cambios: Partial<Pago>) {
    setPagos(prev => prev.map((p, idx) => (idx === i ? { ...p, ...cambios } : p)));
  }

  function quitarPago(i: number) {
    setPagos(prev => prev.filter((_, idx) => idx !== i));
  }

  const sumaPagos = pagos.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const restante = Math.round(((quote?.total ?? 0) - sumaPagos) * 100) / 100;
  const usaCtaCte = pagos.some(p => p.method === 'account');
  const puedeConfirmar = Math.abs(restante) < 0.01 && (!usaCtaCte || !!customerId) && pagos.every(p => Number(p.amount) > 0);

  async function cobrar() {
    setCobrando(true);
    setError('');
    try {
      const venta = await api<{ pointOfSale: string; number: number; total: string }>('/sales', {
        method: 'POST',
        body: JSON.stringify({
          customerId: customerId || undefined,
          lines: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
          payments: pagos.map(p => ({ method: p.method, amount: Number(p.amount), reference: p.reference || undefined })),
        }),
      }, token);
      setCobrarOpen(false);
      setItems([]);
      setQuote(null);
      setAviso(`Venta ${venta.pointOfSale}-${String(venta.number).padStart(8, '0')} cobrada por ${money(Number(venta.total))}.`);
      // Si se pagó a cuenta corriente, el saldo mostrado quedó viejo.
      if (customerId) api<CustomerAccount>(`/customers/${customerId}/account`, {}, token).then(setCustomerAccount).catch(() => {});
    } catch (err) {
      setError(errorMessage(err));
      setCobrarOpen(false);
    } finally {
      setCobrando(false);
    }
  }

  async function abrirTurno() {
    setOpening(true);
    setOpenError('');
    try {
      const turno = await api<CashShift>('/cash-shifts/open', {
        method: 'POST',
        body: JSON.stringify({ cashRegisterId: selectedRegisterId, openingCash: Number(openingCash) || 0, openingNotes: openingNotes || undefined }),
      }, token);
      setShift(turno);
      setOpeningCash('');
      setOpeningNotes('');
    } catch (err) {
      setOpenError(errorMessage(err));
    } finally {
      setOpening(false);
    }
  }

  async function agregarMovimiento() {
    if (!shift) return;
    setMovSaving(true);
    setMovError('');
    try {
      await api(`/cash-shifts/${shift.id}/movements`, {
        method: 'POST',
        body: JSON.stringify({ type: movType, amount: Number(movAmount), reason: movReason }),
      }, token);
      const actualizado = await api<CashShift>(`/cash-shifts/${shift.id}`, {}, token);
      setShift(actualizado);
      setMovAmount('');
      setMovReason('');
    } catch (err) {
      setMovError(errorMessage(err));
    } finally {
      setMovSaving(false);
    }
  }

  async function cerrarTurno() {
    if (!shift) return;
    setClosing(true);
    setMovError('');
    try {
      const cerrado = await api<CashShift>(`/cash-shifts/${shift.id}/close`, {
        method: 'POST',
        body: JSON.stringify({ countedCash: Number(countedCash) || 0, closingNotes: closingNotes || undefined }),
      }, token);
      setCloseResult(cerrado);
      setCajaView('resultado');
    } catch (err) {
      setMovError(errorMessage(err));
    } finally {
      setClosing(false);
    }
  }

  function terminarCierre() {
    setShift(null);
    setCajaOpen(false);
    setCajaView('panel');
    setCloseResult(null);
    setCountedCash('');
    setClosingNotes('');
  }

  const lineaDe = (productId: string) => quote?.lines.find(l => l.productId === productId);
  const sinPrecio = quote?.withoutPrice ?? [];
  const puedeCobrar = items.length > 0 && sinPrecio.length === 0 && !!quote;
  const clienteElegido = customers.find(c => c.id === customerId);

  if (shift === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <PageSpinner />
      </div>
    );
  }

  // Sin turno abierto no hay caja: se pide abrir uno antes de mostrar el
  // mostrador. Es lo primero del día para un cajero.
  if (!shift) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-background p-4">
        <p className="font-display text-2xl font-bold tracking-tight">
          abasto<span className="text-primary">.ai</span>
        </p>
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2.5">
            <Wallet weight="fill" className="size-5 text-primary" />
            <h1 className="font-display text-lg font-bold">Abrir turno</h1>
          </div>
          {!session?.user.warehouseId ? (
            <Alert variant="destructive">Tu usuario no tiene una sucursal asignada. Pedile a un administrador que te la asigne en Usuarios.</Alert>
          ) : registers.length === 0 ? (
            <Alert variant="destructive">No hay cajas configuradas en tu sucursal.</Alert>
          ) : (
            <div className="flex flex-col gap-4">
              {openError && <Alert variant="destructive">{openError}</Alert>}
              {registers.length > 1 && (
                <Field label="Caja" htmlFor="reg">
                  <Select id="reg" value={selectedRegisterId} onChange={e => setSelectedRegisterId(e.target.value)}>
                    <option value="">Elegí una caja</option>
                    {registers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </Select>
                </Field>
              )}
              <Field label="Fondo inicial" htmlFor="fondo" hint="con lo que arranca el cajón">
                <Input id="fondo" type="number" min="0" step="0.01" autoFocus value={openingCash} onChange={e => setOpeningCash(e.target.value)} />
              </Field>
              <Field label="Notas" htmlFor="notas-apertura" hint="(opcional)">
                <Input id="notas-apertura" value={openingNotes} onChange={e => setOpeningNotes(e.target.value)} />
              </Field>
              <Button size="lg" className="h-12" disabled={!selectedRegisterId || opening} onClick={abrirTurno}>
                {opening && <Spinner />} Abrir turno
              </Button>
            </div>
          )}
          <Link to="/" className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground">Volver</Link>
        </div>
      </div>
    );
  }

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
        <button type="button" onClick={() => { setCajaView('panel'); setCajaOpen(true); }} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm font-medium transition-colors hover:bg-secondary">
          <span className="size-2 rounded-full bg-success" aria-hidden="true" />
          {shift.cashRegister?.name ?? 'Caja'} · abierta {fmtHora(shift.openedAt)}
        </button>
        <div className="ml-auto flex items-center gap-2">
          {/* El cajero pasa el turno entero mirando esta pantalla y no tiene el
              riel a mano: el tema tiene que estar acá. */}
          <ThemeToggle className="hover:bg-secondary" />
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
              items.map((i, idx) => {
                const l = lineaDe(i.productId);
                const conDescuento = l && (l.discountAmount > 0 || l.unitPrice !== l.listPrice);
                return (
                  <div
                    key={`${i.productId}-${idx}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b border-border-soft px-4 py-3 last:border-0 sm:grid-cols-[1fr_5rem_7rem_7rem_auto]"
                  >
                    <div className="min-w-0">
                      <p className="font-medium leading-snug">{i.name}</p>
                      <p className="mt-0.5 font-mono text-xs text-placeholder">{i.barcode}</p>
                      {i.pesable && <Badge variant="secondary" className="mt-1">Pesable · {i.quantity.toFixed(3)} kg</Badge>}
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
              { k: 'F3', l: 'Buscar producto', go: () => { setBuscarOpen(true); } },
              { k: 'F4', l: 'Cliente', go: () => customerRef.current?.focus() },
              { k: 'F6', l: 'Ofertas del día', go: () => setOfertasOpen(true) },
              { k: 'F7', l: 'Caja', go: () => { setCajaView('panel'); setCajaOpen(true); } },
              { k: 'F8', l: 'Quitar la última', go: quitarUltima },
            ].map(a => (
              <button
                key={a.k}
                type="button"
                onClick={a.go}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 font-medium transition-colors hover:border-accent-border hover:bg-subtle"
              >
                <kbd className="rounded border border-border px-1 font-mono text-xs text-placeholder">{a.k}</kbd>
                {a.l}
              </button>
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
                {customerAccount && (customerAccount.balance !== 0 || customerAccount.creditLimit !== null) && (
                  <> · Cta cte {money(customerAccount.balance)}{customerAccount.available !== null ? ` (disp. ${money(customerAccount.available)})` : ''}</>
                )}
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
            {/* El precio de lista es neto: el IVA se suma para llegar al total,
                no viene adentro. Decir "incluido" acá haría que el total no
                cierre contra el subtotal. */}
            <div className="flex justify-between text-sm text-muted-foreground tabular">
              <span>IVA</span><span>+ {quote ? money(quote.taxTotal) : money(0)}</span>
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
              {PAGOS.map(p => {
                const bloqueado = p.id === 'account' && !customerId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={bloqueado}
                    title={bloqueado ? 'Elegí un cliente primero' : undefined}
                    onClick={() => elegirMedioPrincipal(p.id)}
                    aria-pressed={pagos.length === 1 && pagos[0].method === p.id}
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                      pagos.length === 1 && pagos[0].method === p.id
                        ? 'border-primary bg-accent font-semibold text-accent-foreground'
                        : 'border-border bg-background font-medium hover:border-accent-border',
                    )}
                  >
                    <p.icon weight={pagos.length === 1 && pagos[0].method === p.id ? 'fill' : 'regular'} className="size-4 shrink-0" />
                    {p.label}
                  </button>
                );
              })}
            </div>

            <Button
              size="lg"
              className="mt-auto h-14 font-display text-lg font-bold"
              onClick={abrirCobrar}
              disabled={!puedeCobrar}
            >
              Cobrar {quote ? money(quote.total) : ''}
            </Button>
          </div>
        </aside>
      </div>

      <ProductSearchDialog
        open={buscarOpen}
        onOpenChange={setBuscarOpen}
        onPick={agregarDesdeBusqueda}
        cotizarPara={customerId}
        exigirPrecio
        token={token}
      />

      <SupervisorAuthDialog
        open={supervisorOpen}
        onOpenChange={setSupervisorOpen}
        token={token}
        reason="Un cajero necesita que un supervisor autorice anular un ítem del carrito."
        onAuthorized={nombre => {
          pendingVoidRef.current?.();
          pendingVoidRef.current = null;
          setAviso(`Anulación autorizada por ${nombre}.`);
        }}
      />

      <Dialog open={ofertasOpen} onOpenChange={setOfertasOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ofertas del día</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {promos.filter(vigente).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Hoy no hay promociones vigentes.</p>
            ) : (
              promos.filter(vigente).map(p => (
                <div key={p.id} className="flex items-start gap-3 rounded-md border border-border px-3 py-2.5">
                  <Percent weight="fill" className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{describirPromo(p)}</p>
                    <p className="mt-0.5 text-xs text-placeholder">
                      {p.scopeType === 'all' ? 'Todos los productos' : p.scopeType === 'brand' ? `Marca ${p.scopeValue}` : 'Una categoría'}
                      {p.validTo ? ` · hasta el ${p.validTo.slice(0, 10)}` : ' · sin fecha de fin'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <p className="text-xs text-placeholder">
            Las promociones se aplican solas al cobrar. Esto es para poder responder en el mostrador.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfertasOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cobrarOpen} onOpenChange={setCobrarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cobrar {quote ? money(quote.total) : ''}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{clienteElegido?.name ?? 'Consumidor final'}</p>

          <div className="flex flex-col gap-2">
            {pagos.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select
                  aria-label="Medio de pago"
                  value={p.method}
                  onChange={e => actualizarPago(i, { method: e.target.value as PaymentMethod })}
                  className="w-40 shrink-0"
                >
                  {PAGOS.map(pg => <option key={pg.id} value={pg.id} disabled={pg.id === 'account' && !customerId}>{pg.label}</option>)}
                </Select>
                <Input
                  type="number" min="0" step="0.01" aria-label="Monto"
                  value={p.amount} onChange={e => actualizarPago(i, { amount: e.target.value })}
                  className="tabular"
                />
                {p.method !== 'cash' && p.method !== 'account' && (
                  <Input
                    placeholder="Cupón / referencia" aria-label="Referencia"
                    value={p.reference} onChange={e => actualizarPago(i, { reference: e.target.value })}
                    className="w-36 shrink-0"
                  />
                )}
                {pagos.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => quitarPago(i)} aria-label="Quitar este pago">
                    <Trash className="size-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={agregarPago} disabled={pagos.length >= PAGOS.length}>
              Agregar otro medio
            </Button>
          </div>

          {usaCtaCte && customerAccount?.available !== null && customerAccount && (
            <p className="text-xs text-placeholder">Disponible en la cuenta corriente: {money(customerAccount.available ?? 0)}</p>
          )}
          {Math.abs(restante) >= 0.01 && (
            <Alert variant="destructive">
              {restante > 0 ? `Falta cubrir ${money(restante)}.` : `Los pagos suman ${money(-restante)} de más.`}
            </Alert>
          )}

          <p className="text-sm text-muted-foreground">
            Al confirmar se descuenta el stock y se emite el comprobante. La venta no se puede editar después, sólo anular.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCobrarOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={cobrar} disabled={cobrando || !puedeConfirmar}>{cobrando && <Spinner />} Confirmar venta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Panel de caja: movimientos de efectivo y cierre con arqueo (F7). */}
      <Dialog open={cajaOpen} onOpenChange={o => { setCajaOpen(o); if (!o) { setCajaView('panel'); setMovError(''); } }}>
        <DialogContent className="max-w-lg">
          {cajaView === 'panel' && (
            <>
              <DialogHeader>
                <DialogTitle>{shift.cashRegister?.name ?? 'Caja'}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Abierta {fmtHora(shift.openedAt)} por {shift.openedByName} · fondo inicial {money(Number(shift.openingCash))}
                {shift.openingNotes ? ` · ${shift.openingNotes}` : ''}
              </p>

              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-placeholder">Movimientos del turno</p>
                <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                  {!shift.movements?.length ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">Sin movimientos todavía.</p>
                  ) : (
                    shift.movements.map(m => (
                      <div key={m.id} className="flex items-center gap-2 border-b border-border-soft px-3 py-2 text-sm last:border-0">
                        {m.type === 'deposit' ? <ArrowCircleDown className="size-4 shrink-0 text-success" /> : m.type === 'withdrawal' ? <ArrowCircleUp className="size-4 shrink-0 text-warning" /> : <Receipt className="size-4 shrink-0 text-muted-foreground" />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{m.reason}</p>
                          <p className="text-xs text-placeholder">{fmtHora(m.occurredAt)} · {m.userName}</p>
                        </div>
                        <span className="shrink-0 font-medium tabular">{m.type === 'withdrawal' || m.type === 'expense' ? '−' : '+'}{money(Number(m.amount))}</span>
                      </div>
                    ))
                  )}
                </div>
                {movError && <Alert variant="destructive">{movError}</Alert>}
                <div className="flex items-center gap-2">
                  <Select aria-label="Tipo de movimiento" value={movType} onChange={e => setMovType(e.target.value as typeof movType)} className="w-44 shrink-0">
                    {MOVIMIENTOS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </Select>
                  <Input type="number" min="0" step="0.01" placeholder="Monto" aria-label="Monto del movimiento" value={movAmount} onChange={e => setMovAmount(e.target.value)} className="w-28 shrink-0" />
                  <Input placeholder="Motivo" aria-label="Motivo" value={movReason} onChange={e => setMovReason(e.target.value)} />
                  <Button type="button" size="sm" disabled={movSaving || !movAmount || !movReason} onClick={agregarMovimiento}>
                    {movSaving && <Spinner />} Registrar
                  </Button>
                </div>
              </div>

              <DialogFooter className="justify-between sm:justify-between">
                <Button type="button" variant="destructive" onClick={() => setCajaView('cerrar')}>
                  <Lock /> Cerrar turno
                </Button>
                <Button type="button" variant="outline" onClick={() => setCajaOpen(false)}>Cerrar panel</Button>
              </DialogFooter>
            </>
          )}

          {cajaView === 'cerrar' && (
            <>
              <DialogHeader>
                <DialogTitle>Cierre de turno · arqueo</DialogTitle>
              </DialogHeader>
              {movError && <Alert variant="destructive">{movError}</Alert>}
              <p className="text-sm text-muted-foreground">Contá el efectivo del cajón y anotalo. El sistema calcula la diferencia con lo que debería haber.</p>
              <Field label="Efectivo contado" htmlFor="contado">
                <Input id="contado" type="number" min="0" step="0.01" autoFocus value={countedCash} onChange={e => setCountedCash(e.target.value)} />
              </Field>
              <Field label="Notas" htmlFor="notas-cierre" hint="(opcional)">
                <Input id="notas-cierre" value={closingNotes} onChange={e => setClosingNotes(e.target.value)} />
              </Field>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCajaView('panel')}>Volver</Button>
                <Button type="button" variant="destructive" disabled={closing || !countedCash} onClick={cerrarTurno}>
                  {closing && <Spinner />} Cerrar turno
                </Button>
              </DialogFooter>
            </>
          )}

          {cajaView === 'resultado' && closeResult && (
            <>
              <DialogHeader>
                <DialogTitle>Turno cerrado</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-placeholder">Esperado</p>
                  <p className="font-semibold tabular">{money(Number(closeResult.expectedCash))}</p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-placeholder">Contado</p>
                  <p className="font-semibold tabular">{money(Number(closeResult.countedCash))}</p>
                </div>
              </div>
              <div className={cn('rounded-md border p-3', Number(closeResult.cashDifference) === 0 ? 'border-success bg-success/10' : 'border-warning bg-warning/10')}>
                <p className="text-xs text-placeholder">Diferencia</p>
                <p className="font-semibold tabular">
                  {Number(closeResult.cashDifference) > 0 ? 'Sobrante ' : Number(closeResult.cashDifference) < 0 ? 'Faltante ' : ''}
                  {money(Math.abs(Number(closeResult.cashDifference)))}
                </p>
              </div>
              {!!closeResult.totalsByMethod?.length && (
                <div className="flex flex-col gap-1 text-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-placeholder">Por medio de pago</p>
                  {closeResult.totalsByMethod.map(t => (
                    <div key={t.method} className="flex justify-between tabular">
                      <span className="capitalize text-muted-foreground">{PAGOS.find(p => p.id === t.method)?.label ?? t.method}</span>
                      <span>{money(t.total)}</span>
                    </div>
                  ))}
                </div>
              )}
              <DialogFooter>
                <Button type="button" onClick={terminarCierre}>Entendido</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
