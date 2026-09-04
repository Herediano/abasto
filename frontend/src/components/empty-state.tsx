import type { Icon } from '@phosphor-icons/react';

export function EmptyState({ icon: Icon, title, description }: { icon: Icon; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <Icon className="size-8 text-muted-foreground" />
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
