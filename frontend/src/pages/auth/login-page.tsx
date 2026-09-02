import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/spinner';
import { api, errorMessage, type Session } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export function LoginPage() {
  const { session, login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      login(await api<Session>('/auth/login', { method: 'POST', body: JSON.stringify(form) }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthLayout title="Ingresar a Mayorista ERP" description="Usá tu email y contraseña para continuar.">
      {error && <Alert variant="destructive">{error}</Alert>}
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Email" htmlFor="email">
          <Input id="email" required type="email" autoFocus placeholder="tu@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Contraseña" htmlFor="password">
          <Input id="password" required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        </Field>
        <Button disabled={saving} className="mt-1">
          {saving && <Spinner />} Ingresar
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        ¿No tenés cuenta? <Link to="/signup" className="font-medium text-primary hover:underline">Creá un mayorista nuevo</Link>
      </p>
    </AuthLayout>
  );
}

export function AuthLayout({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="grid gap-5">{children}</div>
      </div>
    </div>
  );
}
