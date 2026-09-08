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
        'relative h-10 flex items-center justify-center gap-0 rounded-[5px] border border-[rgba(0,0,255,0.2)] group overflow-hidden hover:justify-start hover:gap-2 hover:pl-3',
        'transition-all duration-200 ease-in-out',
        isActive
          ? 'bg-subtle text-foreground border-[rgba(0,0,255,0.2)] shadow-md'
          : 'bg-card/80 text-muted-foreground hover:bg-white hover:text-black hover:shadow-md',
      )}
      style={{ width: '100%' }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.width = '180px';
        el.style.zIndex = '100';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.width = '100%';
        el.style.zIndex = '';
      }}
    >
      <Icon
        className={cn(
          'size-5 shrink-0 transition-all duration-200 ease-in-out',
          isActive ? 'scale-125' : '',
          'group-hover:scale-125',
        )}
        weight={isActive ? 'fill' : 'regular'}
        style={isActive ? { color: hue } : undefined}
      />
      <span className="pointer-events-none absolute left-11 whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {label}
      </span>
    </NavLink>
  );
}
