import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Copy, PencilSimple, Plus, ShieldWarning, Trash, UsersThree } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { PageSpinner, Spinner } from '@/components/spinner';
import { Select } from '@/components/ui/select';
import { api, errorMessage, type Permission, type Rango } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export function RangosPage() {
  const { session, can } = useAuth();
  const token = session!.accessToken;
  const puedeGestionar = can('rangos.gestionar');

  const [rangos, setRangos] = useState<Rango[]>([]);
  const [catalog, setCatalog] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Rango | null>(null);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [cloneFromId, setCloneFromId] = useState('');
  const [creando, setCreando] = useState(false);
  const [nuevoError, setNuevoError] = useState('');

  const load = () => {
    setLoading(true);
    return Promise.all([api<Rango[]>('/rangos', {}, token), api<Permission[]>('/rangos/catalogo', {}, token)])
      .then(([r, c]) => { setRangos(r); setCatalog(c); })
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { void load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const areas = useMemo(() => {
    const grupos = new Map<string, Permission[]>();
    for (const p of catalog) {
      if (!grupos.has(p.area)) grupos.set(p.area, []);
      grupos.get(p.area)!.push(p);
    }
    return [...grupos.entries()];
  }, [catalog]);

  function abrirEdicion(r: Rango) {
    setEditing(r);
    setName(r.name);
    setSelected(new Set(r.permissions));
    setFormError('');
    setOpen(true);
  }

  function toggle(key: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setFormError('');
    try {
      await api(`/rangos/${editing.id}`, { method: 'PUT', body: JSON.stringify({ name, permissions: [...selected] }) }, token);
      setOpen(false);
      await load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function crear(e: FormEvent) {
    e.preventDefault();
    setCreando(true);
    setNuevoError('');
    try {
      const creado = await api<Rango>('/rangos', { method: 'POST', body: JSON.stringify({ name: nuevoNombre, cloneFromId: cloneFromId || undefined }) }, token);
      setNuevoOpen(false);
      setNuevoNombre('');
      setCloneFromId('');
      await load();
      abrirEdicion(creado);
    } catch (err) {
      setNuevoError(errorMessage(err));
    } finally {
      setCreando(false);
    }
  }

  async function borrar(r: Rango) {
    setError('');
    try {
      await api(`/rangos/${r.id}`, { method: 'DELETE' }, token);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Rangos"
        description="Qué puede hacer cada rol. Los 7 de fábrica se pueden clonar y editar; un permiso nuevo nunca aparece solo en uno que ya existe."
        actions={puedeGestionar ? <Button onClick={() => { setNuevoNombre(''); setCloneFromId(''); setNuevoError(''); setNuevoOpen(true); }}><Plus /> Nuevo rango</Button> : undefined}
      />
      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <PageSpinner />
          ) : rangos.length === 0 ? (
            <EmptyState icon={UsersThree} title="Sin rangos" description="Todavía no hay rangos configurados." />
          ) : (
            <div className="divide-y divide-border-soft">
              {rangos.map(r => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{r.name}</p>
                      {r.isSystem && <Badge variant="secondary">De fábrica</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{r.permissions.length} permisos · {r.userCount} {r.userCount === 1 ? 'usuario' : 'usuarios'}</p>
                  </div>
                  {puedeGestionar && (
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" onClick={() => abrirEdicion(r)} aria-label={`Editar ${r.name}`}>
                        <PencilSimple />
                      </Button>
                      <Button
                        variant="ghost" size="icon" onClick={() => borrar(r)} disabled={r.userCount > 0}
                        title={r.userCount > 0 ? 'Reasigná a sus usuarios antes de borrarlo' : undefined}
                        aria-label={`Borrar ${r.name}`}
                      >
                        <Trash />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.name}</DialogTitle>
          </DialogHeader>
          {formError && <Alert variant="destructive">{formError}</Alert>}
          <form onSubmit={guardar} className="grid gap-4">
            <Field label="Nombre" htmlFor="r-name">
              <Input id="r-name" required value={name} onChange={e => setName(e.target.value)} disabled={!puedeGestionar} />
            </Field>

            <div className="flex max-h-[50vh] flex-col gap-4 overflow-y-auto pr-1">
              {areas.map(([area, perms]) => (
                <div key={area} className="rounded-md border border-border">
                  <p className="border-b border-border-soft bg-subtle px-3 py-1.5 text-xs font-semibold text-placeholder">{area}</p>
                  <div className="divide-y divide-border-soft">
                    {perms.map(p => (
                      <label key={p.key} className="flex items-center gap-2.5 px-3 py-2 text-sm">
                        <Checkbox checked={selected.has(p.key)} onCheckedChange={() => toggle(p.key)} disabled={!puedeGestionar} />
                        <span className="flex-1">{p.label}</span>
                        {p.dangerous && (
                          <span title="Permiso sensible">
                            <ShieldWarning weight="fill" className="size-4 shrink-0 text-warning" />
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cerrar</Button>
              {puedeGestionar && <Button type="submit" disabled={saving}>{saving && <Spinner />} Guardar cambios</Button>}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={nuevoOpen} onOpenChange={setNuevoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo rango</DialogTitle>
          </DialogHeader>
          {nuevoError && <Alert variant="destructive">{nuevoError}</Alert>}
          <form onSubmit={crear} className="grid gap-4">
            <Field label="Nombre" htmlFor="n-name">
              <Input id="n-name" required autoFocus value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} />
            </Field>
            <Field label="Clonar permisos de" htmlFor="n-clone" hint="(opcional — si no, arranca sin ninguno)">
              <Select id="n-clone" value={cloneFromId} onChange={e => setCloneFromId(e.target.value)}>
                <option value="">Ninguno</option>
                {rangos.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </Field>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Copy className="size-3.5 shrink-0" /> Después de crearlo se abre para terminar de marcar los permisos.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNuevoOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={creando}>{creando && <Spinner />} Crear rango</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
