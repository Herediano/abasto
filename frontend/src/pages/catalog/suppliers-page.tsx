import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PencilSimple, Plus, ShoppingCartSimple, Truck, Wallet } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { ListFilters } from '@/components/list-filters';
import { ModuleScreen, SummaryLine } from '@/components/module-screen';
import { ExportMenu } from '@/components/export-menu';
import { PageSpinner, Spinner } from '@/components/spinner';
import { SupplierNoteDialog } from '@/components/supplier-note-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, type Supplier, type SupplierAccount } from '@/lib/api';
import { fechaHora, money } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const EMPTY_FORM = { name: '', legalName: '', taxId: '', email: '', phone: '', address: '' };

export function SuppliersPage() {
  const { session, can } = useAuth();
  const puedeEditar = can('proveedores.editar');
  const token = session!.accessToken;
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const filtered = useMemo(() => {
    const q = norm(search.trim());
    if (!q) return items;
    return items.filter(s => norm(`${s.name} ${s.legalName ?? ''} ${s.taxId ?? ''}`).includes(q));
  }, [items, search]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Cuenta corriente: estado de cuenta, pagos y ajustes manuales (notas de
  // débito/crédito), por proveedor.
  const [cuentaOpen, setCuentaOpen] = useState(false);
  const [cuentaProveedor, setCuentaProveedor] = useState<Supplier | null>(null);
  const [cuenta, setCuenta] = useState<SupplierAccount | null>(null);
  const [cuentaLoading, setCuentaLoading] = useState(false);
  const [cuentaError, setCuentaError] = useState('');
  const [pagoMonto, setPagoMonto] = useState('');
  const [pagoNotas, setPagoNotas] = useState('');
  const [pagoSaving, setPagoSaving] = useState(false);
  const [ajusteMonto, setAjusteMonto] = useState('');
  const [ajusteNotas, setAjusteNotas] = useState('');
  const [ajusteSaving, setAjusteSaving] = useState(false);
  const [notaOpen, setNotaOpen] = useState(false);

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

  function openCuenta(s: Supplier) {
    setCuentaProveedor(s);
    setCuenta(null);
    setCuentaError('');
    setPagoMonto('');
    setPagoNotas('');
    setAjusteMonto('');
    setAjusteNotas('');
    setCuentaOpen(true);
    setCuentaLoading(true);
    api<SupplierAccount>(`/suppliers/${s.id}/account`, {}, token)
      .then(setCuenta)
      .catch(e => setCuentaError(errorMessage(e)))
      .finally(() => setCuentaLoading(false));
  }

  async function refrescarCuenta() {
    if (!cuentaProveedor) return;
    const actualizada = await api<SupplierAccount>(`/suppliers/${cuentaProveedor.id}/account`, {}, token);
    setCuenta(actualizada);
    await load();
  }

  async function registrarPago(e: FormEvent) {
    e.preventDefault();
    if (!cuentaProveedor) return;
    setPagoSaving(true);
    setCuentaError('');
    try {
      await api(`/suppliers/${cuentaProveedor.id}/account/payments`, { method: 'POST', body: JSON.stringify({ amount: Number(pagoMonto), notes: pagoNotas || undefined }) }, token);
      await refrescarCuenta();
      setPagoMonto('');
      setPagoNotas('');
    } catch (err) {
      setCuentaError(errorMessage(err));
    } finally {
      setPagoSaving(false);
    }
  }

  async function registrarAjuste(e: FormEvent) {
    e.preventDefault();
    if (!cuentaProveedor) return;
    setAjusteSaving(true);
    setCuentaError('');
    try {
      await api(`/suppliers/${cuentaProveedor.id}/account/adjustments`, { method: 'POST', body: JSON.stringify({ amount: Number(ajusteMonto), notes: ajusteNotas }) }, token);
      await refrescarCuenta();
      setAjusteMonto('');
      setAjusteNotas('');
    } catch (err) {
      setCuentaError(errorMessage(err));
    } finally {
      setAjusteSaving(false);
    }
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

  const deudas = items.filter(s => Number(s.accountBalance ?? 0) > 0);
  const totalDeuda = deudas.reduce((a, s) => a + Number(s.accountBalance ?? 0), 0);
  const resumen = !loading && items.length > 0 && totalDeuda > 0 && (
    <SummaryLine
      items={[
        { label: 'Debemos', value: money(totalDeuda), tone: 'warn' as const },
        { label: 'Proveedores con deuda', value: String(deudas.length) },
      ]}
    />
  );

  return (
    <>
      <ModuleScreen
        title="Proveedores"
        actions={
          <>
            <ExportMenu path="/suppliers" filename="proveedores" />
            {can('proveedores.crear') && (
              <Button onClick={openCreate}>
                <Plus /> Nuevo proveedor
              </Button>
            )}
          </>
        }
        summary={resumen || undefined}
      >
        {error && <Alert variant="destructive">{error}</Alert>}

        <ListFilters
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Buscar proveedor, razón social o CUIT"
          searchLabel="Buscar proveedores"
          activeFilters={[]}
        />

          {loading ? (
            <PageSpinner />
          ) : items.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="Todavía no hay proveedores"
              description="Registrá tu primer proveedor para poder cargar facturas de compra."
              action={can('proveedores.crear') ? <Button onClick={openCreate}><Plus /> Nuevo proveedor</Button> : undefined}
            />
          ) : filtered.length === 0 ? (
            <EmptyState icon={Truck} title="Sin resultados" description={`Ningún proveedor coincide con «${search}».`} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Razón social</TableHead>
                  <TableHead>CUIT</TableHead>
                  <TableHead>Cuenta corriente</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.legalName ?? '—'}</TableCell>
                    <TableCell>{s.taxId ?? '—'}</TableCell>
                    <TableCell className="tabular">
                      {Number(s.accountBalance ?? 0) !== 0
                        ? <span className={Number(s.accountBalance) > 0 ? 'font-medium text-warning' : 'font-medium text-success'}>{money(Number(s.accountBalance))}</span>
                        : <span className="text-muted-foreground">Sin saldo</span>}
                    </TableCell>
                    <TableCell>{s.email ?? '—'}</TableCell>
                    <TableCell>{s.phone ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {can('proveedores.ver') && (
                          <Button variant="ghost" size="icon" onClick={() => openCuenta(s)} aria-label={`Cuenta corriente de ${s.name}`} title="Cuenta corriente">
                            <Wallet />
                          </Button>
                        )}
                        {puedeEditar && (
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)} aria-label={`Editar ${s.name}`}>
                            <PencilSimple />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </ModuleScreen>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
          </DialogHeader>
          {error && <Alert variant="destructive">{error}</Alert>}
          <form className="grid gap-6" onSubmit={submit}>
            <div className="grid gap-3">
              <Field label="Nombre comercial" htmlFor="name">
                <Input id="name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Razón social" htmlFor="legalName" hint="(opcional)">
                  <Input id="legalName" value={form.legalName} onChange={e => setForm({ ...form, legalName: e.target.value })} />
                </Field>
                <Field label="CUIT" htmlFor="taxId" hint="(opcional)">
                  <Input id="taxId" value={form.taxId} onChange={e => setForm({ ...form, taxId: e.target.value })} />
                </Field>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Teléfono" htmlFor="phone" hint="(opcional)">
                <Input id="phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="Email" htmlFor="email" hint="(opcional)">
                <Input id="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Dirección" htmlFor="address" hint="(opcional)" className="col-span-2">
                <Input id="address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </Field>
            </div>
            <DialogFooter>
              {editing && can('compras.ver') && (
                <Button asChild variant="outline" className="mr-auto">
                  <Link to={`/compras?supplierId=${editing.id}`}><ShoppingCartSimple /> Ver compras</Link>
                </Button>
              )}
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

      <Dialog open={cuentaOpen} onOpenChange={setCuentaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cuenta corriente · {cuentaProveedor?.name}</DialogTitle>
          </DialogHeader>
          {cuentaLoading ? (
            <PageSpinner />
          ) : cuenta ? (
            <div className="flex flex-col gap-4">
              {cuentaError && <Alert variant="destructive">{cuentaError}</Alert>}
              <div className="rounded-md border border-border p-3 text-sm">
                <p className="text-chico text-placeholder">Le debemos</p>
                <p className={cuenta.balance > 0 ? 'font-semibold text-warning tabular' : 'font-semibold tabular'}>{money(cuenta.balance)}</p>
              </div>

              {can('compras.crear') && (
                <form onSubmit={registrarPago} className="flex items-end gap-2">
                  <Field label="Registrar pago" htmlFor="pago-monto" className="flex-1">
                    <Input id="pago-monto" type="number" min="0.01" step="0.01" required value={pagoMonto} onChange={e => setPagoMonto(e.target.value)} />
                  </Field>
                  <Input placeholder="Notas (opcional)" aria-label="Notas del pago" value={pagoNotas} onChange={e => setPagoNotas(e.target.value)} className="flex-1" />
                  <Button type="submit" disabled={pagoSaving}>{pagoSaving && <Spinner />} Pagar</Button>
                </form>
              )}

              {can('compras.corregir') && (
                <form onSubmit={registrarAjuste} className="flex items-end gap-2">
                  <Field label="Ajuste manual" htmlFor="ajuste-monto" hint="+ suma deuda, − la resta, sin factura" className="flex-1">
                    <Input id="ajuste-monto" type="number" step="0.01" required value={ajusteMonto} onChange={e => setAjusteMonto(e.target.value)} />
                  </Field>
                  <Input placeholder="Motivo" aria-label="Motivo del ajuste" required value={ajusteNotas} onChange={e => setAjusteNotas(e.target.value)} className="flex-1" />
                  <Button type="submit" variant="outline" disabled={ajusteSaving}>{ajusteSaving && <Spinner />} Ajustar</Button>
                </form>
              )}

              {can('compras.corregir') && (
                <Button type="button" variant="outline" className="self-start" onClick={() => setNotaOpen(true)}>
                  Nota de crédito / débito con factura
                </Button>
              )}

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
                            {m.type === 'invoice'
                              ? (m.comprobante ?? 'Factura')
                              : m.type === 'payment'
                                ? 'Pago'
                                : m.noteKind === 'credit_note'
                                  ? 'Nota de crédito'
                                  : m.noteKind === 'debit_note'
                                    ? 'Nota de débito'
                                    : 'Ajuste'}
                            {m.notes && m.type !== 'invoice' ? ` · ${m.notes}` : ''}
                          </p>
                          <p className="text-chico text-placeholder">{fechaHora(m.occurredAt)} · {m.userName}</p>
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

      {cuentaProveedor && (
        <SupplierNoteDialog
          open={notaOpen}
          onOpenChange={setNotaOpen}
          token={token}
          supplierId={cuentaProveedor.id}
          supplierName={cuentaProveedor.name}
          onCreated={() => { void refrescarCuenta(); }}
        />
      )}
    </>
  );
}
