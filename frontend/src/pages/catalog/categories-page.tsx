import { useEffect, useState, type FormEvent } from 'react';
import { PencilSimple, Plus, Shapes, Trash } from '@phosphor-icons/react';
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
import { api, errorMessage, type Category } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export function CategoriesPage() {
  const { session, isAdmin } = useAuth();
  const token = session!.accessToken;
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [reassignTo, setReassignTo] = useState('');
  const [removing, setRemoving] = useState(false);

  const load = () =>
    api<Category[]>('/categories', {}, token)
      .then(setItems)
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));

  useEffect(() => { void load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setEditing(null);
    setName('');
    setError('');
    setOpen(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setName(c.name);
    setError('');
    setOpen(true);
  }

  function openDelete(c: Category) {
    setDeleting(c);
    setReassignTo('');
    setError('');
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) await api(`/categories/${editing.id}`, { method: 'PUT', body: JSON.stringify({ name }) }, token);
      else await api('/categories', { method: 'POST', body: JSON.stringify({ name }) }, token);
      setOpen(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setRemoving(true);
    setError('');
    try {
      const query = reassignTo ? `?reassignTo=${reassignTo}` : '';
      await api(`/categories/${deleting.id}${query}`, { method: 'DELETE' }, token);
      setDeleting(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Categorías"
        description="Rubros para clasificar los productos del catálogo."
        actions={
          isAdmin && (
            <Button onClick={openCreate}>
              <Plus /> Nueva categoría
            </Button>
          )
        }
      />
      {error && !open && !deleting && <Alert variant="destructive">{error}</Alert>}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <PageSpinner />
          ) : items.length === 0 ? (
            <EmptyState icon={Shapes} title="Sin categorías" description="Creá categorías para agrupar y filtrar los productos." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Productos</TableHead>
                  {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{c.productCount ?? 0}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                            <PencilSimple />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openDelete(c)}>
                            <Trash />
                          </Button>
                        </div>
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
            <DialogTitle>{editing ? 'Renombrar categoría' : 'Nueva categoría'}</DialogTitle>
          </DialogHeader>
          {error && <Alert variant="destructive">{error}</Alert>}
          <form className="grid gap-4" onSubmit={submit}>
            <Field label="Nombre" htmlFor="category-name">
              <Input id="category-name" required autoFocus value={name} onChange={e => setName(e.target.value)} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Spinner />} {editing ? 'Guardar' : 'Crear categoría'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar «{deleting?.name}»</DialogTitle>
          </DialogHeader>
          {error && <Alert variant="destructive">{error}</Alert>}
          {deleting && (deleting.productCount ?? 0) > 0 ? (
            <div className="grid gap-4">
              <p className="text-sm text-muted-foreground">
                Esta categoría tiene <span className="font-medium text-foreground">{deleting.productCount}</span> producto{deleting.productCount === 1 ? '' : 's'}. ¿Qué hacemos con
                {deleting.productCount === 1 ? ' él' : ' ellos'}?
              </p>
              <Field label="Destino de los productos" htmlFor="reassign">
                <Select id="reassign" value={reassignTo} onChange={e => setReassignTo(e.target.value)}>
                  <option value="">Dejarlos sin categoría</option>
                  {items.filter(c => c.id !== deleting.id).map(c => (
                    <option key={c.id} value={c.id}>Pasarlos a: {c.name}</option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay productos en esta categoría. Se elimina sin afectar el catálogo.</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={removing}>
              {removing && <Spinner />} Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
