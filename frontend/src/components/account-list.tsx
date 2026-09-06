import { Plus, SignOut } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { AVATAR_COLORS } from '@/lib/prefs';
import { cn } from '@/lib/utils';

const iniciales = (name: string) =>
  name.split(' ').slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase();

/**
 * Cuentas con sesión abierta en este dispositivo.
 * - `full` (Ajustes): todas, la activa con "Salir".
 * - `switch` (menú de la cuenta): sólo las otras, para alternar; el menú ya
 *   tiene su propio "Cerrar sesión".
 */
export function AccountList({ variant = 'full', onNavigate }: { variant?: 'full' | 'switch'; onNavigate?: () => void }) {
  const { accounts, session, switchAccount, logout } = useAuth();
  const navigate = useNavigate();

  const shown = variant === 'switch' ? accounts.filter(a => a.user.id !== session?.user.id) : accounts;

  return (
    <div className="grid gap-1.5">
      {shown.map(a => {
        const activa = a.user.id === session?.user.id;
        const color = a.user.preferences?.avatarColor ?? AVATAR_COLORS[0];
        return (
          <div
            key={a.user.id}
            className={cn(
              'flex items-center gap-3 rounded-md border px-2.5 py-2',
              activa ? 'border-accent-border bg-accent/60' : 'border-border',
            )}
          >
            <button
              type="button"
              onClick={() => { if (!activa) switchAccount(a.user.id); onNavigate?.(); }}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              disabled={activa}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full font-display text-xs font-bold text-white" style={{ background: color }}>
                {iniciales(a.user.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-chico font-semibold">{a.user.name}</span>
                <span className="block truncate text-micro text-muted-foreground">{a.tenant.name}</span>
              </span>
            </button>
            {activa && variant === 'full' && (
              <button
                type="button"
                onClick={logout}
                title="Cerrar la sesión de esta cuenta"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-micro font-medium text-destructive hover:bg-destructive-soft"
              >
                <SignOut className="size-3.5" /> Salir
              </button>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => { onNavigate?.(); navigate('/login?add=1'); }}
        className="mt-1 flex items-center gap-2 rounded-md border border-dashed border-border px-2.5 py-2 text-chico text-muted-foreground transition-colors hover:border-solid hover:text-foreground"
      >
        <Plus className="size-4" /> Agregar otra cuenta
      </button>
    </div>
  );
}
