import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, LockSimple, Moon, Percent, PencilSimple, Plus, Sparkle, Storefront, Sun, Trash, UploadSimple } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { ModuleScreen, ModuleSection } from '@/components/module-screen';
import { RowList, RowListItem } from '@/components/row-list';
import { Select } from '@/components/ui/select';
import { PageSpinner, Spinner } from '@/components/spinner';
import { AccountList } from '@/components/account-list';
import { Avatar } from '@/components/ui/avatar';
import { RangosPage } from '@/pages/admin/rangos-page';
import { UsersPage } from '@/pages/admin/users-page';
import { api, errorMessage, type Branch, type PaymentAdjustment, type PaymentCard, type PaymentMethod, type Session } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { fileToResizedDataUrl } from '@/lib/image';
import { settingsModules } from '@/lib/modules';
import { AVATAR_COLORS, usePreguntarLibre } from '@/lib/prefs';
import { useTheme } from '@/lib/theme';
import { useAsyncAction } from '@/lib/use-async';
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

export type AjustesView = 'cuenta' | 'empresa' | 'usuarios' | 'rangos';

export function AjustesPage({ initialView }: { initialView?: AjustesView } = {}) {
  const { session, can, refresh } = useAuth();
  const user = session!.user;
  const esDueno = user.rangoName === OWNER_RANGO;
  // Usuarios y Rangos son pestañas de Ajustes, no módulos aparte: `settingsModules`
  // ya los filtra por permiso.
  const modsAjustes = settingsModules(can);
  const [view, setView] = useState<AjustesView>(initialView ?? 'cuenta');

  const views = [
    { key: 'cuenta', label: 'Mi cuenta' },
    ...(esDueno ? [{ key: 'empresa', label: 'La empresa' }] : []),
    ...modsAjustes.map(m => ({ key: m.key, label: m.label })),
  ];

  return (
    <ModuleScreen title="Ajustes" views={views} view={view} onView={k => setView(k as AjustesView)}>
      {view === 'cuenta' && (
        <div className="flex flex-col">
          <PerfilSection session={session!} onSaved={refresh} />
          <PasswordSection token={session!.accessToken} />
          <PreferenciasSection />
          <ModuleSection title="Sesiones" description="Las cuentas con sesión abierta en este dispositivo. Podés alternar entre ellas sin volver a escribir la contraseña.">
            <AccountList />
          </ModuleSection>
        </div>
      )}

      {view === 'empresa' && esDueno && (
        <div className="flex flex-col">
          <EmpresaSection session={session!} onSaved={refresh} />
          <SucursalesSection token={session!.accessToken} />
          <TarjetasSection token={session!.accessToken} />
        </div>
      )}

      {view === 'usuarios' && can('usuarios.ver') && (
        <div className="flex flex-col">
          <UsersPage />
        </div>
      )}

      {view === 'rangos' && can('rangos.ver') && (
        <div className="flex flex-col">
          <RangosPage />
        </div>
      )}
    </ModuleScreen>
  );
}

/* ── Mi cuenta ──────────────────────────────────────────────────────────── */

