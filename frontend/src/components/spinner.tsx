import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-4 animate-spin', className)} />;
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Spinner className="size-6" />
    </div>
  );
}
