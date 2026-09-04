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
import { api, errorMessage, type TeamUser, type Warehouse } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const EMPTY_CREATE_FORM = { name: '', email: '', password: '', warehouseId: '' };
const EMPTY_EDIT_FORM = { name: '', role: 'user' as 'admin' | 'user', warehouseId: '', isActive: true };

export function UsersPage() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [items, setItems] = useState<TeamUser[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
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
    api<Warehouse[]>('/warehouses', {}, token)
      .then(setWarehouses)
      .catch(e => setError(errorMessage(e)));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setCreateForm(EMPTY_CREATE_FORM);
    setError('');
    setCreateOpen(true);
  }

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api('/users', { method: 'POST', body: JSON.stringify({ ...createForm, warehouseId: createForm.warehouseId || undefined }) }, token);
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
    setEditForm({ name: u.name, role: u.role, warehouseId: u.warehouseId ?? '', isActive: u.isActive });
    setError('');
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      await api(`/users/${editing.id}`, { method: 'PUT', body: JSON.stringify({ ...editForm, warehouseId: editForm.warehouseId || null }) }, token);
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
        description="Gestioná el equipo, sus roles y el depósito que tienen asignado."
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
                  <TableHead>Rol</TableHead>
                  <TableHead>Depósito</TableHead>
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
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{u.warehouse?.name ?? '—'}</TableCell>
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
            <Field label="Depósito" htmlFor="create-warehouse" hint="(opcional)">
              <Select id="create-warehouse" value={createForm.warehouseId} onChange={e => setCreateForm({ ...createForm, warehouseId: e.target.value })}>
                <option value="">Sin asignar</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
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
            <Field label="Rol" htmlFor="edit-role">
              <Select id="edit-role" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value as 'admin' | 'user' })}>
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </Select>
            </Field>
            <Field label="Depósito" htmlFor="edit-warehouse">
              <Select id="edit-warehouse" value={editForm.warehouseId} onChange={e => setEditForm({ ...editForm, warehouseId: e.target.value })}>
                <option value="">Sin asignar</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
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
