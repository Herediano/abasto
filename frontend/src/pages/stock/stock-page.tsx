import { useMemo, useState } from 'react';
import { Package } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { ListFilters } from '@/components/list-filters';
import { ModuleScreen } from '@/components/module-screen';
import { ExportMenu } from '@/components/export-menu';
import { Select } from '@/components/ui/select';
import { stockViews } from '@/components/stock-nav';
import { PageSpinner } from '@/components/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, type StockItem } from '@/lib/api';
import { fecha, quantity } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { useResource } from '@/lib/use-resource';

export function StockPage() {
  const { session, can } = useAuth();
  const token = session!.accessToken;
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');

  const { data: items = [], loading, error } = useResource(
    () => api<{ items: StockItem[] }>('/stock', {}, token).then(r => r.items),
    [token],
  );

  // Los depósitos salen del propio listado: no hace falta otra llamada.
  const warehouses = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of items) map.set(i.warehouseId, i.warehouseName);
    return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const q = search.trim().toLowerCase();
  const visibles = items.filter(
    i =>
      (!warehouseId || i.warehouseId === warehouseId) &&
      (!q || i.productName.toLowerCase().includes(q) || (i.lotNumber ?? '').toLowerCase().includes(q)),
  );

  const activeFilters = [
    warehouseId && { key: 'wh', label: warehouses.find(w => w.id === warehouseId)?.name ?? 'Depósito', clear: () => setWarehouseId('') },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  return (
    <ModuleScreen
      title="Stock"
      views={stockViews(can)}
      actions={<ExportMenu path="/stock" filename="stock" />}
    >
      {error && <Alert variant="destructive">{error}</Alert>}
      <ListFilters
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Producto o lote"
        searchLabel="Buscar en el stock"
        activeFilters={activeFilters}
      >
        {warehouses.length > 1 && (
          <Field label="Depósito" htmlFor="f-wh">
            <Select id="f-wh" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
              <option value="">Todos los depósitos</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
          </Field>
        )}
      </ListFilters>
      {loading ? (
        <PageSpinner />
      ) : error ? null : items.length === 0 ? (
        <EmptyState icon={Package} title="Todavía no hay stock" description="Registrá un ingreso para empezar a ver existencias acá." />
      ) : visibles.length === 0 ? (
        <EmptyState icon={Package} title="Sin resultados" description="Ningún ítem de stock coincide con la búsqueda." />
      ) : (
        <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Depósito</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map(i => (
                  <TableRow key={`${i.productId}-${i.warehouseId}-${i.productLotId}`}>
                    <TableCell className="font-medium">{i.productName}</TableCell>
                    <TableCell>{i.warehouseName}</TableCell>
                    <TableCell>{i.lotNumber ?? '—'}</TableCell>
                    <TableCell>{fecha(i.expirationDate)}</TableCell>
                    <TableCell className="text-right font-semibold tabular">{quantity(i.quantity)}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      )}
    </ModuleScreen>
  );
}
