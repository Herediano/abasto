import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowsClockwise } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { ListFilters } from '@/components/list-filters';
import { PageHeader } from '@/components/page-header';
import { Select } from '@/components/ui/select';
import { StockNav } from '@/components/stock-nav';
import { PageSpinner } from '@/components/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, type LowStockProduct } from '@/lib/api';
import { quantity } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';

export function RestockPage() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [items, setItems] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');

  useEffect(() => {
    api<LowStockProduct[]>('/products/low-stock', {}, token)
      .then(setItems)
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [token]);

  const q = search.trim().toLowerCase();
  const visibles = items.filter(p => {
    if (q && !p.name.toLowerCase().includes(q)) return false;
    if (estado === 'out' && p.currentStock > 0) return false;
    if (estado === 'low' && p.currentStock <= 0) return false;
    return true;
  });

  const activeFilters = [
    estado && { key: 'estado', label: estado === 'out' ? 'Sin stock' : 'Bajo el mínimo', clear: () => setEstado('') },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  return (
    <>
      <PageHeader title="Reposición" description="Productos con stock mínimo configurado que hoy están por debajo de ese umbral." />
      <StockNav />
      {error && <Alert variant="destructive">{error}</Alert>}
      <ListFilters
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Producto"
        searchLabel="Buscar en reposición"
        activeFilters={activeFilters}
      >
        <Field label="Estado" htmlFor="f-estado">
          <Select id="f-estado" value={estado} onChange={e => setEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="out">Sin stock</option>
            <option value="low">Bajo el mínimo</option>
          </Select>
        </Field>
      </ListFilters>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <PageSpinner />
          ) : items.length === 0 ? (
            <EmptyState icon={ArrowsClockwise} title="Todo en orden" description="Ningún producto con stock mínimo configurado está por debajo del umbral. Configurá un stock mínimo desde la ficha de cada producto para que aparezca acá cuando corresponda reponerlo." />
          ) : visibles.length === 0 ? (
            <EmptyState icon={ArrowsClockwise} title="Sin resultados" description="Ningún producto coincide con la búsqueda." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Stock actual</TableHead>
                  <TableHead className="text-right">Stock mínimo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map(p => {
                  const min = Number(p.minStock);
                  const urgent = p.currentStock <= 0;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <Link to={`/catalog/products/${p.id}`} className="hover:underline">
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular">{quantity(p.currentStock)}</TableCell>
                      <TableCell className="text-right tabular">{quantity(min)}</TableCell>
                      <TableCell>
                        <Badge variant={urgent ? 'destructive' : 'warning'}>{urgent ? 'Sin stock' : 'Por debajo del mínimo'}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
