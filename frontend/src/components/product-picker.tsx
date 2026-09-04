import { useEffect, useRef, useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { api, type Pagination, type Product } from '@/lib/api';
import { cn } from '@/lib/utils';

export function ProductPicker({ token, value, onSelect, placeholder = 'Buscar por nombre o código de barras', id }: { token: string; value: Product | null; onSelect: (product: Product) => void; placeholder?: string; id?: string }) {
  const [query, setQuery] = useState(value ? `${value.name} · ${value.barcode}` : '');
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value ? `${value.name} · ${value.barcode}` : '');
  }, [value]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      const params = new URLSearchParams({ search: query.trim(), pageSize: '10' });
      api<{ items: Product[]; pagination: Pagination }>(`/products?${params}`, {}, token)
        .then(r => setResults(r.items))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, open, token]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          className="pl-8"
          placeholder={placeholder}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-card shadow-md">
          {results.map(p => (
            <button
              key={p.id}
              type="button"
              className={cn('block w-full px-3 py-2 text-left text-sm hover:bg-secondary', value?.id === p.id && 'bg-secondary')}
              onClick={() => {
                onSelect(p);
                setOpen(false);
              }}
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-muted-foreground">{p.barcode}</div>
            </button>
          ))}
        </div>
      )}
      {open && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card p-3 text-sm text-muted-foreground shadow-md">Sin resultados</div>
      )}
    </div>
  );
}
