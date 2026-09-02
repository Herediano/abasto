import { useEffect, useState } from 'react';
import { ArrowLeft, Package } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { PageSpinner } from '@/components/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, type Lot, type Product, type StockItem, type Supplier } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

function margin(costPrice?: string | null, salePrice?: string | null) {
  const cost = Number(costPrice);
  const sale = Number(salePrice);
  if (!costPrice || !salePrice || !Number.isFinite(cost) || !Number.isFinite(sale) || sale <= 0) return null;
  return ((sale - cost) / sale) * 100;
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const token = session!.accessToken;
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api<Product>(`/products/${id}`, {}, token),
      api<{ productId: string; items: StockItem[] }>(`/stock/products/${id}`, {}, token),
      api<Lot[]>(`/products/${id}/lots`, {}, token),
      api<Supplier[]>('/suppliers', {}, token),
    ])
      .then(([p, s, l, sup]) => {
        setProduct(p);
        setStock(s.items);
        setLots(l);
        setSuppliers(sup);
      })
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [id, token]);

  if (loading) return <PageSpinner />;
  if (error) return <Alert variant="destructive">{error}</Alert>;
  if (!product) return null;

  const totalStock = stock.reduce((sum, s) => sum + Number(s.quantity), 0);
  const m = margin(product.costPrice, product.salePrice);
  const supplierNames = Array.from(new Set(lots.map(l => l.supplierId).filter((v): v is string => !!v).map(sid => suppliers.find(s => s.id === sid)?.name).filter((v): v is string => !!v)));

  return (
    <>
      <Button variant="ghost" size="sm" className="w-fit" onClick={() => navigate('/catalog/products')}>
        <ArrowLeft /> Volver a Productos
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {product.barcode}
            {product.internalCode ? ` · Código interno ${product.internalCode}` : ''}
            {product.categoryName ? ` · ${product.categoryName}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!product.isActive && <Badge variant="destructive">Desactivado</Badge>}
          {product.manejaVencimiento && <Badge variant="secondary">Maneja vencimiento</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Stock total</p>
            <p className="text-xl font-semibold">{totalStock.toFixed(3)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Costo</p>
            <p className="text-xl font-semibold">{product.costPrice ? `$${Number(product.costPrice).toFixed(2)}` : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Precio de venta</p>
            <p className="text-xl font-semibold">{product.salePrice ? `$${Number(product.salePrice).toFixed(2)}` : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Margen</p>
            <p className="text-xl font-semibold">{m === null ? '—' : `${m.toFixed(0)}%`}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock por depósito</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stock.length === 0 ? (
            <EmptyState icon={Package} title="Sin stock" description="Este producto todavía no tiene existencias registradas." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Depósito</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock.map(s => (
                  <TableRow key={`${s.warehouseId}-${s.productLotId}`}>
                    <TableCell>{s.warehouseName}</TableCell>
                    <TableCell>{s.lotNumber ?? '—'}</TableCell>
                    <TableCell>{s.expirationDate ? s.expirationDate.slice(0, 10) : '—'}</TableCell>
                    <TableCell>{s.supplierName ?? '—'}</TableCell>
                    <TableCell className="text-right font-medium">{s.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Proveedores</CardTitle>
        </CardHeader>
        <CardContent>
          {supplierNames.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no se registraron compras de este producto.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {supplierNames.map(name => (
                <Badge key={name} variant="outline">
                  {name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        ¿Necesitás editar los datos de este producto? Hacelo desde{' '}
        <Link to="/catalog/products" className="font-medium text-primary hover:underline">
          Productos
        </Link>
        .
      </p>
    </>
  );
}
