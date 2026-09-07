import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/spinner';
import { api, errorMessage, type Session } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AuthLayout } from './login-page';

export function SignupPage() {
  const { session, login } = useAuth();
  const [form, setForm] = useState({ tenantName: '', legalName: '', taxId: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = { tenant: { name: form.tenantName, legalName: form.legalName, taxId: form.taxId }, user: { name: form.name, email: form.email, password: form.password } };
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
        {/* Dos bloques, no seis campos sueltos: primero la empresa que se
            está dando de alta, después la cuenta de quien la crea. */}
        <div className="grid gap-3">
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