function PerfilSection({ session, onSaved }: { session: Session; onSaved: () => Promise<void> }) {
  const user = session.user;
  const [form, setForm] = useState({ name: user.name, email: user.email });
  const [color, setColor] = useState(user.preferences?.avatarColor ?? AVATAR_COLORS[0]);
  const [avatar, setAvatar] = useState<string | null>(user.preferences?.avatar ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { execute: savePerfil, saving, isOk, error, setError } = useAsyncAction(
    async () => {
      await api('/auth/me', { method: 'PATCH', body: JSON.stringify({ name: form.name, email: form.email, preferences: { avatarColor: color, avatar } }) }, session.accessToken);
      await onSaved();
    },
    { autoResetMs: 1800 },
  );

  const dirty =
    form.name.trim() !== user.name ||
    form.email.trim() !== user.email ||
    color !== (user.preferences?.avatarColor ?? AVATAR_COLORS[0]) ||
    avatar !== (user.preferences?.avatar ?? null);

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setError('');
    try {
      setAvatar(await fileToResizedDataUrl(file, 128));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void savePerfil();
  }

  return (
    <ModuleSection title="Perfil" description="Cómo te ve el resto del equipo.">
      {error && <Alert variant="destructive" className="mb-3">{error}</Alert>}
      <form className="grid gap-4" onSubmit={submit}>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={form.name || user.name} preferences={{ avatarColor: color, avatar: avatar ?? undefined }} className="size-16 text-h3" />
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={e => void pickPhoto(e.target.files?.[0])}
              />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <UploadSimple /> {avatar ? 'Cambiar foto' : 'Subir foto'}
              </Button>
              {avatar && (
                <Button type="button" variant="ghost" onClick={() => setAvatar(null)}>
                  <Trash /> Quitar
                </Button>
              )}
            </div>
            {!avatar && (
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
            )}
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
          <Button type="submit" disabled={!dirty || saving}>
            {saving && <Spinner />} {isOk ? <><Check /> Guardado</> : 'Guardar cambios'}
          </Button>
          <span className="text-chico text-muted-foreground">Empresa: <strong className="font-medium text-foreground">{session.tenant.name}</strong> · Rango: <strong className="font-medium text-foreground">{user.rangoName}</strong></span>
        </div>
      </form>
    </ModuleSection>
  );
}

function PasswordSection({ token }: { token: string }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', repeat: '' });

  const { execute: changePassword, saving, isOk, error } = useAsyncAction(
    async () => {
      if (form.newPassword !== form.repeat) {
        throw new Error('La nueva contraseña y su repetición no coinciden');
      }
      await api('/auth/me', { method: 'PATCH', body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }) }, token);
      setForm({ currentPassword: '', newPassword: '', repeat: '' });
    },
    { autoResetMs: 1800 },
  );

  function submit(e: FormEvent) {
    e.preventDefault();
    void changePassword();
  }

  return (
    <ModuleSection title="Contraseña" description="Al menos 8 caracteres. Te va a pedir la actual para confirmar.">
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
        <Button type="submit" disabled={saving} className="justify-self-start">
          {saving && <Spinner />} {isOk ? <><Check /> Cambiada</> : 'Cambiar contraseña'}
        </Button>
      </form>
    </ModuleSection>
  );
}

function PreferenciasSection() {
  const { theme, setTheme } = useTheme();
  const { libre, setLibre } = usePreguntarLibre();

  return (
    <ModuleSection title="Preferencias" description="Se guardan en este dispositivo.">
      <Choice label="Tema">
        <Toggle active={theme === 'light'} onClick={() => setTheme('light')}><Sun weight="fill" className="size-4" /> Claro</Toggle>
        <Toggle active={theme === 'dark'} onClick={() => setTheme('dark')}><Moon weight="fill" className="size-4" /> Oscuro</Toggle>
      </Choice>
      <div className="mt-4">
        <Choice
          label="Botón Preguntar"
          hint="El botón que abre el buscador (Ctrl K). Fijo: vive en el header, siempre igual. Libre: sale del header y podés arrastrarlo a cualquier parte de la app."
        >
          <Toggle active={!libre} onClick={() => setLibre(false)}><LockSimple weight="fill" className="size-4" /> Fijo</Toggle>
          <Toggle active={libre} onClick={() => setLibre(true)}><Sparkle weight="fill" className="size-4" /> Libre</Toggle>
        </Choice>
      </div>
    </ModuleSection>
  );
}

