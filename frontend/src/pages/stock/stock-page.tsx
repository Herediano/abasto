import { useEffect, useState } from 'react';
import { Package } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { PageSpinner } from '@/components/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, type StockItem } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export function StockPage() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ items: StockItem[] }>('/stock', {}, token)
      .then(r => setItems(r.items))
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <>
      <PageHeader title="Stock actual" description="Existencias por producto, depósito y lote." />
      {error && <Alert variant="destructive">{error}</Alert>}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <PageSpinner />
          ) : items.length === 0 ? (
            <EmptyState icon={Package} title="No hay stock registrado" description="Registrá un ingreso para empezar a ver existencias acá." />
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
                {items.map(i => (
                  <TableRow key={`${i.productId}-${i.warehouseId}-${i.productLotId}`}>
                    <TableCell className="font-medium">{i.productName}</TableCell>
                    <TableCell>{i.warehouseName}</TableCell>
                    <TableCell>{i.lotNumber ?? '—'}</TableCell>
                    <TableCell>{i.expirationDate ? i.expirationDate.slice(0, 10) : '—'}</TableCell>
                    <TableCell className="text-right font-semibold">{i.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
