import {
  ArrowsClockwise, ArrowLineDown, ArrowLineUp, CashRegister, ClockCounterClockwise, Circle, Gear,
  Handbag, Moon, Package, Receipt, ShoppingCartSimple, SignOut, Storefront, Sun, Tag, Truck,
  UsersThree, Warehouse,
  type Icon,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { api, type Warehouse as WarehouseRow } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

type NavItem = { to: string; label: string; icon: Icon; end?: boolean };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Mercadería',
    items: [
      { to: '/', label: 'Stock', icon: Package, end: true },
      { to: '/stock/in', label: 'Ingreso', icon: ArrowLineDown },
      { to: '/stock/out', label: 'Egreso', icon: ArrowLineUp },
      { to: '/stock/history', label: 'Historial', icon: ClockCounterClockwise },
      { to: '/stock/expirations', label: 'Vencimientos', icon: Handbag },
      { to: '/stock/restock', label: 'Reposición', icon: ArrowsClockwise },
    ],
  },
  {
    label: 'Ventas',
    items: [{ to: '/ventas/historial', label: 'Ventas', icon: Receipt }],
  },
  {
    label: 'Catálogo',
    items: [
      { to: '/catalog/products', label: 'Productos', icon: ShoppingCartSimple },
      { to: '/catalog/warehouses', label: 'Depósitos', icon: Warehouse },
      { to: '/catalog/suppliers', label: 'Proveedores', icon: Truck },
      { to: '/catalog/customers', label: 'Clientes', icon: UsersThree },
    ],
  },
];

const TEMAS = {
  light: { icon: Sun, label: 'Tema claro' },
  dark: { icon: Moon, label: 'Tema oscuro' },
  system: { icon: Circle, label: 'Tema automático' },
} as const;

export function AppShell() {
  const { session, isAdmin, logout } = useAuth();
  const { theme, ciclar } = useTheme();
  // La sesión guarda el warehouseId pero no el nombre; se resuelve una vez acá
  // porque la sucursal es lo primero que tiene que ver el usuario: operar en la
  // sucursal equivocada arruina el stock.
  const [sucursal, setSucursal] = useState('');
  const warehouseId = session?.user.warehouseId;
  const token = session?.accessToken;
  useEffect(() => {
    if (!warehouseId || !token) return;
    api<WarehouseRow[]>('/warehouses', {}, token)
      .then(ws => setSucursal(ws.find(w => w.id === warehouseId)?.name ?? ''))
      .catch(() => {});
  }, [warehouseId, token]);

  if (!session) return null;

  // Precios y Administración son admin-only, igual que sus rutas (AdminRoute en App.tsx).
  const groups = isAdmin
    ? [
        ...NAV_GROUPS,
        { label: 'Dinero', items: [{ to: '/precios', label: 'Precios', icon: Tag }] },
        { label: 'Administración', items: [{ to: '/admin/users', label: 'Usuarios', icon: Gear }] },
      ]
    : NAV_GROUPS;

  const iniciales = session.user.name
    .split(' ')
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();

  return (
    // Pantalla fija: el body no scrollea, sólo el área de trabajo. No hay barra
    // superior de aplicación — el riel se queda con todo y el contenido gana
    // alto, que es lo que vale en un sistema de tablas largas. Cada página trae
    // su propio encabezado pegajoso (ver PageHeader).
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex flex-col gap-2.5 border-b border-border-soft px-3.5 py-3.5">
          <p className="font-display text-xl font-bold tracking-tight text-foreground">
            abasto<span className="text-primary">.ai</span>
          </p>
          {/* Para la mayoría de los usuarios la sucursal es un dato, no un
              control: están atados a una. Cuando exista el permiso "navegar
              entre sucursales" este bloque pasa a ser un selector. */}
          <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
            <Storefront weight="fill" className="size-4 shrink-0 text-primary" />
            <div className="min-w-0 leading-tight">
              <p className="text-[10px] font-medium uppercase tracking-widest text-placeholder">Sucursal</p>
              <p className="truncate text-sm font-semibold">{sucursal || session.tenant.name}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-3">
          {/* La caja no es una sección más: es un modo. Entra a pantalla
              completa y el cajero no ve nada de esto adentro. */}
          <NavLink
            to="/ventas"
            end
            className="mb-1 flex items-center gap-2.5 rounded-lg bg-foreground px-3 py-2.5 font-display text-[15px] font-semibold tracking-tight text-background transition-opacity hover:opacity-90"
          >
            <CashRegister weight="fill" className="size-5 shrink-0" />
            Caja
            <span className="ml-auto font-mono text-[10px] font-normal opacity-60">F1</span>
          </NavLink>

          {groups.map(group => (
            <div key={group.label}>
              <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-placeholder">
                {group.label}
              </p>
              <div className="space-y-px">
                {group.items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-sidebar-active font-semibold text-sidebar-active-foreground'
                          : 'font-medium text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* El relleno marca dónde estás: es para lo que
                            elegimos Phosphor sobre un set sólo de línea. */}
                        <item.icon weight={isActive ? 'fill' : 'regular'} className="size-[18px] shrink-0" />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-2.5 border-t border-border-soft px-3.5 py-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-display text-xs font-semibold text-primary-foreground">
            {iniciales}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold">{session.user.name}</p>
            <p className="truncate text-xs capitalize text-placeholder">{session.user.role}</p>
          </div>
          {/* Claro / oscuro / automático. La caja se usa muchas horas seguidas
              y la elección es personal, así que siempre está a mano. */}
          <button
            type="button"
            onClick={ciclar}
            aria-label={TEMAS[theme].label}
            title={TEMAS[theme].label}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-hover hover:text-foreground"
          >
            {(() => {
              const TemaIcon = TEMAS[theme].icon;
              return <TemaIcon weight={theme === 'system' ? 'duotone' : 'fill'} className="size-[18px]" />;
            })()}
          </button>
          <button
            type="button"
            onClick={logout}
            aria-label="Salir"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-hover hover:text-foreground"
          >
            <SignOut className="size-[18px]" />
          </button>
        </div>
      </aside>

      {/* El área de trabajo es el contenedor que scrollea, para que el
          encabezado pegajoso de cada página se ancle contra él. */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 pb-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
