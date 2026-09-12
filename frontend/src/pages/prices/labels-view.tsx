import { useEffect, useRef, useState } from 'react';
import { MagnifyingGlass, Printer, Trash } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { LabelPrint, PER_PAGE_OPTIONS, type LabelItem, type PerPage } from '@/components/label-print';
import { ModuleSection } from '@/components/module-screen';
import { ProductSearchDialog } from '@/components/product-search-dialog';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, type Product } from '@/lib/api';
import { money } from '@/lib/format';

/**
 * Etiquetas de góndola por lote: se cargan productos de a uno (escaneo,
 * código o F3) hasta armar la tanda del día, y se imprimen todas juntas.
 * Sólo precio de lista — precios de promoción quedan para más adelante (ver
 * docs). La tanda en armado se guarda en el navegador para no perderla si
 * se cambia de pantalla sin querer, igual que el borrador de una compra.
 */

type Linea = { productId: string; name: string; brand?: string | null; barcode: string; price: number | null; copies: number };

function draftKey(tenantId: string) {
  return `abasto-labels-draft:${tenantId}`;
}

function readDraft(tenantId: string): Linea[] {
  try {
    const raw = localStorage.getItem(draftKey(tenantId));
    return raw ? (JSON.parse(raw) as Linea[]) : [];
  } catch {
    return [];
  }
}

export function LabelsView({ token, tenantId }: { token: string; tenantId: string }) {
  const [lineas, setLineas] = useState<Linea[]>(() => readDraft(tenantId));
  const [barcode, setBarcode] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [buscarOpen, setBuscarOpen] = useState(false);
  const [error, setError] = useState('');
  const [perPage, setPerPage] = useState<PerPage>(6);
  const [imprimiendo, setImprimiendo] = useState<LabelItem[] | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(draftKey(tenantId), JSON.stringify(lineas));
  }, [tenantId, lineas]);

  // F3 abre el buscador, igual que en la caja y en compras.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'F3') { e.preventDefault(); setBuscarOpen(true); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function agregarProducto(p: Product) {
    setLineas(prev => {
      const existente = prev.find(l => l.productId === p.id);
      if (existente) return prev.map(l => (l === existente ? { ...l, copies: l.copies + 1 } : l));
      return [...prev, { productId: p.id, name: p.name, brand: p.brand, barcode: p.barcode, price: p.salePrice ? Number(p.salePrice) : null, copies: 1 }];
    });
    setError('');
  }

  async function agregarPorCodigo(codigo: string) {
    const limpio = codigo.trim();
    if (!limpio) return;
    setBuscando(true);
    setError('');
    try {
      const r = await api<{ items: Product[] }>(`/products?barcode=${encodeURIComponent(limpio)}`, {}, token);
      const p = r.items[0];
      if (!p) { setError(`No hay ningún producto con el código ${limpio}`); return; }
      agregarProducto(p);
      setBarcode('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBuscando(false);
      barcodeRef.current?.focus();
    }
  }

  function setCopies(productId: string, copies: number) {
    setLineas(prev => prev.map(l => (l.productId === productId ? { ...l, copies: Math.max(1, Math.floor(copies) || 1) } : l)));
  }

  function quitar(productId: string) {
    setLineas(prev => prev.filter(l => l.productId !== productId));
  }

  const sinPrecio = lineas.filter(l => l.price == null).length;
  const totalEtiquetas = lineas.reduce((s, l) => s + l.copies, 0);

  return (
    <div className="flex flex-col gap-6">
      <ModuleSection
        title="Cargar productos"
        description="Escaneá, tipeá el código de barras o buscá por nombre (F3). Si cargás el mismo producto de nuevo, suma una copia más en vez de duplicar la fila."
      >
        {error && <Alert variant="destructive">{error}</Alert>}
        <div className="flex gap-2">
          <Input
            ref={barcodeRef}
            autoFocus
            placeholder="Escanear o tipear el código de barras"
            value={barcode}
            onChange={e => setBarcode(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); void agregarPorCodigo(barcode); }
            }}
            disabled={buscando}
          />
          <Button type="button" variant="outline" className="shrink-0" onClick={() => setBuscarOpen(true)} title="Buscar producto (F3)">
            <MagnifyingGlass /> <Kbd>F3</Kbd>
          </Button>
        </div>

        {lineas.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Copias</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineas.map(l => (
                <TableRow key={l.productId}>
                  <TableCell>
                    <div className="font-medium">{l.name}</div>
                    <div className="text-chico text-placeholder">{l.barcode}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    {l.price != null ? money(l.price) : <Badge variant="warning">Sin precio</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number" min="1" step="1" value={l.copies}
                      onChange={e => setCopies(l.productId, Number(e.target.value))}
                      className="ml-auto h-8 max-w-20 text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <button type="button" onClick={() => quitar(l.productId)} className="text-muted-foreground hover:text-destructive" aria-label={`Quitar ${l.name}`}>
                      <Trash className="size-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">Todavía no cargaste ningún producto para esta tanda.</p>
        )}
      </ModuleSection>

      <ModuleSection title="Imprimir" description="Sólo el precio de lista de hoy — precios de promoción quedan para más adelante.">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Etiquetas por hoja" htmlFor="labels-per-page" className="max-w-52">
            <Select id="labels-per-page" value={perPage} onChange={e => setPerPage(Number(e.target.value) as PerPage)}>
              {PER_PAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Button
            type="button"
            disabled={lineas.length === 0}
            onClick={() => setImprimiendo(lineas.map(l => ({ name: l.name, brand: l.brand, barcode: l.barcode, price: l.price, copies: l.copies })))}
          >
            <Printer /> Imprimir{totalEtiquetas > 0 ? ` (${totalEtiquetas})` : ''}
          </Button>
          {lineas.length > 0 && (
            <Button type="button" variant="ghost" onClick={() => setLineas([])}>
              <Trash /> Vaciar lista
            </Button>
          )}
        </div>
        {sinPrecio > 0 && (
          <p className="text-chico text-warning">
            {sinPrecio} producto{sinPrecio > 1 ? 's' : ''} sin precio de venta cargado — su etiqueta sale con el precio en blanco.
          </p>
        )}
      </ModuleSection>

      <ProductSearchDialog
        open={buscarOpen}
        onOpenChange={setBuscarOpen}
        titulo="Buscar producto"
        accion="Agregar"
        token={token}
        onPick={p => { setBuscarOpen(false); agregarProducto(p); barcodeRef.current?.focus(); }}
      />

      <LabelPrint items={imprimiendo} perPage={perPage} onPrinted={() => setImprimiendo(null)} />
    </div>
  );
}
