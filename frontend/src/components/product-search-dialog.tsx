import { useEffect, useRef, useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/spinner';
import { api, errorMessage, type Product } from '@/lib/api';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Buscador de productos, pensado para usarse desde cualquier pantalla que
 * necesite elegir uno: la caja con F3, el ingreso de mercadería, la carga de
 * una factura de compra.
 *
 * La tolerancia a abreviaturas, acentos y errores de tipeo la pone el backend
 * (product-search.util). Acá está lo de la pantalla: escribir sin esperar,
 * moverse con las flechas, elegir con Enter y salir con Escape, para poder
 * operarlo sin soltar el teclado.
 *
 * Con `cotizarPara` además muestra el precio que realmente le saldría a ese
 * cliente — escalas y promociones incluidas — en vez del precio de lista. Si
 * la cotización falla, los resultados se muestran igual con el precio de lista
 * y se dice por qué.
 */

type LineaCotizada = { productId: string; unitPrice: number };

export function ProductSearchDialog({
  open,
  onOpenChange,
  onPick,
  titulo = 'Buscar producto',
  accion = 'Agregar',
  cotizarPara,
  exigirPrecio = false,
  token,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (producto: Product) => void;
  titulo?: string;
  accion?: string;
  /** Id de cliente (o cadena vacía para consumidor final). Sin esto no cotiza. */
  cotizarPara?: string;
  /** La caja no puede vender algo sin precio; el ingreso de mercadería sí lo acepta. */
  exigirPrecio?: boolean;
  token: string;
}) {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState<Product[]>([]);
  const [precios, setPrecios] = useState<Record<string, number>>({});
  const [aviso, setAviso] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [marcado, setMarcado] = useState(0);
  const listaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) { setTexto(''); setResultados([]); setPrecios({}); setAviso(''); setMarcado(0); }
  }, [open]);

  useEffect(() => {
    if (!open || texto.trim().length < 2) {
      setResultados([]);
      setPrecios({});
      setAviso('');
      return;
    }
    let cancelado = false;
    setBuscando(true);
    const t = setTimeout(() => {
      (async () => {
        let encontrados: Product[] = [];
        try {
          const r = await api<{ items: Product[] }>(`/products?search=${encodeURIComponent(texto.trim())}&pageSize=8`, {}, token);
          encontrados = r.items;
        } catch {
          if (!cancelado) { setResultados([]); setPrecios({}); setAviso(''); }
          return;
        }
        if (cancelado) return;
        setResultados(encontrados);
        setMarcado(0);

        if (cotizarPara === undefined) return;
        const conPrecio = encontrados.filter(p => p.salePrice);
        if (!conPrecio.length) { setPrecios({}); setAviso(''); return; }
        try {
          const q = await api<{ lines: LineaCotizada[] }>('/sales/quote', {
            method: 'POST',
            body: JSON.stringify({
              customerId: cotizarPara || undefined,
              lines: conPrecio.map(p => ({ productId: p.id, quantity: 1 })),
            }),
          }, token);
          if (!cancelado) { setPrecios(Object.fromEntries(q.lines.map(l => [l.productId, l.unitPrice]))); setAviso(''); }
        } catch (err) {
          if (!cancelado) { setPrecios({}); setAviso(errorMessage(err)); }
        }
      })().finally(() => { if (!cancelado) setBuscando(false); });
    }, 250);
    return () => { cancelado = true; clearTimeout(t); };
  }, [texto, open, cotizarPara, token]);

  function elegible(p: Product) {
    return !exigirPrecio || !!p.salePrice;
  }

  function elegir(p: Product) {
    if (!elegible(p)) return;
    onPick(p);
    onOpenChange(false);
  }

  function alTeclear(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setMarcado(m => Math.min(m + 1, resultados.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setMarcado(m => Math.max(m - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); const p = resultados[marcado]; if (p) elegir(p); }
  }

  // Mantener a la vista la fila marcada cuando se baja con las flechas.
  useEffect(() => {
    listaRef.current?.querySelector<HTMLElement>(`[data-fila="${marcado}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [marcado]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2">
          <MagnifyingGlass className="size-4 shrink-0 text-placeholder" />
          <input
            autoFocus
            aria-label="Buscar por nombre, marca o código"
            placeholder="Nombre, marca o código"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-placeholder"
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={alTeclear}
          />
          {buscando && <Spinner />}
        </div>

        {aviso ? (
          <p className="text-xs text-warning">Se muestra el precio de lista: {aviso}</p>
        ) : cotizarPara !== undefined ? (
          <p className="text-xs text-placeholder">Precio neto (sin IVA) para el cliente elegido</p>
        ) : null}

        <div ref={listaRef} className="max-h-80 overflow-y-auto rounded-md border border-border">
          {texto.trim().length < 2 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Escribí al menos dos letras.</p>
          ) : resultados.length === 0 && !buscando ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sin resultados para «{texto}».</p>
          ) : (
            resultados.map((p, i) => (
              <div
                key={p.id}
                data-fila={i}
                onMouseEnter={() => setMarcado(i)}
                className={cn(
                  'flex items-center gap-3 border-b border-border-soft px-3 py-2.5 last:border-0',
                  i === marcado && 'bg-accent',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="font-mono text-xs text-placeholder">
                    {p.barcode}
                    {p.brand ? ` · ${p.brand}` : ''}
                  </p>
                </div>
                {cotizarPara !== undefined && (
                  <div className="shrink-0 text-right">
                    {p.salePrice
                      ? <p className="font-semibold tabular">{money(precios[p.id] ?? Number(p.salePrice))}</p>
                      : <Badge variant="warning">Sin precio</Badge>}
                  </div>
                )}
                <Button size="sm" onClick={() => elegir(p)} disabled={!elegible(p)}>
                  {accion}
                </Button>
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
