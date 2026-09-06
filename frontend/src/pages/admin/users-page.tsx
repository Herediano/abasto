import { useEffect, useState, type FormEvent } from 'react';
import { PencilSimple, Plus, UsersThree as UsersIcon } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/page-header';
import { PageSpinner, Spinner } from '@/components/spinner';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, type Branch, type Rango, type TeamUser } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const EMPTY_CREATE_FORM = { name: '', email: '', password: '', rangoId: '', branchId: '' };
const EMPTY_EDIT_FORM = { name: '', rangoId: '', branchId: '', isActive: true };

export function UsersPage() {
  const { session, refresh } = useAuth();
  const token = session!.accessToken;
  const [items, setItems] = useState<TeamUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rangos, setRangos] = useState<Rango[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [editing, setEditing] = useState<TeamUser | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [saving, setSaving] = useState(false);

  const load = () =>
    api<TeamUser[]>('/users', {}, token)
      .then(setItems)
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));

  useEffect(() => {
    void load();
    api<Branch[]>('/branches', {}, token).then(setBranches).catch(e => setError(errorMessage(e)));
    api<Rango[]>('/rangos', {}, token).then(setRangos).catch(e => setError(errorMessage(e)));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setCreateForm({ ...EMPTY_CREATE_FORM, rangoId: rangos[0]?.id ?? '', branchId: branches[0]?.id ?? '' });
    setError('');
    setCreateOpen(true);
  }

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api('/users', { method: 'POST', body: JSON.stringify({ ...createForm, branchId: createForm.branchId || undefined }) }, token);
      setCreateOpen(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function openEdit(u: TeamUser) {
    setEditing(u);
    setEditForm({ name: u.name, rangoId: u.rangoId, branchId: u.branchId ?? '', isActive: u.isActive });
    setError('');
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      await api(`/users/${editing.id}`, { method: 'PUT', body: JSON.stringify({ ...editForm, branchId: editForm.branchId || null }) }, token);
      // Si te editaste a vos mismo (rango o sucursal), la sesión en memoria quedó vieja.
      if (editing.id === session!.user.id) await refresh();
      setEditing(null);
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
        title="Usuarios"
        description="El equipo, su rango y la sucursal donde trabaja cada uno."
        actions={
          <Button onClick={openCreate}>
            <Plus /> Nuevo usuario
          </Button>
        }
      />
      {error && !createOpen && !editing && <Alert variant="destructive">{error}</Alert>}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <PageSpinner />
          ) : items.length === 0 ? (
            <EmptyState icon={UsersIcon} title="Sin usuarios" description="Todavía no hay usuarios en este tenant." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rango</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.rangoName === 'Dueño' ? 'default' : 'secondary'}>{u.rangoName}</Badge>
                    </TableCell>
                    <TableCell>{u.branch?.name ?? <span className="text-warning">sin asignar</span>}</TableCell>
                    <TableCell>
                      <Badge variant={u.isActive ? 'success' : 'destructive'}>{u.isActive ? 'Activo' : 'Inactivo'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                        <PencilSimple />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
          </DialogHeader>
          {error && createOpen && <Alert variant="destructive">{error}</Alert>}
          <form className="grid gap-4" onSubmit={submitCreate}>
            <Field label="Nombre" htmlFor="create-name">
              <Input id="create-name" required value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
            </Field>
            <Field label="Email" htmlFor="create-email">
              <Input id="create-email" required type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} />
            </Field>
            <Field label="Contraseña" htmlFor="create-password" hint="(mínimo 8 caracteres)">
              <Input id="create-password" required minLength={8} type="password" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} />
            </Field>
            <Field label="Rango" htmlFor="create-rango">
              <Select id="create-rango" required value={createForm.rangoId} onChange={e => setCreateForm({ ...createForm, rangoId: e.target.value })}>
                <option value="" disabled>Elegí un rango</option>
                {rangos.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </Field>
            <Field label="Sucursal" htmlFor="create-branch" hint="dónde trabaja">
              <Select id="create-branch" value={createForm.branchId} onChange={e => setCreateForm({ ...createForm, branchId: e.target.value })}>
                <option value="">Sin asignar</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Spinner />} Crear usuario
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
          </DialogHeader>
          {error && editing && <Alert variant="destructive">{error}</Alert>}
          <form className="grid gap-4" onSubmit={submitEdit}>
            <Field label="Nombre" htmlFor="edit-name">
              <Input id="edit-name" required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </Field>
            <Field label="Rango" htmlFor="edit-rango">
              <Select id="edit-rango" value={editForm.rangoId} onChange={e => setEditForm({ ...editForm, rangoId: e.target.value })}>
                {rangos.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </Field>
            <Field label="Sucursal" htmlFor="edit-branch">
              <Select id="edit-branch" value={editForm.branchId} onChange={e => setEditForm({ ...editForm, branchId: e.target.value })}>
                <option value="">Sin asignar</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
            <div className="flex items-center gap-2">
              <Checkbox id="edit-active" checked={editForm.isActive} onCheckedChange={checked => setEditForm({ ...editForm, isActive: checked === true })} />
              <Label htmlFor="edit-active" className="font-normal">
                Usuario activo
              </Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Spinner />} Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