function Choice({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[220px_1fr] sm:items-center">
      <div>
        <p className="text-chico font-medium">{label}</p>
        {hint && <p className="text-micro text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Toggle({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-chico font-medium transition-colors',
        disabled && 'opacity-50',
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
  const [autoCost, setAutoCost] = useState(session.tenant.autoUpdateCostOnPurchase ?? false);
  const [condicionFiscal, setCondicionFiscal] = useState(session.tenant.condicionFiscal ?? 'responsable_inscripto');
  const [state, setState] = useState<'idle' | 'saving' | 'ok'>('idle');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = name.trim() !== session.tenant.name || logo !== (session.tenant.logo ?? null)
    || tz !== (session.tenant.timezone ?? TIMEZONES[0].value) || autoCost !== (session.tenant.autoUpdateCostOnPurchase ?? false)
    || condicionFiscal !== (session.tenant.condicionFiscal ?? 'responsable_inscripto');

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
      await api('/auth/tenant', { method: 'PATCH', body: JSON.stringify({ name, logo, timezone: tz, autoUpdateCostOnPurchase: autoCost, condicionFiscal }) }, session.accessToken);
      await onSaved();
      setState('ok');
      setTimeout(() => setState('idle'), 1800);
    } catch (err) {
      setError(errorMessage(err));
      setState('idle');
    }
  }

  return (
    <ModuleSection title="Datos de la empresa" description="Sólo vos, como Dueño, ves y cambiás esto.">
      {error && <Alert variant="destructive" className="mb-3">{error}</Alert>}
      <form className="grid gap-4" onSubmit={submit}>
        <div className="flex items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-background">
            {logo
              ? <img src={logo} alt="Logo" className="size-full object-contain" />
              : <span className="font-display text-h3 font-bold text-primary">{name.slice(0, 1).toUpperCase() || 'A'}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => void pickLogo(e.target.files?.[0])} />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
              <UploadSimple /> {logo ? 'Cambiar logo' : 'Subir logo'}
            </Button>
            {logo && (
              <Button type="button" variant="ghost" onClick={() => setLogo(null)}>
                <Trash /> Quitar
              </Button>
            )}
            <p className="w-full text-chico text-muted-foreground">
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
          <Field label="Condición frente al IVA" htmlFor="emp-condicion" hint="define qué comprobantes podés emitir">
            <Select id="emp-condicion" value={condicionFiscal} onChange={e => setCondicionFiscal(e.target.value)}>
              <option value="responsable_inscripto">Responsable Inscripto</option>
              <option value="monotributista">Monotributista</option>
              <option value="exento">Exento</option>
            </Select>
          </Field>
        </div>

        <p className="text-chico text-muted-foreground">
          Con esto y la condición fiscal de cada cliente se calcula la letra del comprobante (A/B/C) al vender. ARCA
          todavía no está conectado: los comprobantes salen internos, sin CAE, hasta que se habilite.
        </p>

        <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
          <input type="checkbox" checked={autoCost} onChange={e => setAutoCost(e.target.checked)} className="mt-0.5 size-4" />
          <span>
            <span className="font-medium">Actualizar el costo automáticamente al confirmar una compra</span>
            <span className="block text-muted-foreground">
              {autoCost
                ? 'Cada factura confirmada pisa el costo del producto con el precio de esa compra, aunque ya tuviera uno cargado.'
                : 'El costo sólo se carga solo la primera vez. Después, si un proveedor te aumenta, la compra queda registrada pero el costo del producto no se mueve hasta que lo revises en Precios → Actualizar («Costos por sincronizar») — así podés armar el aumento de venta antes de tocar nada.'}
            </span>
          </span>
        </label>

        <Button type="submit" disabled={!dirty || state === 'saving'} className="justify-self-start">
          {state === 'saving' && <Spinner />} {state === 'ok' ? <><Check /> Guardado</> : 'Guardar cambios'}
        </Button>
      </form>
    </ModuleSection>
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
  const [ajustesDe, setAjustesDe] = useState<Branch | null>(null);

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
    <ModuleSection title="Sucursales" description="Cada sucursal es un local del negocio. Nace con un depósito y una caja; los depósitos extra se agregan desde el módulo Depósitos.">
      {error && !open && <Alert variant="destructive" className="mb-3">{error}</Alert>}
      {loading ? (
        <PageSpinner />
      ) : (
        <div className="flex flex-col gap-3">
          <RowList>
            {items.map(b => (
              <RowListItem
                key={b.id}
                icon={Storefront}
                iconClassName={b.isActive ? 'text-primary' : 'text-placeholder'}
                muted={!b.isActive}
                title={b.name}
                badge={!b.isActive && (
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-micro font-medium text-muted-foreground">Inactiva</span>
                )}
                meta={
                  <>
                    {b.code}{b.address ? ` · ${b.address}` : ''} · {b._count?.warehouses ?? 0} {b._count?.warehouses === 1 ? 'depósito' : 'depósitos'}
                    {b._count?.users ? ` · ${b._count.users} ${b._count.users === 1 ? 'usuario' : 'usuarios'}` : ''}
                  </>
                }
                actions={
                  <>
                    <Button variant="ghost" size="icon" onClick={() => setAjustesDe(b)} aria-label="Recargos por medio de pago" title="Recargos por medio de pago" disabled={busyId === b.id}>
                      <Percent />
                    </Button>
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
                  </>
                }
              />
            ))}
          </RowList>
          <Button variant="outline" onClick={nueva} className="self-start">
            <Plus /> Nueva sucursal
          </Button>
        </div>
      )}

      <Dialog open={!!confirmDelete} onOpenChange={o => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar {confirmDelete?.name}</DialogTitle>
            <DialogDescription>
              Se borra la sucursal con su depósito y su caja. No se puede deshacer. Sólo se permite porque no tiene ventas, stock ni turnos.
            </DialogDescription>
          </DialogHeader>
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

      <AjustesPagoDialog branch={ajustesDe} token={token} onClose={() => setAjustesDe(null)} />
    </ModuleSection>
  );
}

/**
 * Tarjetas guardadas: nombre + una tabla de recargo por cantidad de cuotas.
 * El cajero las elige al cobrar con tarjeta (POS) y el recargo ya está
 * cargado — pisa el % genérico de "Tarjeta" de Recargos por medio de pago,
 * que sigue rigiendo cuando no se elige ninguna tarjeta puntual.
 */
function TarjetasSection({ token }: { token: string }) {
  const [items, setItems] = useState<PaymentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<PaymentCard | 'new' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () =>
    api<PaymentCard[]>('/payment-cards?activeOnly=0', {}, token)
      .then(setItems)
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  useEffect(() => { void load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleActiva(c: PaymentCard) {
    setBusyId(c.id);
    setError('');
    try {
      await api(`/payment-cards/${c.id}`, { method: 'PUT', body: JSON.stringify({ isActive: !c.isActive }) }, token);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ModuleSection title="Tarjetas de crédito guardadas" description="Cada tarjeta lleva su recargo por cantidad de cuotas. Al cobrar en crédito, el cajero la elige de la lista y el recargo ya está cargado. Débito siempre es 1 pago, no usa esta lista.">
      {error && <Alert variant="destructive" className="mb-3">{error}</Alert>}
      {loading ? (
        <PageSpinner />
      ) : (
        <div className="flex flex-col gap-3">
          {items.length > 0 && (
            <RowList>
              {items.map(c => (
                <RowListItem
                  key={c.id}
                  icon={Percent}
                  iconClassName={c.isActive ? 'text-primary' : 'text-placeholder'}
                  muted={!c.isActive}
                  title={c.name}
                  badge={!c.isActive && (
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-micro font-medium text-muted-foreground">Inactiva</span>
                  )}
                  meta={
                    c.installmentOptions.length === 0
                      ? 'Sin cuotas cargadas'
                      : c.installmentOptions.map(o => `${o.installments === 1 ? '1 pago' : `${o.installments} cuotas`} (${Number(o.surchargePercent) >= 0 ? '+' : ''}${o.surchargePercent}%)`).join(' · ')
                  }
                  actions={
                    <>
                      <Button variant="ghost" size="icon" onClick={() => setEditing(c)} aria-label={`Editar ${c.name}`} disabled={busyId === c.id}>
                        <PencilSimple />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleActiva(c)} disabled={busyId === c.id}>
                        {busyId === c.id ? <Spinner /> : c.isActive ? 'Desactivar' : 'Activar'}
                      </Button>
                    </>
                  }
                />
              ))}
            </RowList>
          )}
          <Button variant="outline" onClick={() => setEditing('new')} className="self-start">
            <Plus /> Nueva tarjeta
          </Button>
        </div>
      )}

      <TarjetaDialog tarjeta={editing} token={token} onClose={() => setEditing(null)} onSaved={load} />
    </ModuleSection>
  );
}

function TarjetaDialog({
  tarjeta, token, onClose, onSaved,
}: {
  tarjeta: PaymentCard | 'new' | null;
  token: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const editing = tarjeta && tarjeta !== 'new' ? tarjeta : null;
  const [name, setName] = useState('');
  const [cuotas, setCuotas] = useState<{ installments: string; surchargePercent: string }[]>([{ installments: '1', surchargePercent: '0' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tarjeta) return;
    setError('');
    if (editing) {
      setName(editing.name);
      setCuotas(editing.installmentOptions.length
        ? editing.installmentOptions.map(o => ({ installments: String(o.installments), surchargePercent: o.surchargePercent }))
        : [{ installments: '1', surchargePercent: '0' }]);
    } else {
      setName('');
      setCuotas([{ installments: '1', surchargePercent: '0' }]);
    }
  }, [tarjeta]); // eslint-disable-line react-hooks/exhaustive-deps

  function agregarCuota() {
    setCuotas(prev => [...prev, { installments: '', surchargePercent: '' }]);
  }
  function quitarCuota(i: number) {
    setCuotas(prev => prev.filter((_, idx) => idx !== i));
  }
  function actualizarCuota(i: number, cambios: Partial<{ installments: string; surchargePercent: string }>) {
    setCuotas(prev => prev.map((c, idx) => (idx === i ? { ...c, ...cambios } : c)));
  }

  async function guardar() {
    setSaving(true);
    setError('');
    try {
      const installmentOptions = cuotas.map(c => ({ installments: Number(c.installments), surchargePercent: Number(c.surchargePercent) }));
      const body = { name: name.trim(), installmentOptions };
      if (editing) await api(`/payment-cards/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) }, token);
      else await api('/payment-cards', { method: 'POST', body: JSON.stringify(body) }, token);
      onClose();
      await onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!tarjeta} onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? `Editar ${editing.name}` : 'Nueva tarjeta'}</DialogTitle>
        </DialogHeader>
        {error && <Alert variant="destructive">{error}</Alert>}
        <Field label="Nombre" htmlFor="tarjeta-name" hint="p. ej. «Visa Crédito Banco Nación»">
          <Input id="tarjeta-name" required value={name} onChange={e => setName(e.target.value)} />
        </Field>
        <div className="flex flex-col gap-2">
          <p className="text-chico font-semibold text-placeholder">Cuotas y recargo (1 pago cuenta como una cuota)</p>
          {cuotas.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                type="number" min="1" step="1" placeholder="Cuotas" aria-label="Cantidad de cuotas"
                value={c.installments} onChange={e => actualizarCuota(i, { installments: e.target.value })}
                className="w-24"
              />
              <div className="relative flex-1">
                <Input
                  type="number" step="0.1" placeholder="Recargo" aria-label="Recargo en porcentaje"
                  value={c.surchargePercent} onChange={e => actualizarCuota(i, { surchargePercent: e.target.value })}
                  className="pr-7 tabular"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
              {cuotas.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => quitarCuota(i)} aria-label="Quitar esta cuota">
                  <Trash className="size-4" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={agregarCuota} className="self-start">
            <Plus /> Agregar cuota
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={guardar} disabled={saving || !name.trim()}>{saving && <Spinner />} {editing ? 'Guardar cambios' : 'Crear tarjeta'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const MEDIOS_PAGO: { id: PaymentMethod; label: string }[] = [
  { id: 'cash', label: 'Efectivo' },
  { id: 'card_debit', label: 'Débito' },
  { id: 'card_credit', label: 'Crédito' },
  { id: 'transfer', label: 'Transferencia' },
  { id: 'qr', label: 'QR' },
];

/** Recargo (+) o descuento (−) por medio de pago, por sucursal (Dueño). */
function AjustesPagoDialog({ branch, token, onClose }: { branch: Branch | null; token: string; onClose: () => void }) {
  const [rows, setRows] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!branch) return;
    setLoading(true);
    setError('');
    api<PaymentAdjustment[]>(`/branches/${branch.id}/payment-adjustments`, {}, token)
      .then(r => setRows(Object.fromEntries(r.map(x => [x.method, x.percent ? String(x.percent) : '']))))
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [branch, token]);

  async function guardar() {
    if (!branch) return;
    setSaving(true);
    setError('');
    try {
      const adjustments = MEDIOS_PAGO.map(m => ({ method: m.id, percent: Number(rows[m.id]) || 0 }));
      await api(`/branches/${branch.id}/payment-adjustments`, { method: 'PUT', body: JSON.stringify({ adjustments }) }, token);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!branch} onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recargos por medio de pago{branch ? ` · ${branch.name}` : ''}</DialogTitle>
          <DialogDescription>
            Positivo recarga, negativo descuenta. Se aplica sobre la parte del total que se paga con ese medio, al cobrar en esta sucursal. La cuenta corriente nunca lleva recargo.
          </DialogDescription>
        </DialogHeader>
        {error && <Alert variant="destructive">{error}</Alert>}
        {loading ? (
          <PageSpinner />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {MEDIOS_PAGO.map(m => (
              <Field key={m.id} label={m.label} htmlFor={`adj-${m.id}`}>
                <div className="relative">
                  <Input
                    id={`adj-${m.id}`}
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={rows[m.id] ?? ''}
                    onChange={e => setRows(r => ({ ...r, [m.id]: e.target.value }))}
                    className="pr-7 tabular"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
              </Field>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={guardar} disabled={saving || loading}>{saving && <Spinner />} Guardar cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
