import { useEffect, useState, type FormEvent } from 'react';
import { CashRegister as RegisterIcon, PencilSimple, Plus, Warehouse as WarehouseIcon } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
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
import { api, errorMessage, type CashRegister, type Warehouse } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const EMPTY_FORM = { name: '', code: '', address: '' };

export function WarehousesPage() {
  const { session, can } = useAuth();
  const puedeEditar = can('depositos.editar');
  const puedeCajas = can('caja.administrar');
  const token = session!.accessToken;
  const [items, setItems] = useState<Warehouse[]>([]);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [cajaOpen, setCajaOpen] = useState(false);
  const [cajaForm, setCajaForm] = useState({ name: '', warehouseId: '' });
  const [savingCaja, setSavingCaja] = useState(false);

  const load = () =>
    Promise.all([
      api<Warehouse[]>('/warehouses', {}, token),
      puedeCajas || can('caja.operar') ? api<CashRegister[]>('/cash-registers', {}, token) : Promise.resolve([]),
    ])
      .then(([ws, regs]) => { setItems(ws); setRegisters(regs); })
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));

  useEffect(() => { void load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  function openCaja(warehouseId: string) {
    setCajaForm({ name: '', warehouseId });
    setError('');
    setCajaOpen(true);
  }
  async function submitCaja(e: FormEvent) {
    e.preventDefault();
    setSavingCaja(true);
    setError('');
    try {
      await api('/cash-registers', { method: 'POST', body: JSON.stringify(cajaForm) }, token);
      setCajaOpen(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingCaja(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setOpen(true);
  }

  function openEdit(w: Warehouse) {
    setEditing(w);
    setForm({ name: w.name, code: w.code, address: w.address ?? '' });
    setError('');
    setOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) await api(`/warehouses/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) }, token);
      else await api('/warehouses', { method: 'POST', body: JSON.stringify(form) }, token);
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
        title="Depósitos"
        description="Sucursales y depósitos donde se guarda stock."
        actions={
          can('depositos.crear') ? (
            <Button onClick={openCreate}>
              <Plus /> Nuevo depósito
            </Button>
          ) : undefined
        }
      />
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <PageSpinner />
          ) : items.length === 0 ? (
            <EmptyState icon={WarehouseIcon} title="Sin depósitos" description="Creá al menos un depósito antes de registrar stock." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Cajas</TableHead>
                  {(puedeEditar || puedeCajas) && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(w => {
                  const cajas = registers.filter(r => r.warehouseId === w.id);
                  return (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell className="font-mono text-xs">{w.code}</TableCell>
                    <TableCell>{w.address ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cajas.length ? cajas.map(c => c.name).join(', ') : <span className="text-destructive">sin cajas</span>}
                    </TableCell>
                    {(puedeEditar || puedeCajas) && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {puedeCajas && (
                            <Button variant="ghost" size="sm" onClick={() => openCaja(w.id)}>
                              <RegisterIcon /> Caja
                            </Button>
                          )}
                          {puedeEditar && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(w)}>
                              <PencilSimple />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={cajaOpen} onOpenChange={setCajaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva caja</DialogTitle>
          </DialogHeader>
          {error && cajaOpen && <Alert variant="destructive">{error}</Alert>}
          <form className="grid gap-4" onSubmit={submitCaja}>
            <Field label="Depósito" htmlFor="caja-wh">
              <Select id="caja-wh" required value={cajaForm.warehouseId} onChange={e => setCajaForm({ ...cajaForm, warehouseId: e.target.value })}>
                <option value="" disabled>Elegí un depósito</option>
                {items.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </Field>
            <Field label="Nombre de la caja" htmlFor="caja-name" hint="p. ej. «Caja 1», «Caja fondo»">
              <Input id="caja-name" required value={cajaForm.name} onChange={e => setCajaForm({ ...cajaForm, name: e.target.value })} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCajaOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={savingCaja}>{savingCaja && <Spinner />} Crear caja</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar depósito' : 'Nuevo depósito'}</DialogTitle>
          </DialogHeader>
          {error && <Alert variant="destructive">{error}</Alert>}
          <form className="grid gap-4" onSubmit={submit}>
            <Field label="Nombre" htmlFor="name">
              <Input id="name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Código" htmlFor="code">
              <Input id="code" required value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            </Field>
            <Field label="Dirección" htmlFor="address" hint="(opcional)">
              <Input id="address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Spinner />} {editing ? 'Guardar cambios' : 'Crear depósito'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
