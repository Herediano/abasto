import { useEffect, useState, type FormEvent } from 'react';
import { PencilSimple, Plus, Truck } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { PageSpinner, Spinner } from '@/components/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, type Supplier } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const EMPTY_FORM = { name: '', legalName: '', taxId: '', email: '', phone: '', address: '' };

export function SuppliersPage() {
  const { session, isAdmin } = useAuth();
  const token = session!.accessToken;
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () =>
    api<Supplier[]>('/suppliers', {}, token)
      .then(setItems)
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));

  useEffect(() => { void load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({ name: s.name, legalName: s.legalName ?? '', taxId: s.taxId ?? '', email: s.email ?? '', phone: s.phone ?? '', address: s.address ?? '' });
    setError('');
    setOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const body = { ...form, legalName: form.legalName || undefined, taxId: form.taxId || undefined, email: form.email || undefined, phone: form.phone || undefined, address: form.address || undefined };
    try {
      if (editing) await api(`/suppliers/${editing.id}`, { method: 'PUT', body: JSON.stringify({ ...body, legalName: body.legalName ?? null, taxId: body.taxId ?? null, email: body.email ?? null, phone: body.phone ?? null, address: body.address ?? null }) }, token);
      else await api('/suppliers', { method: 'POST', body: JSON.stringify(body) }, token);
      setOpen(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Proveedores"
        description="Registrá los proveedores para asociarlos a lotes y facturas de compra."
        actions={
          <Button onClick={openCreate}>
            <Plus /> Nuevo proveedor
          </Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <PageSpinner />
          ) : items.length === 0 ? (
            <EmptyState icon={Truck} title="Sin proveedores" description="Registrá tu primer proveedor para poder cargar facturas de compra." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Razón social</TableHead>
                  <TableHead>Tax ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.legalName ?? '—'}</TableCell>
                    <TableCell>{s.taxId ?? '—'}</TableCell>
                    <TableCell>{s.email ?? '—'}</TableCell>
                    <TableCell>{s.phone ?? '—'}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                          <PencilSimple />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
          </DialogHeader>
          {error && <Alert variant="destructive">{error}</Alert>}
          <form className="grid gap-4" onSubmit={submit}>
            <Field label="Nombre comercial" htmlFor="name">
              <Input id="name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Razón social" htmlFor="legalName" hint="(opcional)">
              <Input id="legalName" value={form.legalName} onChange={e => setForm({ ...form, legalName: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="CUIT / Tax ID" htmlFor="taxId" hint="(opcional)">
                <Input id="taxId" value={form.taxId} onChange={e => setForm({ ...form, taxId: e.target.value })} />
              </Field>
              <Field label="Teléfono" htmlFor="phone" hint="(opcional)">
                <Input id="phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </Field>
            </div>
            <Field label="Email" htmlFor="email" hint="(opcional)">
              <Input id="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Dirección" htmlFor="address" hint="(opcional)">
              <Input id="address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Spinner />} {editing ? 'Guardar cambios' : 'Crear proveedor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
