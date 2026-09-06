import { useEffect, useRef, useState } from 'react';
import { CaretDown, SignOut, Storefront, UserSwitch } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { api, type Warehouse } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const iniciales = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map(p => p[0] ?? '')
    .join('')
    .toUpperCase();

/**
 * El menú de la cuenta: perfil (nombre, email, rango, sucursal), cerrar sesión
 * y cambiar de cuenta. Vivía en el pie del riel; ahora en el encabezado del
 * escritorio.
 */
export function UserMenu() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [sucursal, setSucursal] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const user = session?.user;
  const warehouseId = user?.warehouseId;
  const token = session?.accessToken;

  useEffect(() => {
    if (!open || !warehouseId || !token) return;
    api<Warehouse[]>('/warehouses', {}, token)
      .then(ws => setSucursal(ws.find(w => w.id === warehouseId)?.name ?? ''))
      .catch(() => {});
  }, [open, warehouseId, token]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!user) return null;

  function cambiarCuenta() {
    logout();
    navigate('/login');
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-2.5 transition-colors hover:bg-card"
      >
        <span className="grid size-7 place-items-center rounded-full bg-primary font-display text-xs font-bold text-primary-foreground">
          {iniciales(user.name)}
        </span>
        <span className="hidden text-xs font-semibold sm:inline">{user.name.split(' ')[0]}</span>
        <CaretDown className={cn('size-3 text-placeholder transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-1.5 w-64 rounded-lg border border-border bg-card p-1.5 shadow-float">
          <div className="flex items-center gap-3 border-b border-border-soft px-2.5 pb-3 pt-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">
              {iniciales(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-[11px] text-placeholder">{user.email}</p>
            </div>
          </div>

          <div className="grid gap-1.5 px-2.5 py-3 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Empresa</span>
              <span className="font-medium">{session?.tenant.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Rango</span>
              <span className="font-medium">{user.rangoName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Sucursal</span>
              <span className="flex items-center gap-1 font-medium">
                <Storefront weight="fill" className="size-3 text-primary" />
                {warehouseId ? sucursal || '…' : <span className="text-warning">sin asignar</span>}
              </span>
            </div>
          </div>

          <div className="border-t border-border-soft pt-1.5">
            <button
              type="button"
              onClick={cambiarCuenta}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-background"
            >
              <UserSwitch className="size-4 text-muted-foreground" />
              Cambiar de cuenta
            </button>
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-destructive hover:bg-destructive-soft"
            >
              <SignOut className="size-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
