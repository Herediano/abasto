import { LogOut, Package, ArrowDownToLine, ArrowUpFromLine, History, CalendarClock, PackageMinus, Boxes, Warehouse, Truck, Users, Tags } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const NAV_GROUPS = [
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
    label: 'Catálogo',
    items: [
      { to: '/catalog/products', label: 'Productos', icon: Boxes },
      { to: '/catalog/warehouses', label: 'Depósitos', icon: Warehouse },
      { to: '/catalog/suppliers', label: 'Proveedores', icon: Truck },
    ],
  },
];

export function AppShell() {
  const { session, isAdmin, logout } = useAuth();
  if (!session) return null;

  // Precios y Administración son admin-only, igual que sus rutas (AdminRoute en App.tsx).
  const groups = isAdmin
    ? [
        ...NAV_GROUPS,
        { label: 'Precios', items: [{ to: '/precios', label: 'Precios', icon: Tags }] },
        { label: 'Administración', items: [{ to: '/admin/users', label: 'Usuarios', icon: Users }] },
      ]
    : NAV_GROUPS;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex h-14 items-center gap-2 px-5 text-base font-semibold text-white">Mayorista ERP</div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
          {groups.map(group => (
            <div key={group.label}>
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive ? 'bg-sidebar-active text-sidebar-active-foreground' : 'text-sidebar-foreground hover:bg-sidebar-active/60 hover:text-sidebar-active-foreground',
                      )
                    }
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 px-4 py-3 text-xs text-sidebar-foreground/70">Sesión válida por 8 horas</div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6">
          <div className="text-sm font-medium">{session.tenant.name}</div>
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-medium">{session.user.name}</p>
              <p className="text-xs capitalize text-muted-foreground">{session.user.role}</p>
            </div>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut /> Salir
            </Button>
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
