import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { StockNav } from '@/components/stock-nav';
import { ProductPicker } from '@/components/product-picker';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/spinner';
import { Textarea } from '@/components/ui/textarea';
import { api, errorMessage, type Product, type Warehouse } from '@/lib/api';
import { quantity as fmtQty } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';

type StockRow = { warehouseId: string; warehouseName: string; productLotId: string | null; lotNumber: string | null; expirationDate: string | null; quantity: string };

/**
 * Mover mercadería de un depósito a otro (típicamente entre sucursales). El
 * backend lo registra como dos asientos apareados (`transfer_out` + `transfer_in`
 * con el mismo `operationId`) en una sola transacción.
 */
export function StockTransferPage() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [form, setForm] = useState({ fromWarehouseId: '', toWarehouseId: '', productLotId: '', quantity: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    api<Warehouse[]>('/warehouses', {}, token)
      .then(w => {
        setWarehouses(w);
        setForm(f => ({ ...f, fromWarehouseId: session?.user.warehouseId ?? w[0]?.id ?? '' }));
      })
      .catch(e => setError(errorMessage(e)));
  }, [token, session?.user.warehouseId]);

  useEffect(() => {
    if (!product) { setStock([]); return; }
    api<{ items: StockRow[] }>(`/stock/products/${product.id}`, {}, token)
      .then(r => setStock(r.items))
      .catch(() => setStock([]));
    setForm(f => ({ ...f, productLotId: '' }));
  }, [product, token]);

  // Existencias en el depósito de origen, para el producto elegido.
  const enOrigen = useMemo(
    () => stock.filter(s => s.warehouseId === form.fromWarehouseId),
    [stock, form.fromWarehouseId],
  );
  const lotesEnOrigen = enOrigen.filter(s => s.productLotId);
  const disponible = form.productLotId
    ? Number(enOrigen.find(s => s.productLotId === form.productLotId)?.quantity ?? 0)
    : enOrigen.reduce((s, r) => s + Number(r.quantity), 0);

  const nombreDep = (w: Warehouse) => (w.branch ? `${w.name} · ${w.branch.name}` : w.name);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!product) return setError('Elegí un producto');
    setSaving(true);
    setError('');
    setDone('');
    try {
      await api('/stock/transfer', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          productLotId: form.productLotId || undefined,
          fromWarehouseId: form.fromWarehouseId,
          toWarehouseId: form.toWarehouseId,
          quantity: Number(form.quantity),
          notes: form.notes || undefined,
        }),
      }, token);
      setDone(`Se transfirieron ${fmtQty(form.quantity)} de ${product.name}.`);
      setProduct(null);
      setForm(f => ({ ...f, productLotId: '', quantity: '', notes: '' }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const manejaLote = Boolean(product?.manejaVencimiento);

  return (
    <>
      <PageHeader title="Transferir stock" description="Mover mercadería de un depósito a otro. Queda registrada en el historial de las dos puntas." />
      <StockNav />
      {done && <Alert>{done}</Alert>}
      {error && <Alert variant="destructive">{error}</Alert>}
      <Card>
        <CardContent>
          <form className="grid max-w-lg gap-4" onSubmit={submit}>
            <Field label="Producto" htmlFor="product">
              <ProductPicker id="product" token={token} value={product} onSelect={setProduct} />
            </Field>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <Field label="Desde" htmlFor="from">
                <Select id="from" required value={form.fromWarehouseId} onChange={e => setForm({ ...form, fromWarehouseId: e.target.value })}>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{nombreDep(w)}</option>)}
                </Select>
              </Field>
              <ArrowRight className="mb-2.5 hidden size-4 shrink-0 text-muted-foreground sm:block" />
              <Field label="Hacia" htmlFor="to">
                <Select id="to" required value={form.toWarehouseId} onChange={e => setForm({ ...form, toWarehouseId: e.target.value })}>
                  <option value="">Elegí el destino</option>
                  {warehouses.filter(w => w.id !== form.fromWarehouseId).map(w => <option key={w.id} value={w.id}>{nombreDep(w)}</option>)}
                </Select>
              </Field>
            </div>

            {manejaLote && (
              <Field label="Lote" htmlFor="lot" hint="(este producto maneja vencimiento)">
                <Select id="lot" required value={form.productLotId} onChange={e => setForm({ ...form, productLotId: e.target.value })}>
                  <option value="">Elegí un lote</option>
                  {lotesEnOrigen.map(s => (
                    <option key={s.productLotId} value={s.productLotId!}>
                      {s.lotNumber ?? 'Lote'} {s.expirationDate ? `· vence ${s.expirationDate.slice(0, 10)}` : ''} · {fmtQty(s.quantity)} en origen
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <Field label="Cantidad" htmlFor="quantity" hint={product ? `disponible en origen: ${fmtQty(disponible)}` : undefined}>
              <Input id="quantity" required min="0.001" step="0.001" type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
            </Field>

            <Field label="Notas" htmlFor="notes" hint="(opcional)">
              <Textarea id="notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </Field>

            <div className="flex gap-2">
              <Button disabled={saving || !product || !form.toWarehouseId} className="w-fit">
                {saving && <Spinner />} Transferir
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/stock/history?movementType=transfer_out')}>
                Ver transferencias
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
