import { useEffect, useState } from 'react';
import { Package, PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { ModuleScreen, ModuleSection, SummaryLine } from '@/components/module-screen';
import { ProductFormDialog } from '@/components/product-form-dialog';
import { PageSpinner, Spinner } from '@/components/spinner';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiError, api, errorMessage, type Lot, type PriceList, type PriceTier, type Product, type StockItem } from '@/lib/api';
import { fecha, money, quantity } from '@/lib/format';
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
  const { session, can } = useAuth();
  const token = session!.accessToken;
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [savingBarcode, setSavingBarcode] = useState(false);
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [tierForm, setTierForm] = useState({ minQty: '', price: '', priceListId: '' });
  const [savingTier, setSavingTier] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deactivatePrompt, setDeactivatePrompt] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const puedeEditarProducto = can('productos.editar');
  const puedeEliminar = can('productos.eliminar');
  const puedeEditarPrecios = can('precios.editar');
  // `lots` se carga para futuros usos (edición de lote); hoy no se lista acá.
  void lots;

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

  const loadTiers = () => api<PriceTier[]>(`/products/${id}/tiers`, {}, token).then(setTiers).catch(() => {});

  useEffect(() => {
    if (!id) return;
    void loadTiers();
    api<PriceList[]>('/price-lists', {}, token).then(setPriceLists).catch(() => {});
  }, [id, token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addTier() {
    setSavingTier(true);
    setError('');
    try {
      await api(`/products/${id}/tiers`, { method: 'POST', body: JSON.stringify({
        minQty: Number(tierForm.minQty),
        price: Number(tierForm.price),
        priceListId: tierForm.priceListId || undefined,
      }) }, token);
      setTierForm({ minQty: '', price: '', priceListId: tierForm.priceListId });
      await loadTiers();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingTier(false);
    }
  }

  async function removeTier(tierId: string) {
    setError('');
    try {
      await api(`/products/${id}/tiers/${tierId}`, { method: 'DELETE' }, token);
      await loadTiers();
    } catch (err) {
      setError(errorMessage(err));
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

  async function doDelete() {
    if (!product) return;
    setDeleting(true);
    setError('');
    try {
      await api(`/products/${product.id}`, { method: 'DELETE' }, token);
      navigate('/catalog/products');
    } catch (err) {
      if (err instanceof ApiError && err.data.code === 'PRODUCT_HAS_ACTIVITY') {
        setConfirmDelete(false);
        setDeactivatePrompt(true);
      } else {
        setError(errorMessage(err));
        setConfirmDelete(false);
      }
    } finally {
      setDeleting(false);
    }
  }

  async function doDeactivate() {
    if (!product) return;
    setDeleting(true);
    try {
      await api(`/products/${product.id}`, { method: 'PUT', body: JSON.stringify({ isActive: false }) }, token);
      setDeactivatePrompt(false);
      await loadProduct();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <PageSpinner />;
  if (error && !product) return <Alert variant="destructive">{error}</Alert>;
  if (!product) return null;

  const totalStock = stock.reduce((sum, s) => sum + Number(s.quantity), 0);
  const m = margin(product.costPrice, product.salePrice);

  return (
    <>
      <ModuleScreen
        title={product.name}
        actions={
          <>
            {puedeEditarProducto && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <PencilSimple /> Editar
              </Button>
            )}
            {puedeEditarProducto && (
              <Button variant="outline" onClick={() => void api(`/products/${product.id}`, { method: 'PUT', body: JSON.stringify({ isActive: !product.isActive }) }, token).then(loadProduct)}>
                {product.isActive ? 'Desactivar' : 'Activar'}
              </Button>
            )}
            {puedeEliminar && (
              <Button variant="ghost" size="icon" aria-label="Eliminar producto" onClick={() => setConfirmDelete(true)}>
                <Trash />
              </Button>
            )}
          </>
        }
        summary={
          <div className="flex flex-col gap-2">
            <SummaryLine
              items={[
                { label: 'Stock total', value: quantity(totalStock) },
                { label: 'Costo', value: product.costPrice ? money(Number(product.costPrice)) : '—' },
                { label: 'Precio de venta', value: product.salePrice ? money(Number(product.salePrice)) : '—' },
                { label: 'Margen', value: m === null ? '—' : `${m.toFixed(0)}%` },
              ]}
            />
            <p className="text-micro text-placeholder">
              <span className="font-mono">{product.barcode}</span>
              {product.internalCode ? <> · Código interno <span className="font-mono">{product.internalCode}</span></> : null}
              {product.categoryName ? ` · ${product.categoryName}` : ''}
              {!product.isActive ? ' · Desactivado' : ''}
              {product.manejaVencimiento ? ' · Maneja vencimiento' : ''}
              {product.isWeighed ? ' · Pesable' : ''}
            </p>
          </div>
        }
      >
        {error && <Alert variant="destructive">{error}</Alert>}

        <ModuleSection title="Stock por depósito">
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
                    <TableCell>{fecha(s.expirationDate)}</TableCell>
                    <TableCell>{s.supplierName ?? '—'}</TableCell>
                    <TableCell className="text-right font-medium tabular">{quantity(s.quantity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ModuleSection>

        <ModuleSection title="Códigos de barras" description="El principal se cambia desde «Editar». Acá se agregan los alternativos (packs, cambios de proveedor).">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-mono">{product.barcode}</Badge>
            <span className="text-xs text-muted-foreground">principal</span>
            {(product.extraBarcodes ?? []).map(b => (
              <span key={b.id} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-xs">
                {b.barcode}
                {puedeEditarProducto && (
                  <button type="button" onClick={() => removeBarcode(b.id)} className="text-muted-foreground hover:text-destructive" aria-label={`Quitar ${b.barcode}`}>
                    <Trash className="size-3.5" />
                  </button>
                )}
              </span>
            ))}
          </div>
          {puedeEditarProducto && (
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={e => { e.preventDefault(); void addBarcode(); }}
            >
              <Input value={newBarcode} onChange={e => setNewBarcode(e.target.value)} placeholder="Agregar otro código" className="max-w-xs" />
              <Button type="submit" variant="outline" size="sm" disabled={savingBarcode || !newBarcode.trim()}>
                {savingBarcode ? <Spinner /> : <Plus />} Agregar
              </Button>
            </form>
          )}
        </ModuleSection>

        <ModuleSection title="Proveedores" description="Se arma solo con las compras registradas de este producto.">
          {(product.suppliers ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no se registraron compras de este producto.</p>
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
                    <TableCell className="text-right">{s.lastCost ? money(Number(s.lastCost)) : '—'}</TableCell>
                    <TableCell>{fecha(s.lastPurchaseAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ModuleSection>

        <ModuleSection title="Escalas por cantidad" description="A partir de cierta cantidad rige otro precio. Todavía no se aplican: las va a usar el módulo de ventas.">
          {tiers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tiers.map(t => (
                <span key={t.id} className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1 text-sm">
                  Desde {Number(t.minQty)} u. → {money(Number(t.price))}
                  <Badge variant="outline">{t.priceListName}</Badge>
                  {puedeEditarPrecios && (
                    <button type="button" onClick={() => removeTier(t.id)} className="text-muted-foreground hover:text-destructive" aria-label="Quitar escala">
                      <Trash className="size-3.5" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
          {puedeEditarPrecios && (
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={e => { e.preventDefault(); void addTier(); }}
            >
              <Field label="Desde cantidad" htmlFor="tier-qty" className="max-w-36">
                <Input id="tier-qty" required type="number" min="2" step="0.001" value={tierForm.minQty} onChange={e => setTierForm({ ...tierForm, minQty: e.target.value })} />
              </Field>
              <Field label="Precio" htmlFor="tier-price" className="max-w-36">
                <Input id="tier-price" required type="number" min="0" step="0.01" value={tierForm.price} onChange={e => setTierForm({ ...tierForm, price: e.target.value })} />
              </Field>
              <Field label="Lista" htmlFor="tier-list" className="max-w-48">
                <Select id="tier-list" value={tierForm.priceListId} onChange={e => setTierForm({ ...tierForm, priceListId: e.target.value })}>
                  {priceLists.map(l => <option key={l.id} value={l.isDefault ? '' : l.id}>{l.name}</option>)}
                </Select>
              </Field>
              <Button type="submit" variant="outline" size="sm" disabled={savingTier}>
                {savingTier ? <Spinner /> : <Plus />} Agregar
              </Button>
            </form>
          )}
        </ModuleSection>

        <ModuleSection title="Historial de precios">
          {(product.priceHistory ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hubo cambios de precio registrados.</p>
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
                    <TableCell className="whitespace-nowrap">{fecha(h.createdAt)}</TableCell>
                    <TableCell>{h.field === 'cost' ? 'Costo' : 'Venta'}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{h.oldValue ? money(Number(h.oldValue)) : '—'}</TableCell>
                    <TableCell className="text-right font-medium">{money(Number(h.newValue))}</TableCell>
                    <TableCell><Badge variant="outline">{PRICE_SOURCES[h.source] ?? h.source}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ModuleSection>
      </ModuleScreen>

      <ProductFormDialog open={editOpen} onOpenChange={setEditOpen} product={product} onSaved={() => { void loadProduct(); }} />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar «{product.name}»</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se borra de verdad si nunca tuvo movimientos. Si ya se usó (stock, ventas o compras), te vamos a ofrecer desactivarlo. Esto no se puede deshacer.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
            <Button type="button" variant="destructive" onClick={doDelete} disabled={deleting}>
              {deleting ? <Spinner /> : <Trash />} Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deactivatePrompt} onOpenChange={setDeactivatePrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No se puede borrar</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            «{product.name}» ya tuvo movimientos, así que es parte de la historia. Podés desactivarlo: deja de aparecer en la caja y en los listados, pero sus registros quedan.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeactivatePrompt(false)}>Cancelar</Button>
            <Button type="button" onClick={doDeactivate} disabled={deleting}>
              {deleting && <Spinner />} Desactivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
