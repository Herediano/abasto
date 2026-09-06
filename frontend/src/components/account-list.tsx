import { Plus, SignOut } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { AVATAR_COLORS } from '@/lib/prefs';
import { cn } from '@/lib/utils';

const iniciales = (name: string) =>
  name.split(' ').slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase();

/**
 * Lista de cuentas con sesión abierta en este dispositivo. Se usa en el menú de
 * la cuenta (compacto) y en Ajustes. Tocar una cuenta alterna a ella sin pedir
 * contraseña; "Cerrar sesión" cierra sólo la cuenta activa.
 */
export function AccountList({ onNavigate }: { onNavigate?: () => void }) {
  const { accounts, session, switchAccount, logout } = useAuth();
  const navigate = useNavigate();

  const go = (path: string) => {
    onNavigate?.();
    navigate(path);
  };

  return (
    <div className="grid gap-1.5">
      {accounts.map(a => {
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
                <span className="block truncate text-[13px] font-semibold">{a.user.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{a.tenant.name}</span>
              </span>
            </button>
            {activa && (
              <button
                type="button"
                onClick={logout}
                title="Cerrar la sesión de esta cuenta"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive-soft"
              >
                <SignOut className="size-3.5" /> Salir
              </button>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => go('/login?add=1')}
        className="mt-1 flex items-center gap-2 rounded-md border border-dashed border-border px-2.5 py-2 text-[13px] text-muted-foreground transition-colors hover:border-solid hover:text-foreground"
      >
        <Plus className="size-4" /> Agregar otra cuenta
      </button>
    </div>
  );
}
