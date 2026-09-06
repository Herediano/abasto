import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Check, Moon, PencilSimple, Plus, Storefront, Sun, Trash, UploadSimple } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/spinner';
import { AccountList } from '@/components/account-list';
import { api, errorMessage, type Branch, type Session } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { fileToResizedDataUrl } from '@/lib/image';
import { hueFor, moduleByKey, settingsModules } from '@/lib/modules';
import { AVATAR_COLORS } from '@/lib/prefs';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

const OWNER_RANGO = 'Dueño';

const TIMEZONES: { value: string; label: string }[] = [
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina — Buenos Aires' },
  { value: 'America/Argentina/Cordoba', label: 'Argentina — Córdoba' },
  { value: 'America/Argentina/Mendoza', label: 'Argentina — Mendoza' },
  { value: 'America/Argentina/Salta', label: 'Argentina — Salta' },
  { value: 'America/Argentina/Tucuman', label: 'Argentina — Tucumán' },
  { value: 'America/Argentina/Ushuaia', label: 'Argentina — Ushuaia' },
  { value: 'America/Montevideo', label: 'Uruguay — Montevideo' },
  { value: 'America/Santiago', label: 'Chile — Santiago' },
  { value: 'America/Asuncion', label: 'Paraguay — Asunción' },
  { value: 'America/La_Paz', label: 'Bolivia — La Paz' },
  { value: 'America/Sao_Paulo', label: 'Brasil — San Pablo' },
];

const iniciales = (name: string) =>
  name.split(' ').slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase();

/** Bloque de una sección: título, bajada y contenido, todos con el mismo molde. */
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="font-display text-[15px] font-bold tracking-tight">{title}</h2>
      {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <p className="mb-3 mt-9 text-[11px] font-semibold uppercase tracking-widest text-placeholder first:mt-0">{label}</p>
  );
}

export function AjustesPage() {
  const { session, can, refresh } = useAuth();
  const user = session!.user;
  const esDueno = user.rangoName === OWNER_RANGO;
  const modsAjustes = settingsModules(can);

  return (
    <>
      <PageHeader title="Ajustes" description="Tu perfil, tus preferencias y la empresa." />
      <div className="grid gap-4 pb-6">
        <Divider label="Mi cuenta" />
        <PerfilSection session={session!} onSaved={refresh} />
        <PasswordSection token={session!.accessToken} />
        <PreferenciasSection />
        <Section title="Sesiones en este dispositivo" description="Podés tener varias cuentas abiertas y alternar entre ellas sin volver a escribir la contraseña.">
          <AccountList />
        </Section>

        {esDueno && (
          <>
            <Divider label="La empresa" />
            <EmpresaSection session={session!} onSaved={refresh} />
            <SucursalesSection token={session!.accessToken} />
          </>
        )}

        {modsAjustes.length > 0 && (
          <Section title="Administración" description="Quién entra al sistema y qué puede tocar cada rango.">
            <div className="grid gap-2 sm:grid-cols-2">
              {modsAjustes.map(m => <ModuleLink key={m.key} moduleKey={m.key} />)}
            </div>
          </Section>
        )}
      </div>
    </>
  );
}

