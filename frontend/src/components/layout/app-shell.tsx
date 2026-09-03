import { LogOut, Package, ArrowDownToLine, ArrowUpFromLine, History, CalendarClock, PackageMinus, Boxes, Warehouse, Truck, Users, Tags, Shapes, ShoppingCart, Receipt, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { api, type Warehouse as WarehouseRow } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Stock',
    items: [
      { to: '/', label: 'Stock actual', icon: Package, end: true },
      { to: '/stock/in', label: 'Ingreso', icon: ArrowDownToLine },
      { to: '/stock/out', label: 'Egreso', icon: ArrowUpFromLine },
      { to: '/stock/history', label: 'Historial', icon: History },
      { to: '/stock/expirations', label: 'Vencimientos', icon: CalendarClock },
      { to: '/stock/restock', label: 'Reposición', icon: PackageMinus },
    ],
  },
  {
    label: 'Ventas',
    items: [
      { to: '/ventas', label: 'Mostrador', icon: ShoppingCart, end: true },
      { to: '/ventas/historial', label: 'Ventas', icon: Receipt },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { to: '/catalog/products', label: 'Productos', icon: Boxes },
      { to: '/catalog/categories', label: 'Categorías', icon: Shapes },
      { to: '/catalog/warehouses', label: 'Depósitos', icon: Warehouse },
      { to: '/catalog/suppliers', label: 'Proveedores', icon: Truck },
      { to: '/catalog/customers', label: 'Clientes', icon: Users },
    ],
  },
];

export function AppShell() {
  const { session, isAdmin, logout } = useAuth();
  // La sesión guarda el warehouseId pero no el nombre; se resuelve una vez acá
  // para que el header diga en qué sucursal está parado el usuario.
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
        { label: 'Precios', items: [{ to: '/precios', label: 'Precios', icon: Tags }] },
        { label: 'Administración', items: [{ to: '/admin/users', label: 'Usuarios', icon: Users }] },
      ]
    : NAV_GROUPS;

  const iniciales = session.user.name
    .split(' ')
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();

  return (
    // Pantalla fija: el body no scrollea, sólo el área de trabajo. En un
    // mostrador la barra lateral y el header tienen que estar siempre a la vista.
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex h-16 items-center gap-3 px-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="size-5" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold uppercase tracking-wide text-sidebar-active-foreground">Mayorista ERP</p>
            <p className="truncate text-xs text-sidebar-foreground">{session.tenant.name}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {groups.map(group => (
            <div key={group.label}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/60">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        // El borde ámbar de 2px marca dónde estás parado; se
                        // reserva transparente en los inactivos para que el
                        // texto no se corra al cambiar de sección.
                        'flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'border-primary bg-sidebar-active text-sidebar-active-foreground'
                          : 'border-transparent text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-active-foreground',
                      )
                    }
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="flex items-center gap-3 border-t border-sidebar-border px-4 py-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-active text-xs font-semibold text-sidebar-active-foreground">
            {iniciales}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-sidebar-active-foreground">{session.user.name}</p>
            <p className="truncate text-xs capitalize text-sidebar-foreground">{session.user.role}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Salir"
            className="rounded-md p-2 text-sidebar-foreground transition-colors hover:bg-sidebar-hover hover:text-sidebar-active-foreground"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Warehouse className="size-4 text-muted-foreground" />
            {sucursal || session.tenant.name}
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" />
            Sistema online
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
