import type { ReactNode } from 'react';
import type { Icon } from '@phosphor-icons/react';

/**
 * Una pantalla (o vista) vacía es una invitación a hacer algo: si hay una
 * acción natural para el vacío, se pasa en `action` y se muestra acá mismo
 * (ver docs/diseno.md, «El molde»).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: Icon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <Icon className="size-8 text-muted-foreground" />
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-chico text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
