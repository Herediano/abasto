import { Plus, SignOut } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { RowList } from '@/components/row-list';

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
    <div className="flex flex-col gap-3">
      <RowList>
        {shown.map(a => {
          const activa = a.user.id === session?.user.id;
          return (
            <div
              key={a.user.id}
              className={cn('flex items-center gap-3 px-4 py-3', activa && 'bg-accent/40')}
            >
              <button
                type="button"
                onClick={() => { if (!activa) switchAccount(a.user.id); onNavigate?.(); }}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                disabled={activa}
              >
                <Avatar name={a.user.name} preferences={a.user.preferences} className="size-8 text-micro" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{a.user.name}</span>
                  <span className="block truncate text-chico text-muted-foreground">{a.tenant.name}</span>
                </span>
              </button>
              {activa
                ? (variant === 'full' && (
                    <button
                      type="button"
                      onClick={logout}
                      title="Cerrar la sesión de esta cuenta"
                      className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-chico font-medium text-destructive hover:bg-destructive-soft"
                    >
                      <SignOut className="size-3.5" /> Salir
                    </button>
                  ))
                : (
                    <span className="shrink-0 text-chico font-medium text-muted-foreground">Cambiar</span>
                  )}
            </div>
          );
        })}
      </RowList>

      <button
        type="button"
        onClick={() => { onNavigate?.(); navigate('/login?add=1'); }}
        className="flex items-center gap-2 self-start rounded-md border border-dashed border-border px-3 py-2 text-chico text-muted-foreground transition-colors hover:border-solid hover:text-foreground"
      >
        <Plus className="size-4" /> Agregar otra cuenta
      </button>
    </div>
  );
}
