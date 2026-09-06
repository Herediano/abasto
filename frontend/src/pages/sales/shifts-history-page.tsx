import { useEffect, useState } from 'react';
import { Vault } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { PageSpinner } from '@/components/spinner';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, type CashShift, type Pagination } from '@/lib/api';
import { money } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';

const PAGOS: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', qr: 'QR', account: 'Cuenta corriente' };
const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Todas las cajas de la sucursal, para el supervisor: quién abrió y cerró
 * cada turno, con qué fondo y qué diferencia dejó el arqueo. El cajero ve la
 * suya desde la propia pantalla de caja (F7); esto es la vista de encima.
 */
export function ShiftsHistoryPage() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [items, setItems] = useState<CashShift[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detalle, setDetalle] = useState<CashShift | null>(null);

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (status) p.set('status', status);
    api<{ items: CashShift[]; pagination: Pagination }>(`/cash-shifts?${p}`, {}, token)
      .then(r => { setItems(r.items); setPagination(r.pagination); })
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [token, page, status]);

  return (
    <>
      <PageHeader title="Turnos de caja" description="Apertura, cierre y arqueo de cada turno, en todas las cajas de la sucursal." />
      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Estado" htmlFor="f-status">
            <Select id="f-status" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">Todos</option>
              <option value="open">Abiertos</option>
              <option value="closed">Cerrados</option>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <PageSpinner />
          ) : items.length === 0 ? (
            <EmptyState icon={Vault} title="Sin turnos" description="Todavía no se abrió ningún turno con estos filtros." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Caja</TableHead>
                    <TableHead>Abierto por</TableHead>
                    <TableHead>Apertura</TableHead>
                    <TableHead>Cierre</TableHead>
                    <TableHead className="text-right">Fondo</TableHead>
                    <TableHead className="text-right">Diferencia</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.cashRegisterName ?? s.cashRegisterId}</TableCell>
                      <TableCell>{s.openedByName}</TableCell>
                      <TableCell className="whitespace-nowrap">{fechaHora(s.openedAt)}</TableCell>
                      <TableCell className="whitespace-nowrap">{s.closedAt ? fechaHora(s.closedAt) : '—'}</TableCell>
                      <TableCell className="text-right tabular">{money(Number(s.openingCash))}</TableCell>
                      <TableCell className="text-right tabular">
                        {s.cashDifference == null ? '—' : (
                          <span className={Number(s.cashDifference) === 0 ? '' : 'font-medium text-warning'}>{money(Number(s.cashDifference))}</span>
                        )}
                      </TableCell>
                      <TableCell>{s.status === 'open' ? <Badge variant="success">Abierto</Badge> : <Badge variant="secondary">Cerrado</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => api<CashShift>(`/cash-shifts/${s.id}`, {}, token).then(setDetalle).catch(e => setError(errorMessage(e)))}>
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t p-3 text-sm">
                  <span className="text-muted-foreground">{pagination.total} turnos</span>
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
            <DialogTitle>{detalle?.cashRegister?.name} · {detalle && fechaHora(detalle.openedAt)}</DialogTitle>
          </DialogHeader>
          {detalle && (
            <div className="flex flex-col gap-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Abrió</span><span>{detalle.openedByName}</span>
                <span className="text-muted-foreground">Cerró</span><span>{detalle.closedByName ?? '—'}</span>
                <span className="text-muted-foreground">Fondo inicial</span><span className="tabular">{money(Number(detalle.openingCash))}</span>
                <span className="text-muted-foreground">Ventas</span><span>{detalle.salesCount ?? 0}</span>
              </div>
              {detalle.status === 'closed' && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs text-placeholder">Esperado</p>
                    <p className="font-semibold tabular">{money(Number(detalle.expectedCash))}</p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs text-placeholder">Contado</p>
                    <p className="font-semibold tabular">{money(Number(detalle.countedCash))}</p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs text-placeholder">Diferencia</p>
                    <p className="font-semibold tabular">{money(Number(detalle.cashDifference))}</p>
                  </div>
                </div>
              )}
              {!!detalle.totalsByMethod?.length && (
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] font-semibold text-placeholder">Por medio de pago</p>
                  {detalle.totalsByMethod.map(t => (
                    <div key={t.method} className="flex justify-between tabular">
                      <span className="text-muted-foreground">{PAGOS[t.method] ?? t.method}</span>
                      <span>{money(t.total)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-1">
                <p className="text-[11px] font-semibold text-placeholder">Movimientos de efectivo</p>
                {!detalle.movements?.length ? (
                  <p className="text-muted-foreground">Sin movimientos.</p>
                ) : (
                  detalle.movements.map(m => (
                    <div key={m.id} className="flex justify-between">
                      <span>{m.reason} <span className="text-xs text-placeholder">· {m.userName}</span></span>
                      <span className="tabular">{m.type === 'withdrawal' || m.type === 'expense' ? '−' : '+'}{money(Number(m.amount))}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetalle(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