function ModuleLink({ moduleKey }: { moduleKey: string }) {
  const navigate = useNavigate();
  const m = moduleByKey(moduleKey)!;
  return (
    <button
      type="button"
      onClick={() => navigate(m.path, { viewTransition: true })}
      style={{ ['--h' as string]: hueFor(m.key) }}
      className="group flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-[var(--h)]"
    >
      <span className="flex size-8 items-center justify-center rounded-lg text-white" style={{ background: 'var(--h)' }}>
        <m.Icon weight="fill" className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold">{m.label}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{m.blurb}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-placeholder transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

/* ── Mi cuenta ──────────────────────────────────────────────────────────── */

function PerfilSection({ session, onSaved }: { session: Session; onSaved: () => Promise<void> }) {
  const user = session.user;
  const [form, setForm] = useState({ name: user.name, email: user.email });
  const [color, setColor] = useState(user.preferences?.avatarColor ?? AVATAR_COLORS[0]);
  const [state, setState] = useState<'idle' | 'saving' | 'ok'>('idle');
  const [error, setError] = useState('');

  const dirty = form.name.trim() !== user.name || form.email.trim() !== user.email || color !== (user.preferences?.avatarColor ?? AVATAR_COLORS[0]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState('saving');
    setError('');
    try {
      await api('/auth/me', { method: 'PATCH', body: JSON.stringify({ name: form.name, email: form.email, preferences: { avatarColor: color } }) }, session.accessToken);
      await onSaved();
      setState('ok');
      setTimeout(() => setState('idle'), 1800);
    } catch (err) {
      setError(errorMessage(err));
      setState('idle');
    }
  }

  return (
    <Section title="Perfil" description="Cómo te ve el resto del equipo.">
      {error && <Alert variant="destructive" className="mb-3">{error}</Alert>}
      <form className="grid gap-4" onSubmit={submit}>
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full font-display text-lg font-bold text-white" style={{ background: color }}>
            {iniciales(form.name || user.name)}
          </span>
          <div className="flex flex-wrap gap-2">
            {AVATAR_COLORS.map(c => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => setColor(c)}
                className={cn('size-7 rounded-full ring-offset-2 ring-offset-card transition-all', color === c && 'ring-2 ring-foreground')}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" htmlFor="perfil-nombre">
            <Input id="perfil-nombre" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email" htmlFor="perfil-email" hint="también es tu usuario para entrar">
            <Input id="perfil-email" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!dirty || state === 'saving'}>
            {state === 'saving' && <Spinner />} {state === 'ok' ? <><Check /> Guardado</> : 'Guardar cambios'}
          </Button>
          <span className="text-[12px] text-muted-foreground">Empresa: <strong className="font-medium text-foreground">{session.tenant.name}</strong> · Rango: <strong className="font-medium text-foreground">{user.rangoName}</strong></span>
        </div>
      </form>
    </Section>
  );
}

function PasswordSection({ token }: { token: string }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', repeat: '' });
  const [state, setState] = useState<'idle' | 'saving' | 'ok'>('idle');
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.repeat) { setError('La nueva contraseña y su repetición no coinciden'); return; }
    setState('saving');
    setError('');
    try {
      await api('/auth/me', { method: 'PATCH', body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }) }, token);
      setForm({ currentPassword: '', newPassword: '', repeat: '' });
      setState('ok');
      setTimeout(() => setState('idle'), 1800);
    } catch (err) {
      setError(errorMessage(err));
      setState('idle');
    }
  }

  return (
    <Section title="Contraseña" description="Al menos 8 caracteres. Te va a pedir la actual para confirmar.">
      {error && <Alert variant="destructive" className="mb-3">{error}</Alert>}
      <form className="grid max-w-md gap-4" onSubmit={submit}>
        <Field label="Contraseña actual" htmlFor="pw-actual">
          <Input id="pw-actual" type="password" required autoComplete="current-password" value={form.currentPassword} onChange={e => setForm({ ...form, currentPassword: e.target.value })} />
        </Field>
        <Field label="Nueva contraseña" htmlFor="pw-nueva">
          <Input id="pw-nueva" type="password" required minLength={8} autoComplete="new-password" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} />
        </Field>
        <Field label="Repetir la nueva" htmlFor="pw-rep">
          <Input id="pw-rep" type="password" required minLength={8} autoComplete="new-password" value={form.repeat} onChange={e => setForm({ ...form, repeat: e.target.value })} />
        </Field>
        <Button type="submit" disabled={state === 'saving'} className="justify-self-start">
          {state === 'saving' && <Spinner />} {state === 'ok' ? <><Check /> Cambiada</> : 'Cambiar contraseña'}
        </Button>
      </form>
    </Section>
  );
}

