import { List } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useSidebarToggle } from './useSidebarToggle';

export function RailToggle({ className }: { className?: string }) {
  const { collapsed, toggle } = useSidebarToggle();

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      className={cn(
        'grid h-10 w-full place-items-center rounded-[5px] border border-[rgba(0,0,255,0.2)]',
        'bg-card/80 text-muted-foreground hover:bg-white hover:text-black hover:shadow-md',
        className,
      )}
      title={collapsed ? "Mostrar barra lateral" : "Ocultar barra lateral"}
      aria-label={collapsed ? "Mostrar barra lateral" : "Ocultar barra lateral"}
    >
      <List className="size-5" weight="regular" />
    </button>
  );
}
