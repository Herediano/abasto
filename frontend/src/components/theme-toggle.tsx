import { Moon, Sun } from '@phosphor-icons/react';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

const TEMAS = {
  light: { icon: Sun, label: 'Cambiar a tema oscuro' },
  dark: { icon: Moon, label: 'Cambiar a tema claro' },
} as const;

/** Claro / oscuro, nada más — un tercer estado "automático" no tiene lugar en un botón de dos íconos. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, ciclar } = useTheme();
  const TemaIcon = TEMAS[theme].icon;
  return (
    <button
      type="button"
      onClick={ciclar}
      aria-label={TEMAS[theme].label}
      title={TEMAS[theme].label}
      className={cn('grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-hover hover:text-foreground', className)}
    >
      <TemaIcon weight="fill" className="size-[18px]" />
    </button>
  );
}
