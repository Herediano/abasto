import { useEffect, useState, type FormEvent } from 'react';
import { Pencil, Plus, Search, Users } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { PageSpinner, Spinner } from '@/components/spinner';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, type Customer, type PriceList } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const EMPTY = { name: '', legalName: '', taxId: '', email: '', phone: '', address: '', priceListId: '' };

export function CustomersPage() {
  const { session, isAdmin } = useAuth();
  const token = session!.accessToken;
  const [items, setItems] = useState<Customer[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    return api<Customer[]>(`/customers${params}`, {}, token)
      .then(setItems)
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    api<PriceList[]>('/price-lists', {}, token).then(setPriceLists).catch(() => {});
  }, [token]);

  useEffect(() => { void load(); }, [token, search]); // eslint-disable-line react-hooks/exhaustive-deps

  function openDialog(c: Customer | null) {
    setEditing(c);
    setForm(c ? {
      name: c.name,
      legalName: c.legalName ?? '',
      taxId: c.taxId ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      address: c.address ?? '',
      priceListId: c.priceListId ?? '',
    } : EMPTY);
    setError('');
    setOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = { ...form, priceListId: form.priceListId || null };
      if (editing) await api(`/customers/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) }, token);
      else await api('/customers', { method: 'POST', body: JSON.stringify(body) }, token);
      setOpen(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: Customer) {
    setError('');
    try {
      await api(`/customers/${c.id}`, { method: 'PUT', body: JSON.stringify({ name: c.name, isActive: !c.isActive }) }, token);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        description="A cada cliente se le puede asignar una lista de precios."
        actions={isAdmin ? <Button onClick={() => openDialog(null)}><Plus /> Nuevo cliente</Button> : undefined}
      />
      {error && !open && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardContent>
          <Field label="Buscar" htmlFor="search" className="max-w-sm">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input id="search" className="pl-8" placeholder="Nombre o CUIT" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
            </div>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <PageSpinner />
          ) : items.length === 0 ? (
            <EmptyState icon={Users} title="Sin clientes" description="Creá el primero para poder asignarle una lista de precios." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CUIT</TableHead>
                  <TableHead>Lista de precios</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="font-mono text-xs">{c.taxId ?? '—'}</TableCell>
                    <TableCell>{c.priceListName ? <Badge variant="secondary">{c.priceListName}</Badge> : <span className="text-muted-foreground">Lista base</span>}</TableCell>
                    <TableCell className="text-muted-foreground">{c.phone ?? c.email ?? '—'}</TableCell>
                    <TableCell>{c.isActive ? <Badge variant="success">Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>}</TableCell>
                    <TableCell className="text-right">
                      {isAdmin && (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openDialog(c)} aria-label={`Editar ${c.name}`}>
                            <Pencil />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => toggleActive(c)}>
                            {c.isActive ? 'Desactivar' : 'Activar'}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
            </DialogHeader>
            {error && <Alert variant="destructive">{error}</Alert>}

            <Field label="Nombre comercial" htmlFor="c-name">
              <Input id="c-name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Razón social" htmlFor="c-legal" hint="(opcional)">
                <Input id="c-legal" value={form.legalName} onChange={e => setForm({ ...form, legalName: e.target.value })} />
              </Field>
              <Field label="CUIT" htmlFor="c-tax" hint="(opcional)">
                <Input id="c-tax" value={form.taxId} onChange={e => setForm({ ...form, taxId: e.target.value })} />
              </Field>
            </div>

            <Field label="Lista de precios" htmlFor="c-list" hint="(vacío = lista base)">
              <Select id="c-list" value={form.priceListId} onChange={e => setForm({ ...form, priceListId: e.target.value })}>
                <option value="">Lista base</option>
                {priceLists.filter(l => !l.isDefault).map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Teléfono" htmlFor="c-phone" hint="(opcional)">
                <Input id="c-phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="Email" htmlFor="c-email" hint="(opcional)">
                <Input id="c-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </Field>
            </div>
            <Field label="Dirección" htmlFor="c-address" hint="(opcional)">
              <Input id="c-address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </Field>

            <p className="text-sm text-muted-foreground">
              La lista asignada se va a usar al facturarle, cuando exista el módulo de ventas.
            </p>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving && <Spinner />} {editing ? 'Guardar' : 'Crear cliente'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
