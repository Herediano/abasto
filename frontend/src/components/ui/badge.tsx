import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// La píldora es la única forma redonda del sistema fuera de los tres radios
// (ver docs/diseno.md, "Forma"): marca un token de conteo o de estado, no una
// superficie. El color de fondo tenue está permitido acá —es una etiqueta
// chica, no un bloque— pero el estado real de una fila lo sigue diciendo el
// texto; el badge sólo lo repite en compacto.
const badgeVariants = cva('inline-flex items-center rounded-md border px-2.5 py-0.5 text-micro font-medium transition-colors', {
  variants: {
    variant: {
      default: 'border-transparent bg-primary/10 text-primary',
      secondary: 'border-transparent bg-secondary text-secondary-foreground',
      success: 'border-transparent bg-success/10 text-success',
      warning: 'border-transparent bg-warning/10 text-warning',
      destructive: 'border-transparent bg-destructive/10 text-destructive',
      outline: 'border-border text-foreground',
      // Fondo suave del primario: ahorro / descuento mayorista, precio de lista.
      accent: 'border-transparent bg-accent text-accent-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
});

export function Badge({ className, variant, ...props }: HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
