import { CircleNotch } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return <CircleNotch className={cn('size-4 animate-spin text-primary', className)} />;
}

export function PageSpinner({
  label,
  className,
}: {
  label?: string;
  className?: string;
} = {}) {
  return (
    <div
      className={cn(
        'flex min-h-[360px] flex-col items-center justify-center gap-3 py-16 text-muted-foreground animate-in fade-in duration-150',
        className,
      )}
    >
      <Spinner className="size-6 text-primary" />
      {label && <p className="text-chico font-medium text-muted-foreground">{label}</p>}
    </div>
  );
}

export function FullPageLoading({ label }: { label?: string } = {}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-6 animate-in fade-in duration-200">
      <div className="flex flex-col items-center gap-5">
        <div className="type-display text-2xl tracking-tight text-foreground sm:text-3xl">
          abasto<span className="text-primary">.ai</span>
        </div>
        <div className="relative h-0.5 w-28 overflow-hidden rounded-full bg-border-soft">
          <div className="h-full w-14 rounded-full bg-primary animate-progress" />
        </div>
        {label && (
          <p className="text-micro font-medium text-muted-foreground">{label}</p>
        )}
      </div>
    </div>
  );
}
