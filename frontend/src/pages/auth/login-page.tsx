import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/spinner';
import { AuthBackground } from '@/components/auth-background';
import { ThemeToggle } from '@/components/theme-toggle';
import { api, errorMessage, type Session } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { moduleByKey } from '@/lib/modules';
import { resolveStartupPath } from '@/lib/prefs';

const pathForStartup = (s: Session) => resolveStartupPath(s.user.preferences?.startup, k => moduleByKey(k)?.path);

export function LoginPage() {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const adding = params.get('add') === '1';
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Con sesión abierta se entra directo — salvo que se venga a "Agregar otra cuenta".
  if (session && !adding) return <Navigate to={pathForStartup(session)} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const next = await api<Session>('/auth/login', { method: 'POST', body: JSON.stringify(form) });
      login(next);
      navigate(pathForStartup(next), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthLayout description={adding ? 'Sumá otra cuenta a este dispositivo. Vas a poder alternar sin cerrar sesión.' : 'Ingresá con tu email y contraseña.'}>
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
        {adding
          ? <Link to="/" className="font-medium text-primary hover:underline">Volver sin agregar</Link>
          : <>¿No tenés cuenta todavía? <Link to="/signup" className="font-medium text-primary hover:underline">Registrá tu empresa</Link></>}
      </p>
    </AuthLayout>
  );
}

export function AuthLayout({ title, description, children }: { title?: string; description: string; children: React.ReactNode }) {
  const tarjetaRef = useRef<HTMLDivElement>(null);
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background p-6">
      {/* "Patrón Depósito": íconos de retail (caja, changuito, etiqueta,
          camión, código de barras, bolsa) que flotan y chocan de verdad
          (paredes, entre sí y contra la tarjeta) sobre una grilla de puntos
          estática. Decorativo nada más — aria-hidden; el canvas ya respeta
          prefers-reduced-motion por su cuenta. */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <span className="auth-aurora__grid" />
        <AuthBackground obstaculoRef={tarjetaRef} />
      </div>
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="relative w-full max-w-md">
        <div
          ref={tarjetaRef}
          className="rounded-xl border border-border/70 bg-card/75 p-10 pt-9 shadow-float ring-1 ring-inset ring-white/10 backdrop-blur-xl"
        >
          {/* La marca vive adentro de la tarjeta ahora: es lo que tiene
              colisión contra los íconos del fondo, y afuera quedaba flotando
              sin nada que la proteja. Un solo bloque con la marca y el texto
              pegados -- separarlos en dos secciones los alejaba de más. */}
          <div className="mb-6 text-center">
            <p className="font-display text-3xl font-bold tracking-tight text-foreground">
              abasto<span className="text-primary">.ai</span>
            </p>
            {title && <h1 className="mt-4 text-lg font-semibold">{title}</h1>}
            <p className={title ? 'mt-1 text-sm text-muted-foreground' : 'mt-2 text-sm text-muted-foreground'}>{description}</p>
          </div>
          <div className="grid gap-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
