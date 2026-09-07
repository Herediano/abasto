import { useEffect, useState } from 'react';
import { ArrowUUpLeft, CaretDown, Storefront } from '@phosphor-icons/react';
import { api, type Branch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { setActiveBranch } from '@/lib/branch';
import { Menu, MenuContent, MenuItem, MenuLabel, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
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

  const user = session?.user;
  const token = session?.accessToken;
  const active = user?.branch;
  const home = user?.homeBranch;
  const fueraDeCasa = !!active && !!home && active.id !== home.id;

  useEffect(() => {
    if (!open || !token) return;
    api<Branch[]>('/branches', {}, token).then(setBranches).catch(() => {});
  }, [open, token]);

  if (!user?.canNavigateBranches || !active) return null;

  const pick = (id: string) => {
    if (id !== active.id) setActiveBranch(user.id, id === home?.id ? null : id);
  };

  return (
    <Menu open={open} onOpenChange={setOpen}>
      <MenuTrigger
        className={cn(
          'group flex h-10 items-center gap-1.5 rounded-lg border px-3 text-chico font-semibold transition-colors',
          fueraDeCasa
            ? 'border-transparent bg-warning/10 text-warning'
            : 'border-border bg-card text-muted-foreground hover:bg-background hover:text-foreground',
        )}
      >
        <Storefront weight="fill" className="size-3.5" />
        {active.name}
        <CaretDown className="size-3 transition-transform group-data-[state=open]:rotate-180" />
      </MenuTrigger>
      <MenuContent className="w-60">
        <MenuLabel>Ver la sucursal</MenuLabel>
        <MenuRadioGroup value={active.id} onValueChange={pick}>
          {branches.map(b => (
            <MenuRadioItem key={b.id} value={b.id}>
              <Storefront
                weight={b.id === active.id ? 'fill' : 'regular'}
                className={cn('size-4', b.id === active.id ? 'text-primary' : 'text-muted-foreground')}
              />
              <span className="flex-1 truncate">{b.name}</span>
              {b.id === home?.id && <span className="text-micro text-placeholder">la tuya</span>}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
        {fueraDeCasa && home && (
          <>
            <MenuSeparator />
            <MenuItem onSelect={() => pick(home.id)} className="font-medium text-primary">
              <ArrowUUpLeft className="size-3.5" /> Volver a {home.name}
            </MenuItem>
          </>
        )}
      </MenuContent>
    </Menu>
  );
}
