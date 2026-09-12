import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { ModuleScreen } from '@/components/module-screen';
import { stockViews } from '@/components/stock-nav';
import { ProductPicker } from '@/components/product-picker';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/spinner';
import { Textarea } from '@/components/ui/textarea';
import { api, errorMessage, type Lot, type Product, type Warehouse } from '@/lib/api';
import { fecha } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';

export function StockOutPage() {
  const { session, can } = useAuth();
  const token = session!.accessToken;
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [productLotId, setProductLotId] = useState('');
  const [form, setForm] = useState({ warehouseId: '', quantity: '', notes: '' });

  const branchId = session?.user.branch?.id;
  useEffect(() => {
    api<Warehouse[]>('/warehouses', {}, token)
      .then(all => {
        // Sólo los depósitos de la sucursal activa: el egreso sale de acá.
        const w = branchId ? all.filter(x => x.branchId === branchId) : all;
        setWarehouses(w);
        setForm(f => ({ ...f, warehouseId: w[0]?.id ?? '' }));
      })
      .catch(e => setError(errorMessage(e)));
  }, [token, branchId]);

  useEffect(() => {
    if (!product) {
      setLots([]);
      setProductLotId('');
      return;
    }
    api<Lot[]>(`/products/${product.id}/lots`, {}, token)
      .then(fetched => {
        setLots(fetched);
        setProductLotId(fetched[0]?.id ?? '');
      })
      .catch(e => setError(errorMessage(e)));
  }, [product, token]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!product) return setError('Buscá y seleccioná un producto');
    setSaving(true);
    setError('');
    try {
      await api(
        '/stock/out',
        { method: 'POST', body: JSON.stringify({ productId: product.id, productLotId: productLotId || undefined, warehouseId: form.warehouseId, quantity: Number(form.quantity), movementType: 'adjustment_out', notes: form.notes || undefined }) },
        token,
      );
      navigate('/stock');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModuleScreen title="Stock" views={stockViews(can)}>
      {error && <Alert variant="destructive">{error}</Alert>}
      <form className="grid max-w-lg gap-4" onSubmit={submit}>
            <Field label="Producto" htmlFor="product">
              <ProductPicker id="product" token={token} value={product} onSelect={setProduct} />
            </Field>
            <Field label="Depósito" htmlFor="warehouse">
              <Select id="warehouse" required value={form.warehouseId} onChange={e => setForm({ ...form, warehouseId: e.target.value })}>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Lote" htmlFor="lot" hint={product?.manejaVencimiento ? '(obligatorio · se sugiere el más próximo a vencer)' : '(opcional)'}>
              <Select id="lot" value={productLotId} required={!!product?.manejaVencimiento} onChange={e => setProductLotId(e.target.value)}>
                <option value="">{product?.manejaVencimiento ? 'Seleccionar lote...' : 'Sin lote'}</option>
                {lots.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.expirationDate ? `Vence ${fecha(l.expirationDate)}` : 'Sin vencimiento'}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cantidad" htmlFor="quantity">
              <Input id="quantity" required min="0.001" step="0.001" type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
            </Field>
            <Field label="Notas" htmlFor="notes" hint="(opcional)">
              <Textarea id="notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </Field>
        <Button disabled={saving} className="w-fit">
          {saving && <Spinner />} Guardar movimiento
        </Button>
      </form>
    </ModuleScreen>
  );
}
