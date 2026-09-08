import { NavLink, useLocation } from 'react-router-dom';
import { type Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface SidebarItemProps {
  to: string;
  icon: Icon;
  label: string;
  hue?: string;
}

export function SidebarItem({ to, icon: Icon, label, hue = 'var(--color-primary)' }: SidebarItemProps) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <NavLink
      to={to}
      aria-current={isActive ? 'page' : undefined}
      title={label}
      className={cn(
        'relative h-16 flex items-center justify-start gap-3 pl-5 rounded-xl border border-transparent group overflow-hidden',
        'transition-all duration-300 ease-in-out',
        isActive
          ? 'bg-foreground text-card shadow-lg border-primary/50'
          : 'text-muted-foreground hover:bg-foreground hover:text-card hover:border hover:shadow-lg',
      )}
      style={{ width: '64px' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.width = '240px'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.width = '64px'; }}
    >
      <Icon
        className={cn(
          'size-6 shrink-0 transition-all duration-300 ease-in-out',
          isActive ? 'scale-125' : '',
          'group-hover:scale-125',
        )}
        weight={isActive ? 'fill' : 'regular'}
        style={isActive ? { color: hue } : undefined}
      />
      <span className="whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        {label}
      </span>
    </NavLink>
  );
}