function PreferenciasSection() {
  const { theme, setTheme } = useTheme();
  return (
    <Section title="Preferencias" description="Se guardan en este dispositivo. La densidad de las tablas se cambia desde «Configurar» en el escritorio.">
      <Choice label="Tema">
        <Toggle active={theme === 'light'} onClick={() => setTheme('light')}><Sun weight="fill" className="size-4" /> Claro</Toggle>
        <Toggle active={theme === 'dark'} onClick={() => setTheme('dark')}><Moon weight="fill" className="size-4" /> Oscuro</Toggle>
      </Choice>
    </Section>
  );
}

function Choice({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[220px_1fr] sm:items-center">
      <div>
        <p className="text-[13px] font-medium">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors',
        active ? 'border-accent-border bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:bg-background hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

/* ── La empresa (Dueño) ─────────────────────────────────────────────────── */

function EmpresaSection({ session, onSaved }: { session: Session; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(session.tenant.name);
  const [logo, setLogo] = useState<string | null>(session.tenant.logo ?? null);
  const [tz, setTz] = useState(session.tenant.timezone ?? TIMEZONES[0].value);
  const [state, setState] = useState<'idle' | 'saving' | 'ok'>('idle');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = name.trim() !== session.tenant.name || logo !== (session.tenant.logo ?? null) || tz !== (session.tenant.timezone ?? TIMEZONES[0].value);

  async function pickLogo(file: File | undefined) {
    if (!file) return;
    setError('');
    try {
      setLogo(await fileToResizedDataUrl(file, 256));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState('saving');
    setError('');
    try {
      await api('/auth/tenant', { method: 'PATCH', body: JSON.stringify({ name, logo, timezone: tz }) }, session.accessToken);
      await onSaved();
      setState('ok');
      setTimeout(() => setState('idle'), 1800);
    } catch (err) {
      setError(errorMessage(err));
      setState('idle');
    }
  }

  return (
    <Section title="Datos de la empresa" description="Sólo vos, como Dueño, ves y cambiás esto.">
      {error && <Alert variant="destructive" className="mb-3">{error}</Alert>}
      <form className="grid gap-4" onSubmit={submit}>
        <div className="flex items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-background">
            {logo
              ? <img src={logo} alt="Logo" className="size-full object-contain" />
              : <span className="font-display text-lg font-bold text-primary">{name.slice(0, 1).toUpperCase() || 'A'}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => void pickLogo(e.target.files?.[0])} />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <UploadSimple /> {logo ? 'Cambiar logo' : 'Subir logo'}
            </Button>
            {logo && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setLogo(null)}>
                <Trash /> Quitar
              </Button>
            )}
            <p className="w-full text-[11px] text-muted-foreground">
              Por ahora se muestra en el escritorio. En los comprobantes, más adelante.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre de la empresa" htmlFor="emp-nombre">
            <Input id="emp-nombre" required value={name} onChange={e => setName(e.target.value)} />
          </Field>
          <Field label="Zona horaria" htmlFor="emp-tz" hint="para fechas y cortes del día">
            <Select id="emp-tz" value={tz} onChange={e => setTz(e.target.value)}>
              {TIMEZONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </Field>
        </div>
        <Button type="submit" disabled={!dirty || state === 'saving'} className="justify-self-start">
          {state === 'saving' && <Spinner />} {state === 'ok' ? <><Check /> Guardado</> : 'Guardar cambios'}
        </Button>
      </form>
    </Section>
  );
}

const EMPTY_SUCURSAL = { name: '', code: '', address: '' };

function SucursalesSection({ token }: { token: string }) {
  const [items, setItems] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState(EMPTY_SUCURSAL);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Branch | null>(null);

  const load = () =>
    api<Branch[]>('/branches?includeInactive=1', {}, token)
      .then(setItems)
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  useEffect(() => { void load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  function nueva() {
    setEditing(null);
    setForm(EMPTY_SUCURSAL);
    setError('');
    setOpen(true);
  }
  function editar(b: Branch) {
    setEditing(b);
    setForm({ name: b.name, code: b.code, address: b.address ?? '' });
    setError('');
    setOpen(true);
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const path = editing ? `/branches/${editing.id}` : '/branches';
      await api(path, { method: editing ? 'PUT' : 'POST', body: JSON.stringify(form) }, token);
      setOpen(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  async function accion(id: string, run: () => Promise<unknown>) {
    setBusyId(id);
    setError('');
    try {
      await run();
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
      setConfirmDelete(null);
    }
  }
  const toggleActiva = (b: Branch) =>
    accion(b.id, () => api(`/branches/${b.id}`, { method: 'PUT', body: JSON.stringify({ isActive: !b.isActive }) }, token));
  const eliminar = (b: Branch) =>
    accion(b.id, () => api(`/branches/${b.id}`, { method: 'DELETE' }, token));

  return (
    <Section title="Sucursales" description="Cada sucursal es un local del negocio. Nace con un depósito y una caja; los depósitos extra se agregan desde el módulo Depósitos.">
      {error && !open && <Alert variant="destructive" className="mb-3">{error}</Alert>}
      {loading ? (
        <Spinner />
      ) : (
        <div className="grid gap-2">
          {items.map(b => (
            <div
              key={b.id}
              className={cn(
                'flex items-center gap-3 rounded-md border px-3 py-2.5',
                b.isActive ? 'border-border bg-background' : 'border-dashed border-border bg-muted/40',
              )}
            >
              <Storefront weight="fill" className={cn('size-4 shrink-0', b.isActive ? 'text-primary' : 'text-placeholder')} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[13px] font-semibold">
                  {b.name}
                  {!b.isActive && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Inactiva</span>}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {b.code}{b.address ? ` · ${b.address}` : ''} · {b._count?.warehouses ?? 0} {b._count?.warehouses === 1 ? 'depósito' : 'depósitos'}
                  {b._count?.users ? ` · ${b._count.users} ${b._count.users === 1 ? 'usuario' : 'usuarios'}` : ''}
                </span>
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => editar(b)} aria-label="Editar sucursal" disabled={busyId === b.id}>
                  <PencilSimple />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleActiva(b)}
                  disabled={busyId === b.id || (b.isActive && !b.canDeactivate)}
                  title={b.isActive && !b.canDeactivate ? 'Reasigná los usuarios y dejá otra activa primero' : undefined}
                >
                  {busyId === b.id ? <Spinner /> : b.isActive ? 'Desactivar' : 'Activar'}
                </Button>
                {b.canDelete && (
                  <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(b)} aria-label="Eliminar sucursal" disabled={busyId === b.id}>
                    <Trash />
                  </Button>
                )}
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={nueva} className="mt-1 justify-self-start">
            <Plus /> Nueva sucursal
          </Button>
        </div>
      )}

      <Dialog open={!!confirmDelete} onOpenChange={o => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar {confirmDelete?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se borra la sucursal con su depósito y su caja. No se puede deshacer. Sólo se permite porque no tiene ventas, stock ni turnos.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button type="button" variant="destructive" disabled={!!busyId} onClick={() => confirmDelete && eliminar(confirmDelete)}>
              {busyId ? <Spinner /> : <Trash />} Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar sucursal' : 'Nueva sucursal'}</DialogTitle>
          </DialogHeader>
          {error && open && <Alert variant="destructive">{error}</Alert>}
          <form className="grid gap-4" onSubmit={submit}>
            <Field label="Nombre" htmlFor="suc-name" hint="p. ej. «Casa Central», «Sucursal Norte»">
              <Input id="suc-name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Código" htmlFor="suc-code" hint="corto y único (CC, NORTE…)">
              <Input id="suc-code" required value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            </Field>
            <Field label="Dirección" htmlFor="suc-addr" hint="(opcional)">
              <Input id="suc-addr" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving && <Spinner />} {editing ? 'Guardar cambios' : 'Crear sucursal'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Section>
  );
}
