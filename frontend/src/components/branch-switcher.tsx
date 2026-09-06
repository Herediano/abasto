import { useEffect, useRef, useState } from 'react';
import { ArrowUUpLeft, CaretDown, Check, Storefront } from '@phosphor-icons/react';
import { api, type Branch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { setActiveBranch } from '@/lib/branch';
import { cn } from '@/lib/utils';

/**
 * Selector de sucursal para el encabezado del escritorio. Sólo aparece si el
 * rango puede navegar entre sucursales. Cambiar de sucursal recarga: todas las
 * pantallas —stock, ventas, caja, escritorio— vuelven a pedir sus datos ya
 * acotados a la sucursal elegida.
 */
export function BranchSwitcher() {
  const { session } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const user = session?.user;
  const token = session?.accessToken;
  const active = user?.branch;
  const home = user?.homeBranch;
  const fueraDeCasa = !!active && !!home && active.id !== home.id;

  useEffect(() => {
    if (!open || !token) return;
    api<Branch[]>('/branches', {}, token).then(setBranches).catch(() => {});
  }, [open, token]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!user?.canNavigateBranches || !active) return null;

  const pick = (id: string) => {
    setOpen(false);
    if (id !== active.id) setActiveBranch(user.id, id === home?.id ? null : id);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-1.5 rounded-md border px-2.5 py-2 text-xs font-semibold transition-colors',
          fueraDeCasa
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border text-muted-foreground hover:bg-card hover:text-foreground',
        )}
      >
        <Storefront weight="fill" className="size-3.5" />
        {active.name}
        <CaretDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-1.5 w-60 rounded-lg border border-border bg-card p-1.5 shadow-float">
          <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-placeholder">Ver la sucursal</p>
          {branches.map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => pick(b.id)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] hover:bg-background"
            >
              <Storefront weight={b.id === active.id ? 'fill' : 'regular'} className={cn('size-4', b.id === active.id ? 'text-primary' : 'text-muted-foreground')} />
              <span className="flex-1 truncate">{b.name}</span>
              {b.id === home?.id && <span className="text-[10px] text-placeholder">la tuya</span>}
              {b.id === active.id && <Check className="size-3.5 text-primary" />}
            </button>
          ))}
          {fueraDeCasa && (
            <button
              type="button"
              onClick={() => pick(home!.id)}
              className="mt-1 flex w-full items-center gap-2 border-t border-border-soft px-2 pb-1.5 pt-2 text-left text-[12px] font-medium text-primary hover:underline"
            >
              <ArrowUUpLeft className="size-3.5" /> Volver a {home!.name}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
