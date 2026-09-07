import { CaretDown, GearSix, Moon, Plus, SignOut, Storefront, Sun } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { fechaHora } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { AVATAR_COLORS } from '@/lib/prefs';
import { useTheme } from '@/lib/theme';
import { Menu, MenuBlock, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { cn, initials } from '@/lib/utils';

/** Cuándo se abrió la sesión — sale del `iat` del token, sin pedir nada nuevo. */
function inicioDeSesion(token: string): Date | null {
  try {
    const part = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!part) return null;
    const payload = JSON.parse(atob(part)) as { iat?: number };
    return payload.iat ? new Date(payload.iat * 1000) : null;
  } catch {
    return null;
  }
}

function haceCuanto(d: Date): string {
  const min = Math.round((Date.now() - d.getTime()) / 60_000);
  if (min < 2) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.round(h / 24);
  if (dias < 7) return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

/**
 * El menú de la cuenta en el encabezado del escritorio: quién sos, los datos
 * de la sesión, alternar entre cuentas y el acceso a Ajustes. El nombre y el
 * email aparecen una sola vez.
 */
export function UserMenu({ className }: { className?: string }) {
  const { session, accounts, switchAccount, logout } = useAuth();
  const { theme, ciclar } = useTheme();
  const navigate = useNavigate();

  const user = session?.user;
  const sucursal = user?.branch?.name ?? '';
  const color = user?.preferences?.avatarColor ?? AVATAR_COLORS[0];
  const inicio = session ? inicioDeSesion(session.accessToken) : null;
  const otras = accounts.filter(a => a.user.id !== user?.id);

  if (!user || !session) return null;

  return (
    <Menu>
      <MenuTrigger
        className={cn(
          'group flex h-10 items-center gap-2 rounded-lg border bg-card pl-1.5 pr-2.5 transition-colors',
          'border-border hover:bg-background data-[state=open]:border-accent-border data-[state=open]:bg-accent',
          className,
        )}
      >
        <span className="grid size-7 place-items-center rounded-full font-display text-micro font-bold text-white" style={{ background: color }}>
          {initials(user.name)}
        </span>
        <span className="hidden text-chico font-semibold sm:inline">{user.name.split(' ')[0]}</span>
        <CaretDown className="size-3.5 text-placeholder transition-transform group-data-[state=open]:rotate-180" />
      </MenuTrigger>

      <MenuContent className="w-72 p-2">
        <MenuBlock className="flex items-center gap-3 pb-2 pt-1">
          <span className="grid size-10 shrink-0 place-items-center rounded-full font-display text-sm font-bold text-white" style={{ background: color }}>
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-micro text-placeholder">{user.email}</p>
          </div>
        </MenuBlock>

        <MenuSeparator />
        <MenuBlock>
          <dl className="grid gap-1.5 text-chico">
            <Fila k="Empresa" v={session.tenant.name} />
            <Fila k="Rango" v={user.rangoName ?? '—'} />
            <Fila
              k="Sucursal"
              v={sucursal ? <><Storefront weight="fill" className="size-3 text-primary" /> {sucursal}</> : <span className="text-warning">sin asignar</span>}
            />
            {inicio && <Fila k="Sesión" v={haceCuanto(inicio)} title={fechaHora(inicio)} />}
          </dl>
        </MenuBlock>

        <MenuSeparator />
        <MenuItem onSelect={e => { e.preventDefault(); ciclar(); }}>
          {theme === 'dark' ? <Moon weight="fill" className="size-4 text-muted-foreground" /> : <Sun weight="fill" className="size-4 text-muted-foreground" />}
          Tema: {theme === 'dark' ? 'oscuro' : 'claro'}
        </MenuItem>

        {otras.length > 0 && (
          <>
            <MenuSeparator />
            <MenuLabel>Cambiar de cuenta</MenuLabel>
            {otras.map(a => {
              const c = a.user.preferences?.avatarColor ?? AVATAR_COLORS[0];
              return (
                <MenuItem key={a.user.id} onSelect={() => switchAccount(a.user.id)}>
                  <span className="grid size-7 shrink-0 place-items-center rounded-full font-display text-micro font-bold text-white" style={{ background: c }}>
                    {initials(a.user.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{a.user.name}</span>
                    <span className="block truncate text-micro text-muted-foreground">{a.tenant.name}</span>
                  </span>
                </MenuItem>
              );
            })}
          </>
        )}

        <MenuSeparator />
        <MenuItem onSelect={() => navigate('/login?add=1')}>
          <Plus className="size-4 text-muted-foreground" /> Agregar otra cuenta
        </MenuItem>
        <MenuItem onSelect={() => navigate('/ajustes', { viewTransition: true })}>
          <GearSix className="size-4 text-muted-foreground" /> Ajustes
        </MenuItem>
        <MenuItem destructive onSelect={logout}>
          <SignOut className="size-4" /> Cerrar sesión
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function Fila({ k, v, title }: { k: string; v: React.ReactNode; title?: string }) {
  return (
    <div className="flex items-center justify-between gap-3" title={title}>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="flex items-center gap-1 truncate font-medium">{v}</dd>
    </div>
  );
}
