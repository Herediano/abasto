import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/spinner';
import { api, errorMessage } from '@/lib/api';

/**
 * Pide las credenciales de un supervisor (hoy, un admin del mismo tenant) para
 * autorizar una acción que un cajero normal no puede hacer solo — anular un
 * ítem del carrito es el primer caso, pero cualquier pantalla puede reusarlo.
 * No emite token: es sólo un sí/no para desbloquear la acción que ya estaba
 * en pantalla.
 */
export function SupervisorAuthDialog({
  open, onOpenChange, onAuthorized, token, reason,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthorized: (supervisorName: string) => void;
  token: string;
  reason: string;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function reset() {
    setEmail('');
    setPassword('');
    setError('');
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const r = await api<{ authorized: boolean; supervisorName: string }>(
        '/auth/authorize-supervisor',
        { method: 'POST', body: JSON.stringify({ email, password }) },
        token,
      );
      reset();
      onOpenChange(false);
      onAuthorized(r.supervisorName);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Autorización de supervisor</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{reason}</p>
          {error && <Alert variant="destructive">{error}</Alert>}
          <Field label="Email del supervisor" htmlFor="sup-email">
            <Input id="sup-email" type="email" autoFocus required value={email} onChange={e => setEmail(e.target.value)} />
          </Field>
          <Field label="Contraseña" htmlFor="sup-password">
            <Input id="sup-password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading && <Spinner />} Autorizar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
