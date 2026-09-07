import { useEffect, useState, type FormEvent } from 'react';
import { PencilSimple, Plus, MagnifyingGlass, UsersThree, Wallet } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { ExportMenu } from '@/components/export-menu';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { PageSpinner, Spinner } from '@/components/spinner';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, type Customer, type CustomerAccount, type PriceList } from '@/lib/api';
import { money } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const EMPTY = { name: '', legalName: '', taxId: '', email: '', phone: '', address: '', priceListId: '', creditLimit: '' };

export function CustomersPage() {
  const { session, can } = useAuth();
  const puedeCrear = can('clientes.crear');
  const puedeEditar = can('clientes.editar');
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

  // Cuenta corriente: estado de cuenta y cobro, por cliente.
  const [cuentaOpen, setCuentaOpen] = useState(false);
  const [cuentaCliente, setCuentaCliente] = useState<Customer | null>(null);
  const [cuenta, setCuenta] = useState<CustomerAccount | null>(null);
  const [cuentaLoading, setCuentaLoading] = useState(false);
  const [cuentaError, setCuentaError] = useState('');
  const [pagoMonto, setPagoMonto] = useState('');
  const [pagoNotas, setPagoNotas] = useState('');
  const [pagoSaving, setPagoSaving] = useState(false);

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
      creditLimit: c.creditLimit ?? '',
    } : EMPTY);
    setError('');
    setOpen(true);
  }

  function openCuenta(c: Customer) {
    setCuentaCliente(c);
    setCuenta(null);
    setCuentaError('');
    setPagoMonto('');
    setPagoNotas('');
    setCuentaOpen(true);
    setCuentaLoading(true);
    api<CustomerAccount>(`/customers/${c.id}/account`, {}, token)
      .then(setCuenta)
      .catch(e => setCuentaError(errorMessage(e)))
      .finally(() => setCuentaLoading(false));
  }

  async function registrarPago(e: FormEvent) {
    e.preventDefault();
    if (!cuentaCliente) return;
    setPagoSaving(true);
    setCuentaError('');
    try {
      await api(`/customers/${cuentaCliente.id}/account/payments`, { method: 'POST', body: JSON.stringify({ amount: Number(pagoMonto), notes: pagoNotas || undefined }) }, token);
      const actualizada = await api<CustomerAccount>(`/customers/${cuentaCliente.id}/account`, {}, token);
      setCuenta(actualizada);
      setPagoMonto('');
      setPagoNotas('');
      await load();
    } catch (err) {
      setCuentaError(errorMessage(err));
    } finally {
      setPagoSaving(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = { ...form, priceListId: form.priceListId || null, creditLimit: form.creditLimit === '' ? null : form.creditLimit };
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
        actions={
          <div className="flex gap-2">
            <ExportMenu path="/customers" params={{ search }} filename="clientes" />
            {puedeCrear && <Button onClick={() => openDialog(null)}><Plus /> Nuevo cliente</Button>}
          </div>
        }
      />
      {error && !open && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardContent>
          <Field label="Buscar" htmlFor="search" className="max-w-sm">
            <div className="relative">
              <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
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
            <EmptyState icon={UsersThree} title="Sin clientes" description="Creá el primero para poder asignarle una lista de precios." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CUIT</TableHead>
                  <TableHead>Lista de precios</TableHead>
                  <TableHead>Cuenta corriente</TableHead>
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
                    <TableCell className="tabular">
                      {c.accountBalance && Number(c.accountBalance) !== 0
                        ? <span className={Number(c.accountBalance) > 0 ? 'font-medium text-warning' : 'font-medium text-success'}>{money(Number(c.accountBalance))}</span>
                        : <span className="text-muted-foreground">Sin saldo</span>}
                      {c.creditLimit && <span className="ml-1 text-xs text-placeholder">/ {money(Number(c.creditLimit))}</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.phone ?? c.email ?? '—'}</TableCell>
                    <TableCell>{c.isActive ? <Badge variant="success">Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openCuenta(c)} aria-label={`Cuenta corriente de ${c.name}`} title="Cuenta corriente">
                          <Wallet />
                        </Button>
                        {puedeEditar && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openDialog(c)} aria-label={`Editar ${c.name}`}>
                              <PencilSimple />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => toggleActive(c)}>
                              {c.isActive ? 'Desactivar' : 'Activar'}
                            </Button>
                          </>
                        )}
                      </div>
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
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          </DialogHeader>
          {error && <Alert variant="destructive">{error}</Alert>}
          <form onSubmit={submit} className="grid gap-6">
            <div className="grid gap-3">
              <Field label="Nombre comercial" htmlFor="c-name">
                <Input id="c-name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Razón social" htmlFor="c-legal" hint="(opcional)">
                  <Input id="c-legal" value={form.legalName} onChange={e => setForm({ ...form, legalName: e.target.value })} />
                </Field>
                <Field label="CUIT" htmlFor="c-tax" hint="(opcional)">
                  <Input id="c-tax" value={form.taxId} onChange={e => setForm({ ...form, taxId: e.target.value })} />
                </Field>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Teléfono" htmlFor="c-phone" hint="(opcional)">
                <Input id="c-phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="Email" htmlFor="c-email" hint="(opcional)">
                <Input id="c-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Dirección" htmlFor="c-address" hint="(opcional)" className="col-span-2">
                <Input id="c-address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </Field>
            </div>

            <div className="grid gap-3">
              <Field label="Lista de precios" htmlFor="c-list" hint="(vacío = lista base)">
                <Select id="c-list" value={form.priceListId} onChange={e => setForm({ ...form, priceListId: e.target.value })}>
                  <option value="">Lista base</option>
                  {priceLists.filter(l => !l.isDefault).map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Límite de cuenta corriente" htmlFor="c-credit" hint="(vacío = sin tope, 0 = no puede comprar a cuenta)">
                <Input id="c-credit" type="number" min="0" step="0.01" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: e.target.value })} />
              </Field>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving && <Spinner />} {editing ? 'Guardar cambios' : 'Crear cliente'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={cuentaOpen} onOpenChange={setCuentaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cuenta corriente · {cuentaCliente?.name}</DialogTitle>
          </DialogHeader>
          {cuentaLoading ? (
            <PageSpinner />
          ) : cuenta ? (
            <div className="flex flex-col gap-4">
              {cuentaError && <Alert variant="destructive">{cuentaError}</Alert>}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-placeholder">Saldo</p>
                  <p className={cuenta.balance > 0 ? 'font-semibold text-warning tabular' : 'font-semibold tabular'}>{money(cuenta.balance)}</p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-placeholder">Disponible</p>
                  <p className="font-semibold tabular">{cuenta.available === null ? 'Sin tope' : money(cuenta.available)}</p>
                </div>
              </div>

              <form onSubmit={registrarPago} className="flex items-end gap-2">
                <Field label="Registrar cobro" htmlFor="pago-monto" className="flex-1">
                  <Input id="pago-monto" type="number" min="0.01" step="0.01" required value={pagoMonto} onChange={e => setPagoMonto(e.target.value)} />
                </Field>
                <Input placeholder="Notas (opcional)" aria-label="Notas del cobro" value={pagoNotas} onChange={e => setPagoNotas(e.target.value)} className="flex-1" />
                <Button type="submit" disabled={pagoSaving}>{pagoSaving && <Spinner />} Cobrar</Button>
              </form>

              <div className="flex flex-col gap-1">
                <p className="text-micro font-semibold text-placeholder">Movimientos</p>
                <div className="max-h-64 overflow-y-auto rounded-md border border-border">
                  {cuenta.movements.length === 0 ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">Sin movimientos todavía.</p>
                  ) : (
                    cuenta.movements.map(m => (
                      <div key={m.id} className="flex items-center gap-2 border-b border-border-soft px-3 py-2 text-sm last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="truncate">
                            {m.type === 'sale' ? 'Venta a cuenta corriente' : m.type === 'payment' ? 'Cobro' : 'Ajuste'}
                            {m.notes ? ` · ${m.notes}` : ''}
                          </p>
                          <p className="text-xs text-placeholder">{new Date(m.occurredAt).toLocaleString('es-AR')} · {m.userName}</p>
                        </div>
                        <span className={cn('shrink-0 font-medium tabular', Number(m.amount) > 0 ? 'text-warning' : 'text-success')}>
                          {Number(m.amount) > 0 ? '+' : ''}{money(Number(m.amount))}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            cuentaError && <Alert variant="destructive">{cuentaError}</Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCuentaOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
