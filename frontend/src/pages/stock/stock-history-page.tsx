import { useEffect, useState } from 'react';
import { Eye, ClockCounterClockwise as HistoryIcon, MagnifyingGlass, X } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { StockNav } from '@/components/stock-nav';
import { PageSpinner } from '@/components/spinner';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, type Movement, type Pagination, type Supplier, type Warehouse } from '@/lib/api';
import { quantity } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';

const MOVEMENT_TYPES = [
  ['purchase_in', 'Compra'],
  ['sale_out', 'Venta'],
  ['transfer_in', 'Transferencia entrante'],
  ['transfer_out', 'Transferencia saliente'],
  ['adjustment_in', 'Ajuste positivo'],
  ['adjustment_out', 'Ajuste negativo'],
] as const;

const MOVEMENT_LABEL = Object.fromEntries(MOVEMENT_TYPES) as Record<string, string>;

const REFERENCE_LABEL: Record<string, string> = {
  purchase_invoice: 'Factura de compra',
  purchase_invoice_correction: 'Corrección de factura',
  purchase_invoice_cancellation: 'Anulación de factura',
};

function originLabel(referenceType?: string | null) {
  if (!referenceType) return 'Manual';
  return REFERENCE_LABEL[referenceType] ?? referenceType;
}

export function StockHistoryPage() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [movementType, setMovementType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [items, setItems] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, totalPages: 0, pageSize: 20, page: 1 });
  const [viewing, setViewing] = useState<Movement | null>(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) params.set('search', search);
    if (supplierId) params.set('supplierId', supplierId);
    if (warehouseId) params.set('warehouseId', warehouseId);
    if (movementType) params.set('movementType', movementType);
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    return api<{ items: Movement[]; pagination: Pagination }>(`/stock/movements?${params}`, {}, token)
      .then(r => {
        setItems(r.items);
        setPagination(r.pagination);
      })
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.all([api<Supplier[]>('/suppliers', {}, token), api<Warehouse[]>('/warehouses', {}, token)])
      .then(([s, w]) => {
        setSuppliers(s);
        setWarehouses(w);
      })
      .catch(e => setError(errorMessage(e)));
  }, [token]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => { void load(); }, [token, search, supplierId, warehouseId, movementType, fromDate, toDate, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasActiveFilters = !!(searchInput || supplierId || warehouseId || movementType || fromDate || toDate);

  function clearFilters() {
    setSearchInput('');
    setSearch('');
    setSupplierId('');
    setWarehouseId('');
    setMovementType('');
    setFromDate('');
    setToDate('');
    setPage(1);
  }

  return (
    <>
      <PageHeader title="Historial de movimientos" description="Todos los movimientos de stock del tenant, del más reciente al más antiguo." />
      <StockNav />
      {error && <Alert variant="destructive">{error}</Alert>}
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Buscar" htmlFor="filter-search">
            <div className="relative">
              <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="filter-search" className="pl-8" placeholder="Producto o código de barras" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
            </div>
          </Field>
          <Field label="Proveedor" htmlFor="filter-supplier">
            <Select
              id="filter-supplier"
              value={supplierId}
              onChange={e => {
                setSupplierId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos los proveedores</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Depósito" htmlFor="filter-warehouse">
            <Select
              id="filter-warehouse"
              value={warehouseId}
              onChange={e => {
                setWarehouseId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos los depósitos</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tipo" htmlFor="filter-type">
            <Select
              id="filter-type"
              value={movementType}
              onChange={e => {
                setMovementType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos los tipos</option>
              {MOVEMENT_TYPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Desde" htmlFor="filter-from">
            <Input
              id="filter-from"
              type="date"
              value={fromDate}
              onChange={e => {
                setFromDate(e.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field label="Hasta" htmlFor="filter-to">
            <Input
              id="filter-to"
              type="date"
              value={toDate}
              onChange={e => {
                setToDate(e.target.value);
                setPage(1);
              }}
            />
          </Field>
          {hasActiveFilters && (
            <div className="flex items-end lg:col-span-2">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X /> Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <PageSpinner />
          ) : items.length === 0 ? (
            <EmptyState icon={HistoryIcon} title="Sin movimientos" description="No hay movimientos que coincidan con los filtros elegidos." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Depósito</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap">{new Date(m.occurredAt).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{m.productName}</TableCell>
                      <TableCell>
                        <Badge variant={m.quantity.startsWith('-') ? 'destructive' : 'success'}>{MOVEMENT_LABEL[m.movementType] ?? m.movementType}</Badge>
                      </TableCell>
                      <TableCell>{m.warehouseName}</TableCell>
                      <TableCell className="text-right font-medium tabular">{quantity(m.quantity)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setViewing(m)}>
                          <Eye />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
                <span>
                  Página {page} de {pagination.totalPages || 1} · {pagination.total} movimientos
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewing} onOpenChange={open => !open && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle del movimiento</DialogTitle>
          </DialogHeader>
          {viewing && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Fecha</dt>
                <dd className="font-medium">{new Date(viewing.occurredAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tipo</dt>
                <dd>
                  <Badge variant={viewing.quantity.startsWith('-') ? 'destructive' : 'success'}>{MOVEMENT_LABEL[viewing.movementType] ?? viewing.movementType}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Producto</dt>
                <dd className="font-medium">{viewing.productName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Código de barras</dt>
                <dd className="font-mono">{viewing.productBarcode}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Depósito</dt>
                <dd>{viewing.warehouseName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Vencimiento</dt>
                <dd>{viewing.expirationDate ? viewing.expirationDate.slice(0, 10) : '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Cantidad</dt>
                <dd className="font-medium tabular">{quantity(viewing.quantity)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Origen</dt>
                <dd>{originLabel(viewing.referenceType)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Notas</dt>
                <dd className="whitespace-pre-wrap">{viewing.notes ?? '—'}</dd>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
