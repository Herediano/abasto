import { useEffect, useState } from 'react';
import { ArrowUUpLeft, CaretDown, GearSix, Moon, Plus, SignOut, Storefront, Sun } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { fechaHora } from '@/lib/format';
import { api, type Branch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { setActiveBranch } from '@/lib/branch';
import { useTheme } from '@/lib/theme';
import { Avatar } from '@/components/ui/avatar';
import {
  Menu, MenuBlock, MenuContent, MenuItem, MenuLabel, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuTrigger,
} from '@/components/ui/menu';
import { cn } from '@/lib/utils';
import { cerrarOtrosDesplegables, registrarDesplegable } from '@/lib/desplegables';

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
 * de la sesión, alternar entre sucursales y cuentas, y el acceso a Ajustes.
 * El nombre y el email aparecen una sola vez.
 */
export function UserMenu({ className }: { className?: string }) {
  const { session, accounts, switchAccount, logout } = useAuth();
  const { theme, ciclar } = useTheme();
  const navigate = useNavigate();
  // El selector de sucursal vive acá (ver escritorio). Se cargan las sucursales
  // al abrir el menú; al cambiar, recarga todo acotado a la elegida.
  const [branches, setBranches] = useState<Branch[]>([]);
  const [open, setOpen] = useState(false);

  const user = session?.user;
  const sucursal = user?.branch?.name ?? '';
  const inicio = session ? inicioDeSesion(session.accessToken) : null;
  const otras = accounts.filter(a => a.user.id !== user?.id);

  const active = user?.branch;
  const home = user?.homeBranch;
  const fueraDeCasa = !!active && !!home && active.id !== home.id;

  useEffect(() => {
    if (!open || !session) return;
    api<Branch[]>('/branches', {}, session.accessToken).then(setBranches).catch(() => {});
  }, [open, session]);

  useEffect(() => registrarDesplegable('user', () => setOpen(false)), []);

  if (!user || !session) return null;

  const pickBranch = (id: string) => {
    if (id !== active?.id) setActiveBranch(user.id, id === home?.id ? null : id);
  };

  return (
    <Menu
      open={open}
      onOpenChange={v => {
        if (v) cerrarOtrosDesplegables('user');
        setOpen(v);
      }}
      modal={false}
    >
      <MenuTrigger
        aria-label="Menú de la cuenta"
        className={cn(
          'group flex h-10 items-center gap-2 rounded-md border bg-card pr-2.5 pl-1.5 transition-colors uiverse-ctl',
          'border-border hover:bg-background data-[state=open]:border-accent-border data-[state=open]:bg-accent',
          className,
        )}
      >
        <Avatar name={user.name} preferences={user.preferences} className="size-7 text-micro" />
        <span className="hidden text-chico font-semibold sm:inline">{user.name.split(' ')[0]}</span>
        <CaretDown className="size-3.5 text-placeholder transition-transform group-data-[state=open]:rotate-180" />
      </MenuTrigger>

      <MenuContent className="w-72 p-2">
        {/* Quién sos: avatar, nombre, email y la empresa a la que pertenecés. */}
        <MenuBlock className="flex items-center gap-3 pb-2 pt-1">
          <Avatar name={user.name} preferences={user.preferences} className="size-10 text-sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-micro text-placeholder">{user.email}</p>
            <p className="truncate text-micro text-muted-foreground">{session.tenant.name}</p>
          </div>
        </MenuBlock>

        <MenuSeparator />

        {/* En qué estás parado: rango, sucursal activa y hace cuánto arrancó
            la sesión. Datos de contexto, no acciones. */}
        <MenuBlock>
          <dl className="grid gap-1.5 text-chico">
            <Fila k="Rango" v={user.rangoName ?? '—'} />
            <Fila
              k="Sucursal"
              v={sucursal ? <><Storefront weight="fill" className="size-3 text-primary" /> {sucursal}</> : <span className="text-warning">sin asignar</span>}
            />
            {inicio && <Fila k="Sesión" v={haceCuanto(inicio)} title={fechaHora(inicio)} />}
          </dl>
        </MenuBlock>

        {/* Dónde mirás: solo si el rango puede navegar entre sucursales. */}
        {user.canNavigateBranches && active && (
          <>
            <MenuSeparator />
            <MenuLabel>Cambiar sucursal</MenuLabel>
            <MenuRadioGroup value={active.id} onValueChange={pickBranch}>
              {branches.length === 0 ? (
                <MenuBlock className="text-chico text-placeholder">Cargando sucursales…</MenuBlock>
              ) : (
                branches.map(b => (
                  <MenuRadioItem key={b.id} value={b.id}>
                    <Storefront
                      weight={b.id === active.id ? 'fill' : 'regular'}
                      className={cn('size-4', b.id === active.id ? 'text-primary' : 'text-muted-foreground')}
                    />
                    <span className="flex-1 truncate">{b.name}</span>
                    {b.id === home?.id && <span className="text-micro text-placeholder">la tuya</span>}
                  </MenuRadioItem>
                ))
              )}
            </MenuRadioGroup>
            {fueraDeCasa && home && (
              <MenuItem onSelect={() => pickBranch(home.id)} className="mt-0.5 font-medium text-primary">
                <ArrowUUpLeft className="size-3.5" /> Volver a {home.name}
              </MenuItem>
            )}
          </>
        )}

        <MenuSeparator />

        {/* Preferencias y configuración. */}
        <MenuItem onSelect={e => { e.preventDefault(); ciclar(); }}>
          {theme === 'dark' ? <Moon weight="fill" className="size-4 text-muted-foreground" /> : <Sun weight="fill" className="size-4 text-muted-foreground" />}
          Tema: {theme === 'dark' ? 'oscuro' : 'claro'}
        </MenuItem>
        <MenuItem onSelect={() => navigate('/ajustes', { viewTransition: true })}>
          <GearSix className="size-4 text-muted-foreground" /> Ajustes
        </MenuItem>

        {otras.length > 0 && (
          <>
            <MenuSeparator />
            <MenuLabel>Cambiar de cuenta</MenuLabel>
            {otras.map(a => (
                <MenuItem key={a.user.id} onSelect={() => switchAccount(a.user.id)}>
                  <Avatar name={a.user.name} preferences={a.user.preferences} className="size-7 text-micro" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{a.user.name}</span>
                    <span className="block truncate text-micro text-muted-foreground">{a.tenant.name}</span>
                  </span>
                </MenuItem>
              ))}
          </>
        )}
        <MenuItem onSelect={() => navigate('/login?add=1')}>
          <Plus className="size-4 text-muted-foreground" /> Agregar otra cuenta
        </MenuItem>

        <MenuSeparator />
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
