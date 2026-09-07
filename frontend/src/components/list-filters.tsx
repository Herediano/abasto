import { useState, type ReactNode } from 'react';
import { MagnifyingGlass, SlidersHorizontal, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export type ActiveFilter = { key: string; label: string; clear: () => void };

/**
 * El molde de todo listado (ver docs/diseno.md): un buscador siempre a mano, el
 * resto de los filtros detrás de «Filtros», y lo que queda activo vuelve como
 * chips que se sacan de a uno. El estado de los filtros lo maneja la página;
 * este componente sólo dibuja la fila y el panel.
 *
 * - `search` / `onSearch`: el buscador. Si no se pasan, no se muestra.
 * - `activeFilters`: para los chips, el contador y «Limpiar».
 * - `children`: los campos del panel (dentro de un `grid gap-4 sm:grid-cols-2`).
 *   Si no hay, no aparece el botón «Filtros».
 */
export function ListFilters({
  search,
  onSearch,
  searchPlaceholder = 'Buscar',
  searchLabel,
  activeFilters,
  children,
}: {
  search?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  activeFilters: ActiveFilter[];
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const hasSearch = search !== undefined && onSearch !== undefined;
  const hasPanel = Boolean(children);
  const clearAll = () => activeFilters.forEach(f => f.clear());

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {hasSearch && (
          <div className="relative min-w-56 flex-1 sm:max-w-md">
            <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-placeholder" />
            <Input
              aria-label={searchLabel ?? searchPlaceholder}
              className="pl-9"
              placeholder={searchPlaceholder}
              value={search}
              onChange={e => onSearch!(e.target.value)}
            />
          </div>
        )}
        {hasPanel && (
          <Button variant="outline" onClick={() => setOpen(true)}>
            <SlidersHorizontal /> Filtros
            {activeFilters.length > 0 && (
              <span className="ml-0.5 rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-foreground">
                {activeFilters.length}
              </span>
            )}
          </Button>
        )}
        {activeFilters.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={f.clear}
            className="inline-flex items-center gap-1.5 rounded-full border border-accent-border bg-accent py-1 pl-3 pr-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-80"
          >
            {f.label}
            <X className="size-3.5 opacity-70" />
          </button>
        ))}
        {activeFilters.length > 1 && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Limpiar
          </Button>
        )}
      </div>

      {hasPanel && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Filtros</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">{children}</div>
            <DialogFooter>
              <Button variant="outline" onClick={clearAll} disabled={activeFilters.length === 0}>
                Limpiar todo
              </Button>
              <Button onClick={() => setOpen(false)}>Ver resultados</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
