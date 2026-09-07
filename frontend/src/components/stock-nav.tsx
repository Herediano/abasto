import { NavLink } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const TABS: { to: string; label: string; end?: boolean; permission: string }[] = [
  { to: '/stock', label: 'Actual', end: true, permission: 'stock.ver' },
  { to: '/stock/in', label: 'Ingreso', permission: 'stock.mover' },
  { to: '/stock/out', label: 'Egreso', permission: 'stock.mover' },
  { to: '/stock/transfer', label: 'Transferir', permission: 'stock.transferir' },
  { to: '/stock/history', label: 'Historial', permission: 'stock.ver' },
  { to: '/stock/expirations', label: 'Vencimientos', permission: 'stock.ver' },
  { to: '/stock/restock', label: 'Reposición', permission: 'stock.ver' },
];

/**
 * Navegación interna del módulo Stock: Ingreso, Egreso e Historial son vistas de
 * Stock, no módulos aparte del escritorio (ver docs/diseno.md).
 */
export function StockNav() {
  const { can } = useAuth();
  const tabs = TABS.filter(t => can(t.permission));
  return (
    <div className="-mt-1 flex flex-wrap gap-1.5">
      {tabs.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          viewTransition
          className={({ isActive }) =>
            cn(
              'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-card hover:text-foreground',
            )
          }
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  );
}
