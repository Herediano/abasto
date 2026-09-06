import { useEffect, useRef, useState } from 'react';
import { CaretDown, GearSix, SignOut, Storefront } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { AccountList } from '@/components/account-list';
import { useAuth } from '@/lib/auth-context';
import { AVATAR_COLORS } from '@/lib/prefs';
import { cn } from '@/lib/utils';

const iniciales = (name: string) =>
  name.split(' ').slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase();

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
export function UserMenu() {
  const { session, accounts, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const user = session?.user;
  const sucursal = user?.branch?.name ?? '';
  const color = user?.preferences?.avatarColor ?? AVATAR_COLORS[0];
  const inicio = session ? inicioDeSesion(session.accessToken) : null;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!user || !session) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-2.5 transition-colors hover:bg-card"
      >
        <span className="grid size-7 place-items-center rounded-full font-display text-xs font-bold text-white" style={{ background: color }}>
          {iniciales(user.name)}
        </span>
        <span className="hidden text-xs font-semibold sm:inline">{user.name.split(' ')[0]}</span>
        <CaretDown className={cn('size-3 text-placeholder transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-1.5 w-72 rounded-lg border border-border bg-card p-2 shadow-float">
          <div className="flex items-center gap-3 px-1.5 pb-3 pt-1">
            <span className="grid size-10 shrink-0 place-items-center rounded-full font-display text-sm font-bold text-white" style={{ background: color }}>
              {iniciales(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-[11px] text-placeholder">{user.email}</p>
            </div>
          </div>

          <dl className="grid gap-1.5 border-t border-border-soft px-1.5 py-2.5 text-[12px]">
            <Fila k="Empresa" v={session.tenant.name} />
            <Fila k="Rango" v={user.rangoName ?? '—'} />
            <Fila
              k="Sucursal"
              v={sucursal ? <><Storefront weight="fill" className="size-3 text-primary" /> {sucursal}</> : <span className="text-warning">sin asignar</span>}
            />
            {inicio && <Fila k="Sesión" v={haceCuanto(inicio)} title={inicio.toLocaleString('es-AR')} />}
          </dl>

          <div className="border-t border-border-soft pt-2">
            {accounts.length > 1 && (
              <p className="px-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-placeholder">Cambiar de cuenta</p>
            )}
            <AccountList variant="switch" onNavigate={() => setOpen(false)} />
          </div>

          <div className="mt-1 border-t border-border-soft pt-1">
            <button
              type="button"
              onClick={() => { setOpen(false); navigate('/ajustes', { viewTransition: true }); }}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-background"
            >
              <GearSix className="size-4 text-muted-foreground" />
              Ajustes
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); logout(); }}
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

function Fila({ k, v, title }: { k: string; v: React.ReactNode; title?: string }) {
  return (
    <div className="flex items-center justify-between gap-3" title={title}>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="flex items-center gap-1 truncate font-medium">{v}</dd>
    </div>
  );
}
