import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Chip de atajo de teclado. En un mostrador la mano no llega al mouse: el
 * atajo se muestra al lado de la acción para que se aprenda usando.
 */
export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded border border-border bg-secondary px-1.5 font-sans text-[11px] font-medium text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}
