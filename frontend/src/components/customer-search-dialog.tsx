import { useEffect, useRef, useState } from 'react';
import { MagnifyingGlass, User } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/spinner';
import { api, type Customer } from '@/lib/api';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';

const LIMITE = 8;

/**
 * Buscador de clientes para la caja (F4) — reemplaza el `<select>` con todos
 * los clientes de la empresa, que con cuenta corriente activa fácil pasa de
 * cien filas y no se puede tipear para filtrar. Mismo molde que
 * `ProductSearchDialog`: escribir sin esperar, flechas + Enter, Escape sale.
 * "Consumidor final" queda siempre a mano arriba de los resultados.
 */
export function CustomerSearchDialog({
  open,
  onOpenChange,
  onPick,
  token,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = consumidor final. */
  onPick: (cliente: Customer | null) => void;
  token: string;
}) {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState<Customer[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [marcado, setMarcado] = useState(0);
  const listaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) { setTexto(''); setResultados([]); setMarcado(0); }
  }, [open]);

  useEffect(() => {
    if (!open || texto.trim().length < 2) { setResultados([]); return; }
    let cancelado = false;
    setBuscando(true);
    const t = setTimeout(() => {
      api<Customer[]>(`/customers?search=${encodeURIComponent(texto.trim())}`, {}, token)
        .then(r => { if (!cancelado) { setResultados(r.slice(0, LIMITE)); setMarcado(0); } })
        .catch(() => { if (!cancelado) setResultados([]); })
        .finally(() => { if (!cancelado) setBuscando(false); });
    }, 250);
    return () => { cancelado = true; clearTimeout(t); };
  }, [texto, open, token]);

  // El "0" del marcado es siempre "Consumidor final"; los resultados arrancan en 1.
  const filas = resultados.length + 1;

  function elegir(cliente: Customer | null) {
    onPick(cliente);
    onOpenChange(false);
  }

  function alTeclear(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setMarcado(m => Math.min(m + 1, filas - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setMarcado(m => Math.max(m - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); elegir(marcado === 0 ? null : resultados[marcado - 1]); }
  }

  useEffect(() => {
    listaRef.current?.querySelector<HTMLElement>(`[data-fila="${marcado}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [marcado]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Elegir cliente</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2">
          <MagnifyingGlass className="size-4 shrink-0 text-placeholder" />
          <input
            autoFocus
            aria-label="Buscar por nombre o CUIT"
            placeholder="Nombre o CUIT"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-placeholder"
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={alTeclear}
          />
          {buscando && <Spinner />}
        </div>

        <div ref={listaRef} className="max-h-80 overflow-y-auto rounded-md border border-border">
          <div
            data-fila={0}
            onMouseEnter={() => setMarcado(0)}
            className={cn('flex items-center gap-3 border-b border-border-soft px-3 py-2.5', marcado === 0 && 'bg-accent')}
          >
            <User className="size-4 shrink-0 text-muted-foreground" />
            <p className="min-w-0 flex-1 text-sm font-medium">Consumidor final</p>
            <Button size="sm" onClick={() => elegir(null)}>Elegir</Button>
          </div>

          {texto.trim().length < 2 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Escribí al menos dos letras para buscar un cliente con cuenta.</p>
          ) : resultados.length === 0 && !buscando ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sin resultados para «{texto}».</p>
          ) : (
            resultados.map((c, i) => (
              <div
                key={c.id}
                data-fila={i + 1}
                onMouseEnter={() => setMarcado(i + 1)}
                className={cn(
                  'flex items-center gap-3 border-b border-border-soft px-3 py-2.5 last:border-0',
                  i + 1 === marcado && 'bg-accent',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="truncate text-xs text-placeholder">
                    {c.taxId || c.phone || 'Sin datos de contacto'}
                  </p>
                </div>
                {Number(c.accountBalance ?? 0) !== 0 && (
                  <p className="shrink-0 text-xs font-medium text-warning tabular">Cta cte {money(Number(c.accountBalance))}</p>
                )}
                <Button size="sm" onClick={() => elegir(c)}>Elegir</Button>
              </div>
            ))
          )}
        </div>

        <p className="text-xs text-placeholder">
          Flechas para moverte, Enter para elegir, Escape para salir.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
