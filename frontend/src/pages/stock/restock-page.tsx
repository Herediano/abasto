import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PackageMinus } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { PageSpinner } from '@/components/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, type LowStockProduct } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export function RestockPage() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [items, setItems] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api<LowStockProduct[]>('/products/low-stock', {}, token)
      .then(setItems)
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <>
      <PageHeader title="Reposición" description="Productos con stock mínimo configurado que hoy están por debajo de ese umbral." />
      {error && <Alert variant="destructive">{error}</Alert>}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <PageSpinner />
          ) : items.length === 0 ? (
            <EmptyState icon={PackageMinus} title="Todo en orden" description="Ningún producto con stock mínimo configurado está por debajo del umbral. Configurá un stock mínimo desde la ficha de cada producto para que aparezca acá cuando corresponda reponerlo." />
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
                {items.map(p => {
                  const min = Number(p.minStock);
                  const urgent = p.currentStock <= 0;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <Link to={`/catalog/products/${p.id}`} className="hover:underline">
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">{p.currentStock}</TableCell>
                      <TableCell className="text-right">{min}</TableCell>
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
