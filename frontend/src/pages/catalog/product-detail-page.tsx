import { useEffect, useState } from 'react';
import { ArrowLeft, Package, Plus, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { Input } from '@/components/ui/input';
import { PageSpinner, Spinner } from '@/components/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, type Lot, type Product, type StockItem } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const PRICE_SOURCES: Record<string, string> = {
  manual: 'Edición manual',
  import: 'Importación',
  bulk: 'Acción masiva',
  invoice: 'Factura de compra',
};

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [savingBarcode, setSavingBarcode] = useState(false);
  const isAdmin = session!.user.role === 'admin';

  const loadProduct = () => api<Product>(`/products/${id}`, {}, token).then(setProduct);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api<Product>(`/products/${id}`, {}, token),
      api<{ productId: string; items: StockItem[] }>(`/stock/products/${id}`, {}, token),
      api<Lot[]>(`/products/${id}/lots`, {}, token),
    ])
      .then(([p, s, l]) => {
        setProduct(p);
        setStock(s.items);
        setLots(l);
      })
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [id, token]);

  async function addBarcode() {
    const barcode = newBarcode.trim();
    if (!barcode) return;
    setSavingBarcode(true);
    setError('');
    try {
      await api(`/products/${id}/barcodes`, { method: 'POST', body: JSON.stringify({ barcode }) }, token);
      setNewBarcode('');
      await loadProduct();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingBarcode(false);
    }
  }

  async function removeBarcode(barcodeId: string) {
    setError('');
    try {
      await api(`/products/${id}/barcodes/${barcodeId}`, { method: 'DELETE' }, token);
      await loadProduct();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (loading) return <PageSpinner />;
  if (error) return <Alert variant="destructive">{error}</Alert>;
  if (!product) return null;

  const totalStock = stock.reduce((sum, s) => sum + Number(s.quantity), 0);
  const m = margin(product.costPrice, product.salePrice);

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
          <CardTitle>Códigos de barras</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              {product.barcode}
            </Badge>
            <span className="text-xs text-muted-foreground">principal</span>
          </div>

          {(product.extraBarcodes ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(product.extraBarcodes ?? []).map(b => (
                <span key={b.id} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-xs">
                  {b.barcode}
                  {isAdmin && (
                    <button type="button" onClick={() => removeBarcode(b.id)} className="text-muted-foreground hover:text-destructive" aria-label={`Quitar ${b.barcode}`}>
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          {isAdmin && (
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={e => {
                e.preventDefault();
                void addBarcode();
              }}
            >
              <Input value={newBarcode} onChange={e => setNewBarcode(e.target.value)} placeholder="Agregar otro código" className="max-w-xs" />
              <Button type="submit" variant="outline" size="sm" disabled={savingBarcode || !newBarcode.trim()}>
                {savingBarcode ? <Spinner /> : <Plus />} Agregar
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Proveedores</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(product.suppliers ?? []).length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Todavía no se registraron compras de este producto.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Último costo</TableHead>
                  <TableHead>Última compra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(product.suppliers ?? []).map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.supplierName}</TableCell>
                    <TableCell className="text-right">{s.lastCost ? `$${Number(s.lastCost).toFixed(2)}` : '—'}</TableCell>
                    {/* slice en vez de toLocaleDateString: la fecha viene como
                        medianoche UTC y convertirla a hora local la corre un día. */}
                    <TableCell>{s.lastPurchaseAt ? s.lastPurchaseAt.slice(0, 10) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de precios</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(product.priceHistory ?? []).length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Todavía no hubo cambios de precio registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead className="text-right">Antes</TableHead>
                  <TableHead className="text-right">Después</TableHead>
                  <TableHead>Origen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(product.priceHistory ?? []).map(h => (
                  <TableRow key={h.id}>
                    <TableCell className="whitespace-nowrap">{h.createdAt.slice(0, 10)}</TableCell>
                    <TableCell>{h.field === 'cost' ? 'Costo' : 'Venta'}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{h.oldValue ? `$${Number(h.oldValue).toFixed(2)}` : '—'}</TableCell>
                    <TableCell className="text-right font-medium">${Number(h.newValue).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{PRICE_SOURCES[h.source] ?? h.source}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
