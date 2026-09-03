import { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { PageSpinner, Spinner } from '@/components/spinner';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, type Pagination, type Sale, type SaleDetail } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const PAGOS: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' };
const money = (v: string | number) => `$${Number(v).toFixed(2)}`;
const comprobante = (s: { pointOfSale: string; number: number }) => `${s.pointOfSale}-${String(s.number).padStart(8, '0')}`;
// occurredAt es un timestamp, no una fecha pura: hay que pasarlo a hora local o
// una venta de la noche aparece con la fecha del día siguiente.
const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

export function SalesHistoryPage() {
  const { session, isAdmin } = useAuth();
  const token = session!.accessToken;
  const [items, setItems] = useState<Sale[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [filtros, setFiltros] = useState({ status: '', paymentMethod: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detalle, setDetalle] = useState<SaleDetail | null>(null);
  const [anulando, setAnulando] = useState<Sale | null>(null);
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), pageSize: '20' });
    for (const [k, v] of Object.entries(filtros)) if (v) p.set(k, v);
    return api<{ items: Sale[]; pagination: Pagination }>(`/sales?${p}`, {}, token)
      .then(r => { setItems(r.items); setPagination(r.pagination); })
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [filtros]);
  useEffect(() => { void load(); }, [token, page, filtros]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <PageHeader title="Ventas" description="Comprobantes emitidos. Una venta no se edita: se anula y el stock vuelve." />
      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        </CardContent>
      </Card>

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
                          <Button variant="ghost" size="sm" onClick={() => api<SaleDetail>(`/sales/${s.id}`, {}, token).then(setDetalle).catch(e => setError(errorMessage(e)))}>
                            Ver
                          </Button>
                          {isAdmin && s.status !== 'cancelled' && (
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
                <span className="text-muted-foreground">Pago</span><span>{PAGOS[detalle.paymentMethod] ?? detalle.paymentMethod}</span>
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
              <div className="flex justify-end gap-4">
                {Number(detalle.discountTotal) > 0 && <span className="text-emerald-600">Descuentos: −{money(detalle.discountTotal)}</span>}
                <span>IVA: {money(detalle.taxTotal)}</span>
                <span className="font-semibold">Total: {money(detalle.total)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDetalle(null)}>Cerrar</Button>
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
