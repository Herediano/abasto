import { useEffect, useState, type FormEvent } from 'react';
import { CalendarX, PencilSimple } from '@phosphor-icons/react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, type StockItem } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysRemaining(expirationDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiration = new Date(expirationDate);
  expiration.setHours(0, 0, 0, 0);
  return Math.round((expiration.getTime() - today.getTime()) / DAY_MS);
}

function urgencyBadge(days: number) {
  if (days < 0) return { label: `Vencido hace ${Math.abs(days)} día${Math.abs(days) === 1 ? '' : 's'}`, variant: 'destructive' as const };
  if (days === 0) return { label: 'Vence hoy', variant: 'destructive' as const };
  if (days <= 30) return { label: `Vence en ${days} día${days === 1 ? '' : 's'}`, variant: 'warning' as const };
  return { label: `Vence en ${days} días`, variant: 'secondary' as const };
}

export function ExpirationsPage() {
  const { session, isAdmin } = useAuth();
  const token = session!.accessToken;
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [editDate, setEditDate] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () =>
    api<{ items: StockItem[] }>('/stock', {}, token)
      .then(r =>
        setItems(
          r.items
            .filter(i => i.expirationDate)
            .sort((a, b) => new Date(a.expirationDate!).getTime() - new Date(b.expirationDate!).getTime()),
        ),
      )
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));

  useEffect(() => {
    void load();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  function openEdit(item: StockItem) {
    setEditing(item);
    setEditDate(item.expirationDate!.slice(0, 10));
    setError('');
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      await api(`/products/${editing.productId}/lots/${editing.productLotId}`, { method: 'PUT', body: JSON.stringify({ expirationDate: editDate }) }, token);
      setEditing(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Vencimientos" description="Stock con fecha de vencimiento, ordenado del más próximo al más lejano." />
      {error && !editing && <Alert variant="destructive">{error}</Alert>}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <PageSpinner />
          ) : items.length === 0 ? (
            <EmptyState icon={CalendarX} title="Sin vencimientos próximos" description="No hay stock con fecha de vencimiento registrada." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Depósito</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(i => {
                  const days = daysRemaining(i.expirationDate!);
                  const urgency = urgencyBadge(days);
                  return (
                    <TableRow key={`${i.productId}-${i.warehouseId}-${i.productLotId}`}>
                      <TableCell className="font-medium">{i.productName}</TableCell>
                      <TableCell>{i.warehouseName}</TableCell>
                      <TableCell>{i.supplierName ?? '—'}</TableCell>
                      <TableCell>{i.expirationDate!.slice(0, 10)}</TableCell>
                      <TableCell>
                        <Badge variant={urgency.variant}>{urgency.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{i.quantity}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(i)}>
                            <PencilSimple />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Corregir vencimiento</DialogTitle>
          </DialogHeader>
          {error && editing && <Alert variant="destructive">{error}</Alert>}
          {editing && <p className="text-sm text-muted-foreground">{editing.productName} · {editing.warehouseName}</p>}
          <form className="grid gap-4" onSubmit={submitEdit}>
            <Field label="Vencimiento" htmlFor="edit-expiration">
              <Input id="edit-expiration" required type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Spinner />} Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
