import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Storefront, Warehouse } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/spinner';
import { api, errorMessage, type Session } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { AuthLayout } from './login-page';

/** Mismo criterio que las tarjetas de tipo de promo: elegir en criollo, no con un <select>. */
const PLANTILLAS: Array<{ key: 'kiosco' | 'mayorista'; titulo: string; detalle: string; Icon: typeof Storefront }> = [
  { key: 'kiosco', titulo: 'Kiosco / autoservicio', detalle: 'Un negocio chico: quien vende, repone y compra suele ser la misma persona.', Icon: Storefront },
  { key: 'mayorista', titulo: 'Supermercado / mayorista', detalle: 'Varias sucursales o personal con roles separados: caja, recepción, compras.', Icon: Warehouse },
];

export function SignupPage() {
  const { session, login } = useAuth();
  const [form, setForm] = useState({ plantilla: 'kiosco' as 'kiosco' | 'mayorista', tenantName: '', legalName: '', taxId: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = { tenant: { name: form.tenantName, legalName: form.legalName, taxId: form.taxId, plantilla: form.plantilla }, user: { name: form.name, email: form.email, password: form.password } };
      login(await api<Session>('/auth/signup', { method: 'POST', body: JSON.stringify(body) }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthLayout title="Registrá tu empresa" description="Completá los datos y un asesor de Abasto se va a comunicar por mail para continuar con el alta.">
      {error && <Alert variant="destructive">{error}</Alert>}
      <form className="grid gap-6" onSubmit={submit}>
        {/* Elegir la plantilla primero: decide qué roles nacen con la
            empresa. Se puede ampliar después a mano desde Rangos, así que
            no hace falta acertar para siempre acá. */}
        <div className="grid gap-3">
          <p className="text-sm font-medium text-muted-foreground">Tu negocio</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PLANTILLAS.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => setForm({ ...form, plantilla: p.key })}
                className={cn(
                  'flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors',
                  form.plantilla === p.key ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50',
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <p.Icon size={15} /> {p.titulo}
                </span>
                <span className="text-xs text-muted-foreground">{p.detalle}</span>
              </button>
            ))}
          </div>
        </div>
        {/* Dos bloques más, no seis campos sueltos: primero la empresa que se
            está dando de alta, después la cuenta de quien la crea. */}
        <div className="grid gap-3 border-t border-border-soft pt-6">
          <p className="text-sm font-medium text-muted-foreground">Tu empresa</p>
          <Field label="Nombre de la empresa" htmlFor="tenantName">
            <Input id="tenantName" required autoFocus value={form.tenantName} onChange={e => setForm({ ...form, tenantName: e.target.value })} />
          </Field>
          <Field label="Razón social" htmlFor="legalName" hint="(opcional)">
            <Input id="legalName" value={form.legalName} onChange={e => setForm({ ...form, legalName: e.target.value })} />
          </Field>
          <Field label="CUIT" htmlFor="taxId">
            <Input id="taxId" required value={form.taxId} onChange={e => setForm({ ...form, taxId: e.target.value })} />
          </Field>
        </div>
        <div className="grid gap-3 border-t border-border-soft pt-6">
          <p className="text-sm font-medium text-muted-foreground">Tu cuenta</p>
          <Field label="Tu nombre" htmlFor="name">
            <Input id="name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Contraseña" htmlFor="password" hint="(mínimo 8 caracteres)">
            <Input id="password" required minLength={8} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </Field>
        </div>
        <Button disabled={saving}>
          {saving && <Spinner />} Crear cuenta
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta? <Link to="/login" className="font-medium text-primary hover:underline">Ingresá</Link>
      </p>
    </AuthLayout>
  );
}
