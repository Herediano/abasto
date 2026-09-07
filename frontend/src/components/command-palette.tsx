import { useEffect, useMemo, useRef, useState } from 'react';
import { MagnifyingGlass, Sparkle } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { visibleModules } from '@/lib/modules';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

/** Quita acentos y pasa a minúsculas para que "vencimiento" matchee "Vencimientos". */
const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/**
 * Ctrl+K desde cualquier lado (ver docs/diseno.md, "IA — Ctrl + K"). Hoy: buscador
 * de módulos. La capa de preguntas a la IA viene después.
 *
 * Se maneja con teclado: ↑ / ↓ mueven la selección, Enter entra, Esc cierra
 * (Radix). El ítem activo se resalta y se mantiene a la vista.
 */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const mods = useMemo(() => visibleModules(can), [can]);
  const results = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return mods;
    return mods.filter(m => norm(m.label).includes(q) || norm(m.blurb).includes(q));
  }, [mods, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Cada tecleo puede acortar la lista: la selección vuelve arriba.
  useEffect(() => setActive(0), [query]);

  // El ítem activo se mantiene dentro del scroll.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function go(path: string) {
    onOpenChange(false);
    navigate(path, { viewTransition: true });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = results[active];
      if (pick) go(pick.path);
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-label="Buscar en Abasto"
          className="fixed left-1/2 top-[12vh] z-50 flex max-h-[76vh] w-full max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-float data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          onOpenAutoFocus={e => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <DialogPrimitive.Title className="sr-only">Buscar en Abasto</DialogPrimitive.Title>

          <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
            <MagnifyingGlass className="size-5 shrink-0 text-primary" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Buscá un módulo…"
              autoComplete="off"
              role="combobox"
              aria-expanded
              aria-controls="command-palette-list"
              aria-activedescendant={results[active] ? `cp-item-${results[active].key}` : undefined}
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-placeholder"
            />
          </div>

          <div ref={listRef} id="command-palette-list" role="listbox" className="min-h-0 flex-1 overflow-y-auto p-2">
            {results.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nada coincide con «{query}».</p>
            ) : (
              <>
                <p className="px-2 pb-1 pt-1.5 text-chico font-medium text-placeholder">Ir a un módulo</p>
                {results.map((m, i) => (
                  <button
                    key={m.key}
                    id={`cp-item-${m.key}`}
                    data-idx={i}
                    role="option"
                    aria-selected={i === active}
                    type="button"
                    onClick={() => go(m.path)}
                    onMouseMove={() => setActive(i)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-chico transition-colors',
                      i === active && 'bg-background',
                    )}
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                      <m.Icon weight="fill" className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">{m.label}</span>
                      <span className="block truncate text-micro text-placeholder">{m.blurb}</span>
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>

          <p className="flex items-center gap-2 border-t border-border-soft px-4 py-2.5 text-micro text-placeholder">
            <Sparkle className="size-3.5" />
            Preguntarle a la IA sobre el negocio — próximamente.
          </p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
