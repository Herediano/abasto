import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarX, PencilSimple } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { ListFilters } from '@/components/list-filters';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { StockNav } from '@/components/stock-nav';
import { PageSpinner, Spinner } from '@/components/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, type StockItem } from '@/lib/api';
import { quantity } from '@/lib/format';
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
  const { session, can } = useAuth();
  const puedeEditar = can('stock.mover');
  const token = session!.accessToken;
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [editDate, setEditDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [urgency, setUrgency] = useState('');
  const [warehouseId, setWarehouseId] = useState('');

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

  const warehouses = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of items) map.set(i.warehouseId, i.warehouseName);
    return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const q = search.trim().toLowerCase();
  const visibles = items.filter(i => {
    if (warehouseId && i.warehouseId !== warehouseId) return false;
    if (q && !i.productName.toLowerCase().includes(q)) return false;
    if (urgency) {
      const days = daysRemaining(i.expirationDate!);
      if (urgency === 'overdue' && days >= 0) return false;
      if (urgency === 'soon' && (days < 0 || days > 30)) return false;
    }
    return true;
  });

  const activeFilters = [
    urgency && { key: 'urg', label: urgency === 'overdue' ? 'Vencidos' : 'Vencen en ≤ 30 días', clear: () => setUrgency('') },
    warehouseId && { key: 'wh', label: warehouses.find(w => w.id === warehouseId)?.name ?? 'Depósito', clear: () => setWarehouseId('') },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  return (
    <>
      <PageHeader title="Vencimientos" description="Stock con fecha de vencimiento, ordenado del más próximo al más lejano." />
      <StockNav />
      {error && !editing && <Alert variant="destructive">{error}</Alert>}
      <ListFilters
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Producto"
        searchLabel="Buscar en vencimientos"
        activeFilters={activeFilters}
      >
        <Field label="Urgencia" htmlFor="f-urg">
          <Select id="f-urg" value={urgency} onChange={e => setUrgency(e.target.value)}>
            <option value="">Todos</option>
            <option value="overdue">Vencidos</option>
            <option value="soon">Vencen en ≤ 30 días</option>
          </Select>
        </Field>
        {warehouses.length > 1 && (
          <Field label="Depósito" htmlFor="f-wh">
            <Select id="f-wh" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
              <option value="">Todos los depósitos</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
          </Field>
        )}
      </ListFilters>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <PageSpinner />
          ) : items.length === 0 ? (
            <EmptyState icon={CalendarX} title="Sin vencimientos próximos" description="No hay stock con fecha de vencimiento registrada." />
          ) : visibles.length === 0 ? (
            <EmptyState icon={CalendarX} title="Sin resultados" description="Ningún lote coincide con la búsqueda." />
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
                  {puedeEditar && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map(i => {
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
                      <TableCell className="text-right font-semibold tabular">{quantity(i.quantity)}</TableCell>
                      {puedeEditar && (
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
                {saving && <Spinner />} Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
