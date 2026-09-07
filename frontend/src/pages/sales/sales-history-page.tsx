import { useEffect, useState } from 'react';
import { Receipt } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { ListFilters } from '@/components/list-filters';
import { PageHeader } from '@/components/page-header';
import { ExportMenu } from '@/components/export-menu';
import { VentasChart } from '@/components/ventas-chart';
import { PageSpinner, Spinner } from '@/components/spinner';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, type CreditNote, type Pagination, type Sale, type SaleDetail } from '@/lib/api';
import { money } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';

const PAGOS: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', qr: 'QR', account: 'Cuenta corriente', mixed: 'Varios medios' };
const comprobante = (s: { pointOfSale: string; number: number }) => `${s.pointOfSale}-${String(s.number).padStart(8, '0')}`;
// occurredAt es un timestamp, no una fecha pura: hay que pasarlo a hora local o
// una venta de la noche aparece con la fecha del día siguiente.
const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

const REFUND_LABEL: Record<string, string> = { cash: 'Efectivo del turno', account: 'Crédito a cuenta corriente' };

export function SalesHistoryPage() {
  const { session, can } = useAuth();
  const puedeAnular = can('ventas.anular');
  const puedeDevolver = can('ventas.devolver');
  const token = session!.accessToken;
  const [items, setItems] = useState<Sale[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filtros, setFiltros] = useState({ status: '', paymentMethod: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detalle, setDetalle] = useState<SaleDetail | null>(null);
  const [notas, setNotas] = useState<CreditNote[]>([]);
  const [anulando, setAnulando] = useState<Sale | null>(null);
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [devolver, setDevolver] = useState<SaleDetail | null>(null);
  const [dev, setDev] = useState({ reason: '', refundMethod: 'cash', qty: {} as Record<string, string> });
  const [devSaving, setDevSaving] = useState(false);

  const abrirDetalle = (id: string) => {
    api<SaleDetail>(`/sales/${id}`, {}, token).then(setDetalle).catch(e => setError(errorMessage(e)));
    api<CreditNote[]>(`/sales/${id}/credit-notes`, {}, token).then(setNotas).catch(() => setNotas([]));
  };

  async function confirmarDevolucion() {
    if (!devolver) return;
    setDevSaving(true);
    setError('');
    try {
      const lines = Object.entries(dev.qty)
        .filter(([, q]) => Number(q) > 0)
        .map(([saleLineId, q]) => ({ saleLineId, quantity: Number(q) }));
      if (!lines.length) { setError('Poné una cantidad a devolver en al menos un ítem'); setDevSaving(false); return; }
      await api(`/sales/${devolver.id}/credit-notes`, { method: 'POST', body: JSON.stringify({ reason: dev.reason.trim(), refundMethod: dev.refundMethod, lines }) }, token);
      setDevolver(null);
      setDetalle(null);
      setDev({ reason: '', refundMethod: 'cash', qty: {} });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDevSaving(false);
    }
  }

  const exportParams = { ...filtros, ...(search ? { search } : {}) };

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), pageSize: '20' });
    for (const [k, v] of Object.entries(exportParams)) if (v) p.set(k, v);
    return api<{ items: Sale[]; pagination: Pagination }>(`/sales?${p}`, {}, token)
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

  const activeFilters = [
    filtros.status && { key: 'status', label: filtros.status === 'confirmed' ? 'Confirmadas' : 'Anuladas', clear: () => setFiltros({ ...filtros, status: '' }) },
    filtros.paymentMethod && { key: 'pay', label: PAGOS[filtros.paymentMethod] ?? filtros.paymentMethod, clear: () => setFiltros({ ...filtros, paymentMethod: '' }) },
    filtros.from && { key: 'from', label: `Desde ${filtros.from}`, clear: () => setFiltros({ ...filtros, from: '' }) },
    filtros.to && { key: 'to', label: `Hasta ${filtros.to}`, clear: () => setFiltros({ ...filtros, to: '' }) },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  async function anular() {
    if (!anulando) return;
    setGuardando(true);
    setError('');
    try {
      await api(`/sales/${anulando.id}/cancel`, { method: 'POST', body: JSON.stringify({ reason: motivo.trim() }) }, token);
      setAnulando(null);
      setMotivo('');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Ventas"
        description="Comprobantes emitidos. Una venta no se edita: se anula y el stock vuelve."
        actions={<ExportMenu path="/sales" params={exportParams} filename="ventas" />}
      />
      {error && <Alert variant="destructive">{error}</Alert>}

      <VentasChart />

      <ListFilters
        search={searchInput}
        onSearch={setSearchInput}
        searchPlaceholder="Número de comprobante o cliente"
        searchLabel="Buscar ventas"
        activeFilters={activeFilters}
      >
        <Field label="Estado" htmlFor="f-status">
          <Select id="f-status" value={filtros.status} onChange={e => setFiltros({ ...filtros, status: e.target.value })}>
            <option value="">Todas</option>
            <option value="confirmed">Confirmadas</option>
            <option value="cancelled">Anuladas</option>
          </Select>
        </Field>
        <Field label="Forma de pago" htmlFor="f-pay">
          <Select id="f-pay" value={filtros.paymentMethod} onChange={e => setFiltros({ ...filtros, paymentMethod: e.target.value })}>
            <option value="">Todas</option>
            {Object.entries(PAGOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Desde" htmlFor="f-from">
          <Input id="f-from" type="date" value={filtros.from} onChange={e => setFiltros({ ...filtros, from: e.target.value })} />
        </Field>
        <Field label="Hasta" htmlFor="f-to">
          <Input id="f-to" type="date" value={filtros.to} onChange={e => setFiltros({ ...filtros, to: e.target.value })} />
        </Field>
      </ListFilters>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <PageSpinner />
          ) : items.length === 0 ? (
            <EmptyState icon={Receipt} title="Sin ventas" description="Todavía no se registró ninguna venta con estos filtros." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comprobante</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{comprobante(s)}</TableCell>
                      <TableCell className="whitespace-nowrap">{fechaHora(s.occurredAt)}</TableCell>
                      <TableCell>{s.customerName ?? <span className="text-muted-foreground">Consumidor final</span>}</TableCell>
                      <TableCell>{PAGOS[s.paymentMethod] ?? s.paymentMethod}</TableCell>
                      <TableCell className="text-right font-medium">{money(s.total)}</TableCell>
                      <TableCell>
                        {s.status === 'cancelled' ? <Badge variant="destructive">Anulada</Badge> : <Badge variant="success">Confirmada</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => abrirDetalle(s.id)}>
                            Ver
                          </Button>
                          {puedeAnular && s.status !== 'cancelled' && (
                            <Button variant="outline" size="sm" onClick={() => { setAnulando(s); setMotivo(''); }}>
                              Anular
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t p-3 text-sm">
                  <span className="text-muted-foreground">{pagination.total} ventas</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                    <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Siguiente</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(detalle)} onOpenChange={o => !o && setDetalle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detalle ? `Venta ${comprobante(detalle)}` : ''}</DialogTitle>
          </DialogHeader>
          {detalle && (
            <div className="flex flex-col gap-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Cliente</span><span>{detalle.customerName ?? 'Consumidor final'}</span>
                <span className="text-muted-foreground">Vendedor</span><span>{detalle.userName}</span>
                <span className="text-muted-foreground">Depósito</span><span>{detalle.warehouseName}</span>
                <span className="text-muted-foreground">Pago</span>
                <span>
                  {detalle.payments.map((p, i) => (
                    <span key={i} className="block">
                      {PAGOS[p.method] ?? p.method}: {money(p.amount)}{p.reference ? ` (${p.reference})` : ''}
                    </span>
                  ))}
                </span>
                {detalle.cancelReason && <><span className="text-muted-foreground">Motivo anulación</span><span>{detalle.cancelReason}</span></>}
              </div>
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalle.lines.map(l => (
                      <TableRow key={l.id}>
                        <TableCell>
                          {l.description}
                          {l.promotionName && <Badge variant="success" className="ml-2">{l.promotionName}</Badge>}
                        </TableCell>
                        <TableCell className="text-right">{Number(l.quantity)}</TableCell>
                        <TableCell className="text-right">{money(l.unitPrice)}</TableCell>
                        <TableCell className="text-right">{money(l.lineTotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-wrap justify-end gap-x-4 gap-y-1">
                {Number(detalle.discountTotal) > 0 && <span className="text-emerald-600">Descuentos: −{money(detalle.discountTotal)}</span>}
                <span>IVA: {money(detalle.taxTotal)}</span>
                <span className={Number(detalle.surchargeTotal ?? 0) !== 0 ? '' : 'font-semibold'}>Total mercadería: {money(detalle.total)}</span>
                {Number(detalle.surchargeTotal ?? 0) !== 0 && (
                  <>
                    <span>{Number(detalle.surchargeTotal) > 0 ? 'Recargo por medio de pago' : 'Descuento por medio de pago'}: {Number(detalle.surchargeTotal) > 0 ? '+' : '−'}{money(Math.abs(Number(detalle.surchargeTotal)))}</span>
                    <span className="font-semibold">Cobrado: {money(Number(detalle.total) + Number(detalle.surchargeTotal))}</span>
                  </>
                )}
              </div>

              {notas.length > 0 && (
                <div className="rounded-md border border-border-soft p-3 text-sm">
                  <p className="mb-1 font-medium">Notas de crédito</p>
                  {notas.map(n => (
                    <div key={n.id} className="flex justify-between text-muted-foreground">
                      <span>{n.comprobante} · {n.reason}</span>
                      <span>−{money(n.total)} · {REFUND_LABEL[n.refundMethod] ?? n.refundMethod}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {puedeDevolver && detalle?.status === 'confirmed' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDevolver(detalle);
                  setDev({ reason: '', refundMethod: detalle.customerId ? 'account' : 'cash', qty: {} });
                }}
              >
                Devolver
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setDetalle(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(devolver)} onOpenChange={o => !o && setDevolver(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Devolver {devolver ? comprobante(devolver) : ''}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            El stock devuelto reingresa al depósito y se emite una nota de crédito. La venta original no se toca.
          </p>
          {devolver && (
            <div className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Vendido</TableHead>
                      <TableHead className="text-right">Devolver</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devolver.lines.map(l => (
                      <TableRow key={l.id}>
                        <TableCell>{l.description}</TableCell>
                        <TableCell className="text-right tabular">{Number(l.quantity)}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            max={Number(l.quantity)}
                            step="0.001"
                            className="ml-auto w-24 tabular"
                            value={dev.qty[l.id] ?? ''}
                            onChange={e => setDev(d => ({ ...d, qty: { ...d.qty, [l.id]: e.target.value } }))}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Field label="Reintegro" htmlFor="dev-refund">
                <Select id="dev-refund" value={dev.refundMethod} onChange={e => setDev(d => ({ ...d, refundMethod: e.target.value }))}>
                  <option value="cash">Efectivo del turno</option>
                  <option value="account" disabled={!devolver.customerId}>Crédito a cuenta corriente</option>
                </Select>
              </Field>
              <Field label="Motivo" htmlFor="dev-reason">
                <Input id="dev-reason" required value={dev.reason} onChange={e => setDev(d => ({ ...d, reason: e.target.value }))} placeholder="Producto fallado" />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDevolver(null)}>Cancelar</Button>
            <Button type="button" onClick={confirmarDevolucion} disabled={devSaving || !dev.reason.trim()}>
              {devSaving && <Spinner />} Emitir nota de crédito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(anulando)} onOpenChange={o => !o && setAnulando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular venta {anulando ? comprobante(anulando) : ''}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            El stock vendido vuelve al depósito. La venta queda registrada como anulada, no se borra.
          </p>
          <Field label="Motivo" htmlFor="anular-motivo">
            <Input id="anular-motivo" required value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Devolución del cliente" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAnulando(null)}>Cancelar</Button>
            <Button type="button" onClick={anular} disabled={guardando || !motivo.trim()}>{guardando && <Spinner />} Anular venta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
