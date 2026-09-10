import { useEffect, useState, type FormEvent } from 'react';
import { Plus } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/spinner';
import { api, errorMessage, type Category, type Product } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const EMPTY_FORM = { barcode: '', name: '', categoryId: '', unit: 'unidad', purchaseUnit: '', unitsPerPurchase: '1', brand: '', taxRate: '21', internalTaxRate: '0', minStock: '', manejaVencimiento: false, isWeighed: false };
// Alícuotas vigentes en Argentina; el backend valida contra la misma lista.
const TAX_RATES = ['0', '2.5', '5', '10.5', '21', '27'];
type FormState = typeof EMPTY_FORM;

/**
 * El alta y la edición de un producto: mismo diálogo desde el listado y desde
 * el detalle. Carga sus propias categorías y autocompleta nombre y marca contra
 * la base de referencia al tipear un código de barras conocido.
 */
export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = alta; un producto = edición. */
  product: Product | null;
  /** Corre después de guardar bien (el producto ya está en el servidor). */
  onSaved: () => void;
}) {
  const { session, can } = useAuth();
  const token = session!.accessToken;
  const puedeEditar = can('productos.editar');

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [referenceHint, setReferenceHint] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    api<Category[]>('/categories', {}, token).then(setCategories).catch(() => {});
  }, [open, token]);

  // Al abrir, sembrar el formulario: vacío para el alta, los datos del producto
  // para la edición.
  useEffect(() => {
    if (!open) return;
    setError('');
    setNewCategoryName('');
    setCreatingCategory(false);
    setReferenceHint(false);
    setForm(
      product
        ? {
            barcode: product.barcode,
            name: product.name,
            categoryId: product.categoryId ?? '',
            unit: product.unit,
            purchaseUnit: product.purchaseUnit ?? '',
            unitsPerPurchase: product.unitsPerPurchase ?? '1',
            brand: product.brand ?? '',
            taxRate: product.taxRate,
            internalTaxRate: product.internalTaxRate ?? '0',
            minStock: product.minStock ?? '',
            manejaVencimiento: product.manejaVencimiento,
            isWeighed: product.isWeighed,
          }
        : EMPTY_FORM,
    );
  }, [open, product]);

  // Autocompletar desde la base de referencia al tipear un código conocido —
  // solo en el alta y solo si el nombre sigue vacío.
  useEffect(() => {
    if (product || !open) return;
    const barcode = form.barcode.trim();
    setReferenceHint(false);
    if (!barcode) return;
    const timeout = setTimeout(() => {
      api<{ name: string; brand: string | null }>(`/product-reference/${encodeURIComponent(barcode)}`, {}, token)
        .then(ref => {
          let applied = false;
          setForm(f => {
            if (f.barcode.trim() !== barcode || f.name) return f;
            applied = true;
            return { ...f, name: ref.name, brand: ref.brand ?? f.brand };
          });
          if (applied) setReferenceHint(true);
        })
        .catch(() => {});
    }, 400);
    return () => clearTimeout(timeout);
  }, [form.barcode, product, open, token]);

  async function createCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setSavingCategory(true);
    setError('');
    try {
      const created = await api<Category>('/categories', { method: 'POST', body: JSON.stringify({ name }) }, token);
      setCategories(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(f => ({ ...f, categoryId: created.id }));
      setNewCategoryName('');
      setCreatingCategory(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingCategory(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = { ...form, categoryId: form.categoryId || null, minStock: form.minStock || null };
      if (product) await api(`/products/${product.id}`, { method: 'PUT', body: JSON.stringify(body) }, token);
      else await api('/products', { method: 'POST', body: JSON.stringify(body) }, token);
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
        </DialogHeader>
        {error && <Alert variant="destructive">{error}</Alert>}
        <form className="grid gap-6" onSubmit={submit}>
          <div className="grid gap-3">
            <Field label="Código de barras" htmlFor="pf-barcode">
              <Input id="pf-barcode" required value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} />
            </Field>
            {product && (
              <p className="text-xs text-muted-foreground">
                Código interno: <span className="font-mono">{product.internalCode}</span> (asignado automáticamente, no se puede cambiar)
              </p>
            )}
            <Field label="Nombre" htmlFor="pf-name">
              <Input id="pf-name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </Field>
            {referenceHint && !product && <p className="text-xs text-muted-foreground">Nombre y marca autocompletados desde la base de referencia. Revisalos antes de guardar.</p>}
            <Field label="Marca" htmlFor="pf-brand" hint="(opcional)">
              <Input id="pf-brand" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
            </Field>
            <Field label="Categoría" htmlFor="pf-category" hint="(opcional)">
              {creatingCategory ? (
                <div className="flex gap-2">
                  <Input
                    id="pf-new-category"
                    autoFocus
                    placeholder="Nombre de la categoría"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); void createCategory(); }
                      if (e.key === 'Escape') { setCreatingCategory(false); setNewCategoryName(''); }
                    }}
                  />
                  <Button type="button" size="sm" onClick={() => void createCategory()} disabled={savingCategory || !newCategoryName.trim()}>
                    {savingCategory ? <Spinner /> : 'Crear'}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setCreatingCategory(false); setNewCategoryName(''); }}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Select id="pf-category" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                    <option value="">Sin categoría</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                  {puedeEditar && (
                    <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => setCreatingCategory(true)}>
                      <Plus /> Nueva
                    </Button>
                  )}
                </div>
              )}
            </Field>
          </div>

          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Unidad de venta" htmlFor="pf-unit">
                <Input id="pf-unit" required value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
              </Field>
              <Field label="Unidad de compra" htmlFor="pf-purchase-unit" hint="(opcional · bulto, caja, pack)">
                <Input id="pf-purchase-unit" value={form.purchaseUnit} onChange={e => setForm({ ...form, purchaseUnit: e.target.value })} placeholder="bulto" />
              </Field>
            </div>
            <Field
              label={`Unidades de venta por ${form.purchaseUnit.trim() || 'bulto'}`}
              htmlFor="pf-units-per-purchase"
              hint="(1 = se compra y se vende en la misma unidad)"
            >
              <Input id="pf-units-per-purchase" min="0.001" step="0.001" type="number" value={form.unitsPerPurchase} onChange={e => setForm({ ...form, unitsPerPurchase: e.target.value })} />
            </Field>
          </div>

          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="IVA %" htmlFor="pf-tax-rate">
                <Select id="pf-tax-rate" value={form.taxRate} onChange={e => setForm({ ...form, taxRate: e.target.value })}>
                  {TAX_RATES.map(rate => <option key={rate} value={rate}>{rate}%</option>)}
                </Select>
              </Field>
              <Field label="Impuestos internos %" htmlFor="pf-internal-tax" hint="(opcional · bebidas alcohólicas, cigarrillos)">
                <Input id="pf-internal-tax" min="0" step="0.01" type="number" value={form.internalTaxRate} onChange={e => setForm({ ...form, internalTaxRate: e.target.value })} />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">El precio de costo y el de venta se cargan desde el módulo de Precios.</p>
          </div>

          <div className="grid gap-3">
            <Field label="Stock mínimo" htmlFor="pf-min-stock" hint="(opcional · alerta de reposición cuando el stock total caiga por debajo)">
              <Input id="pf-min-stock" min="0" step="0.001" type="number" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })} />
            </Field>
            <div className="flex items-center gap-2">
              <Checkbox id="pf-maneja-vencimiento" checked={form.manejaVencimiento} onCheckedChange={checked => setForm({ ...form, manejaVencimiento: checked === true })} />
              <Label htmlFor="pf-maneja-vencimiento" className="font-normal">Maneja vencimiento</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="pf-is-weighed" checked={form.isWeighed} onCheckedChange={checked => setForm({ ...form, isWeighed: checked === true })} />
              <Label htmlFor="pf-is-weighed" className="font-normal">Pesable (se vende por peso, con balanza)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Spinner />} {product ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
