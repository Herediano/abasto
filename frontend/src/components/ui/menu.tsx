import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import { cn } from '@/lib/utils';

/*
 * Menú desplegable del sistema, sobre Radix `DropdownMenu`: trae por sí solo lo
 * que los menús hechos a mano no tenían —cerrar con `Escape`, foco atrapado,
 * navegación con flechas, typeahead y el foco que vuelve al disparador—. La
 * superficie flota (`shadow-float`), como el diálogo y el menú de la cuenta.
 */

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;
export const MenuGroup = DropdownMenu.Group;
export const MenuRadioGroup = DropdownMenu.RadioGroup;

export const MenuContent = forwardRef<
  ElementRef<typeof DropdownMenu.Content>,
  ComponentPropsWithoutRef<typeof DropdownMenu.Content>
>(({ className, sideOffset = 6, align = 'end', ...props }, ref) => (
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[12rem] overflow-hidden rounded-md border border-border bg-card p-1 text-chico shadow-float',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className,
      )}
      {...props}
    />
  </DropdownMenu.Portal>
));
MenuContent.displayName = 'MenuContent';

const itemBase =
  'relative flex w-full cursor-pointer select-none items-center gap-2.5 rounded-sm px-2.5 py-2 text-left outline-none transition-colors data-[highlighted]:bg-background data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

export const MenuItem = forwardRef<
  ElementRef<typeof DropdownMenu.Item>,
  ComponentPropsWithoutRef<typeof DropdownMenu.Item> & { destructive?: boolean }
>(({ className, destructive, ...props }, ref) => (
  <DropdownMenu.Item
    ref={ref}
    className={cn(itemBase, destructive && 'text-destructive data-[highlighted]:bg-destructive-soft', className)}
    {...props}
  />
));
MenuItem.displayName = 'MenuItem';

export const MenuRadioItem = forwardRef<
  ElementRef<typeof DropdownMenu.RadioItem>,
  ComponentPropsWithoutRef<typeof DropdownMenu.RadioItem>
>(({ className, ...props }, ref) => (
  <DropdownMenu.RadioItem ref={ref} className={cn(itemBase, className)} {...props} />
));
MenuRadioItem.displayName = 'MenuRadioItem';

export const MenuLabel = forwardRef<
  ElementRef<typeof DropdownMenu.Label>,
  ComponentPropsWithoutRef<typeof DropdownMenu.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenu.Label ref={ref} className={cn('px-2.5 pb-1 pt-1.5 text-micro font-medium text-placeholder', className)} {...props} />
));
MenuLabel.displayName = 'MenuLabel';

export const MenuSeparator = forwardRef<
  ElementRef<typeof DropdownMenu.Separator>,
  ComponentPropsWithoutRef<typeof DropdownMenu.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenu.Separator ref={ref} className={cn('my-1 h-px bg-border-soft', className)} {...props} />
));
MenuSeparator.displayName = 'MenuSeparator';

/** Bloque no interactivo dentro del menú (datos, cabecera con avatar). */
export function MenuBlock({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('px-2.5 py-1.5', className)} {...props} />;
}
