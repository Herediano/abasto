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
 */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const mods = useMemo(() => visibleModules(can), [can]);
  const results = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return mods;
    return mods.filter(m => norm(m.label).includes(q) || norm(m.blurb).includes(q));
  }, [mods, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      // El autoFocus del input no siempre gana contra el foco que Radix mueve al abrir.
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  function go(path: string) {
    onOpenChange(false);
    navigate(path, { viewTransition: true });
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-[12vh] z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-card shadow-float data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          onOpenAutoFocus={e => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <DialogPrimitive.Title className="sr-only">Buscar en Abasto</DialogPrimitive.Title>

          <form
            onSubmit={e => {
              e.preventDefault();
              if (results[0]) go(results[0].path);
            }}
            className="flex items-center gap-2.5 border-b border-border px-4 py-3.5"
          >
            <MagnifyingGlass className="size-[17px] shrink-0 text-primary" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscá un módulo…"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-placeholder"
            />
          </form>

          <div className="max-h-[52vh] overflow-y-auto p-2">
            {results.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nada coincide con «{query}».</p>
            ) : (
              <>
                <p className="px-2 pb-1 pt-1.5 text-chico font-medium text-placeholder">Ir a un módulo</p>
                {results.map(m => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => go(m.path)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors',
                      'hover:bg-background',
                    )}
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                      <m.Icon weight="fill" className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">{m.label}</span>
                      <span className="block truncate text-[11px] text-placeholder">{m.blurb}</span>
                    </span>
                  </button>
                ))}
              </>
            )}

            <p className="mt-1 flex items-center gap-2 border-t border-border-soft px-2.5 pb-1 pt-2.5 text-[11px] text-placeholder">
              <Sparkle className="size-3.5" />
              Preguntarle a la IA sobre el negocio — próximamente.
            </p>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
