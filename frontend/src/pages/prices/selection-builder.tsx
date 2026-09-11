import { useEffect, useMemo, useState } from 'react';
import { Broom, Funnel, MagnifyingGlass, Plus, X } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Field } from '@/components/field';
import { Spinner } from '@/components/spinner';
import { ProductSearchDialog } from '@/components/product-search-dialog';
import { api, errorMessage, type Category, type PriceSelection, type SelectionCount, type Supplier } from '@/lib/api';
import { money } from '@/lib/format';

/**
 * Elige a qué productos se les va a tocar el precio.
 *
 * Reemplaza el viejo selector de un solo eje (todos / una categoría / una
 * marca), que obligaba a una pasada por categoría y no llegaba nunca al caso
 * más común de todos: "me aumentó tal proveedor". Acá los filtros se **apilan**
 * —categorías + proveedor + margen bajo, si hace falta— y el contador dice en
 * vivo cuántos productos quedan seleccionados, para no aplicar a ciegas.
 *
 * Arriba van atajos de un clic para los trabajos que de verdad se repiten. No
 * son categorías de producto: son preguntas ("¿a qué le falta precio?", "¿qué
 * quedó trabajando por debajo del margen?").
 */

type Props = {
  value: PriceSelection;
  onChange: (next: PriceSelection) => void;
  categories: Category[];
  priceListId: string;
  validFrom: string;
  token: string;
  /** Se avisa para arriba para poder habilitar/deshabilitar el botón de aplicar. */
  onCount?: (total: number) => void;
};

const MARGEN_BAJO = 15;
const DIAS_SIN_CAMBIOS = 30;

const ATAJOS: Array<{ key: string; label: string; hint: string; build: () => PriceSelection }> = [
  { key: 'todos', label: 'Todos', hint: 'Todo el catálogo activo', build: () => ({}) },
  { key: 'sin-venta', label: 'Sin precio de venta', hint: 'Los que quedaron sin cotizar', build: () => ({ missing: 'sale' }) },
  { key: 'sin-costo', label: 'Sin costo', hint: 'No se les puede calcular margen', build: () => ({ missing: 'cost' }) },
  { key: 'margen-bajo', label: `Margen bajo (−${MARGEN_BAJO}%)`, hint: 'Se venden por debajo de lo que deberían, con un umbral parejo para todo el catálogo', build: () => ({ marginMax: MARGEN_BAJO }) },
  { key: 'bajo-su-categoria', label: 'Bajo el margen de su categoría', hint: 'Por debajo del margen objetivo cargado en SU categoría (Categorías → margen objetivo). No trae nada si ninguna categoría tiene uno cargado.', build: () => ({ belowCategoryMargin: true }) },
  { key: 'viejos', label: `Sin cambios ${DIAS_SIN_CAMBIOS} días`, hint: 'Los que se quedaron atrás', build: () => ({ staleDays: DIAS_SIN_CAMBIOS }) },
];

/** Elige varios de una lista, con buscador. Sirve para categorías, marcas y proveedores. */
function MultiPicker({
  titulo,
  opciones,
  elegidos,
  onChange,
}: {
  titulo: string;
  opciones: Array<{ id: string; name: string }>;
  elegidos: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [borrador, setBorrador] = useState<string[]>(elegidos);

  const abrir = () => {
    setBorrador(elegidos);
    setBusqueda('');
    setOpen(true);
  };

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtradas = q ? opciones.filter(o => o.name.toLowerCase().includes(q)) : opciones;
    return filtradas.slice(0, 300);
  }, [opciones, busqueda]);

  const toggle = (id: string) => setBorrador(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  return (
    <>
      <Button variant="outline" onClick={abrir} className="w-full justify-start font-normal" disabled={!opciones.length}>
        <Funnel />
        {elegidos.length === 0
          ? <span className="text-muted-foreground">{opciones.length ? `Elegir ${titulo.toLowerCase()}…` : 'Sin datos'}</span>
          : <span>{elegidos.length === 1 ? opciones.find(o => o.id === elegidos[0])?.name ?? '1 elegida' : `${elegidos.length} elegidas`}</span>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar…"
          />
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {visibles.length === 0 && <p className="text-sm text-muted-foreground">Nada coincide con la búsqueda.</p>}
            {visibles.map(o => (
              <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted">
                <Checkbox checked={borrador.includes(o.id)} onCheckedChange={() => toggle(o.id)} />
                <span className="text-sm">{o.name}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBorrador([])}>Ninguna</Button>
            <Button onClick={() => { onChange(borrador); setOpen(false); }}>
              Usar {borrador.length > 0 ? `(${borrador.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SelectionBuilder({ value, onChange, categories, priceListId, validFrom, token, onCount }: Props) {
  const [brands, setBrands] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [conteo, setConteo] = useState<SelectionCount | null>(null);
  const [contando, setContando] = useState(false);
  const [errorConteo, setErrorConteo] = useState('');
  const [verMuestra, setVerMuestra] = useState(false);
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [elegidosNombres, setElegidosNombres] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    api<string[]>('/products/brands', {}, token).then(setBrands).catch(() => {});
    api<Supplier[]>('/suppliers', {}, token).then(setSuppliers).catch(() => {});
  }, [token]);

  // Contador en vivo. Se espera a que el usuario deje de tipear para no pegarle
  // al backend en cada tecla.
  useEffect(() => {
    if (!priceListId) return;
    setContando(true);
    setErrorConteo('');
    const t = setTimeout(() => {
      api<SelectionCount>('/prices/selection/count', {
        method: 'POST',
        body: JSON.stringify({ priceListId, validFrom: validFrom || undefined, selection: value }),
      }, token)
        .then(r => {
          setConteo(r);
          onCount?.(r.total);
        })
        .catch(e => {
          setErrorConteo(errorMessage(e));
          setConteo(null);
          onCount?.(0);
        })
        .finally(() => setContando(false));
    }, 350);
    return () => clearTimeout(t);
    // `onCount` se deja afuera a propósito: si el padre la redefine en cada
    // render, incluirla volvería a contar en loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value), priceListId, validFrom, token]);

  const set = <K extends keyof PriceSelection>(key: K, v: PriceSelection[K]) => {
    const next = { ...value };
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) delete next[key];
    else next[key] = v;
    onChange(next);
  };

  const num = (v: string): number | undefined => {
    if (v.trim() === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const atajoActivo = ATAJOS.find(a => JSON.stringify(a.build()) === JSON.stringify(value))?.key;

  // Chips de lo que está filtrando ahora, para poder sacarlo de a uno.
  const chips: Array<{ key: string; label: string; clear: () => void }> = [];
  if (value.categoryIds?.length) {
    chips.push({
      key: 'cat',
      label: value.categoryIds.length === 1
        ? categories.find(c => c.id === value.categoryIds![0])?.name ?? '1 categoría'
        : `${value.categoryIds.length} categorías`,
      clear: () => set('categoryIds', undefined),
    });
  }
  if (value.brands?.length) {
    chips.push({ key: 'marca', label: value.brands.length === 1 ? value.brands[0] : `${value.brands.length} marcas`, clear: () => set('brands', undefined) });
  }
  if (value.supplierIds?.length) {
    chips.push({
      key: 'prov',
      label: value.supplierIds.length === 1
        ? suppliers.find(s => s.id === value.supplierIds![0])?.name ?? '1 proveedor'
        : `${value.supplierIds.length} proveedores`,
      clear: () => set('supplierIds', undefined),
    });
  }
  if (value.productIds?.length) chips.push({ key: 'prods', label: `${value.productIds.length} producto${value.productIds.length === 1 ? '' : 's'} a mano`, clear: () => set('productIds', undefined) });
  if (value.excludeIds?.length) chips.push({ key: 'excl', label: `${value.excludeIds.length} excluido${value.excludeIds.length === 1 ? '' : 's'}`, clear: () => set('excludeIds', undefined) });
  if (value.search) chips.push({ key: 'q', label: `«${value.search}»`, clear: () => set('search', undefined) });
  if (value.missing === 'sale') chips.push({ key: 'ms', label: 'sin precio de venta', clear: () => set('missing', undefined) });
  if (value.missing === 'cost') chips.push({ key: 'mc', label: 'sin costo', clear: () => set('missing', undefined) });
  if (value.marginMin !== undefined) chips.push({ key: 'mgmin', label: `margen ≥ ${value.marginMin}%`, clear: () => set('marginMin', undefined) });
  if (value.marginMax !== undefined) chips.push({ key: 'mgmax', label: `margen ≤ ${value.marginMax}%`, clear: () => set('marginMax', undefined) });
  if (value.belowCategoryMargin) chips.push({ key: 'bcm', label: 'bajo el margen de su categoría', clear: () => set('belowCategoryMargin', undefined) });
  if (value.priceMin !== undefined) chips.push({ key: 'pmin', label: `precio ≥ ${money(value.priceMin)}`, clear: () => set('priceMin', undefined) });
  if (value.priceMax !== undefined) chips.push({ key: 'pmax', label: `precio ≤ ${money(value.priceMax)}`, clear: () => set('priceMax', undefined) });
  if (value.staleDays !== undefined) chips.push({ key: 'stale', label: `sin cambios ${value.staleDays} días`, clear: () => set('staleDays', undefined) });

  const agregarProducto = (p: { id: string; name: string }) => {
    setElegidosNombres(prev => new Map(prev).set(p.id, p.name));
    set('productIds', [...new Set([...(value.productIds ?? []), p.id])]);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Atajos: las preguntas que se repiten, en un clic. */}
      <div className="flex flex-wrap gap-2">
        {ATAJOS.map(a => (
          <Button
            key={a.key}
            size="sm"
            variant={atajoActivo === a.key ? 'default' : 'outline'}
            title={a.hint}
            onClick={() => onChange(a.build())}
          >
            {a.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Categorías">
          <MultiPicker titulo="Categorías" opciones={categories} elegidos={value.categoryIds ?? []} onChange={v => set('categoryIds', v)} />
        </Field>
        <Field label="Marcas">
          <MultiPicker titulo="Marcas" opciones={brands.map(b => ({ id: b, name: b }))} elegidos={value.brands ?? []} onChange={v => set('brands', v)} />
        </Field>
        <Field label="Proveedores" hint="el que aumenta">
          <MultiPicker titulo="Proveedores" opciones={suppliers} elegidos={value.supplierIds ?? []} onChange={v => set('supplierIds', v)} />
        </Field>

        <Field label="Que el nombre diga" htmlFor="sel-q">
          <Input id="sel-q" value={value.search ?? ''} onChange={e => set('search', e.target.value)} placeholder="coca, 900ml, fideo…" />
        </Field>
        <Field label="Le falta cargar" htmlFor="sel-missing">
          <Select id="sel-missing" value={value.missing ?? ''} onChange={e => set('missing', (e.target.value || undefined) as PriceSelection['missing'])}>
            <option value="">—</option>
            <option value="sale">Precio de venta</option>
            <option value="cost">Precio de costo</option>
          </Select>
        </Field>
        <Field label="Sin cambios desde" htmlFor="sel-stale" hint="días">
          <Input id="sel-stale" type="number" min="1" value={value.staleDays ?? ''} onChange={e => set('staleDays', num(e.target.value))} placeholder="30" />
        </Field>

        <Field label="Margen actual (%)" hint="desde / hasta">
          <div className="flex gap-2">
            <Input type="number" step="0.01" value={value.marginMin ?? ''} onChange={e => set('marginMin', num(e.target.value))} placeholder="mín" />
            <Input type="number" step="0.01" value={value.marginMax ?? ''} onChange={e => set('marginMax', num(e.target.value))} placeholder="máx" />
          </div>
        </Field>
        <Field label="Precio de venta" hint="desde / hasta">
          <div className="flex gap-2">
            <Input type="number" step="0.01" value={value.priceMin ?? ''} onChange={e => set('priceMin', num(e.target.value))} placeholder="mín" />
            <Input type="number" step="0.01" value={value.priceMax ?? ''} onChange={e => set('priceMax', num(e.target.value))} placeholder="máx" />
          </div>
        </Field>
        <Field label="Productos a mano" hint="uno por uno">
          <Button variant="outline" className="w-full justify-start font-normal" onClick={() => setBuscadorAbierto(true)}>
            <Plus />
            {value.productIds?.length ? `${value.productIds.length} elegido${value.productIds.length === 1 ? '' : 's'}` : <span className="text-muted-foreground">Buscar y agregar…</span>}
          </Button>
        </Field>
      </div>

      {/* Los productos elegidos a mano se muestran uno por uno: son pocos y hay que poder sacarlos. */}
      {value.productIds?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {value.productIds.map(id => (
            <Badge key={id} variant="secondary" className="gap-1">
              {elegidosNombres.get(id) ?? id.slice(0, 8)}
              <button
                type="button"
                aria-label="Quitar"
                onClick={() => set('productIds', value.productIds!.filter(x => x !== id))}
                className="opacity-60 hover:opacity-100"
              >
                <X size={12} />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      {/* Resumen: qué está filtrando y cuántos quedan. */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-3">
        <span className="text-sm font-medium">
          {contando
            ? <Spinner />
            : errorConteo
              ? <span className="text-destructive">{errorConteo}</span>
              : <>{conteo?.total ?? 0} producto{conteo?.total === 1 ? '' : 's'} seleccionado{conteo?.total === 1 ? '' : 's'}</>}
        </span>

        {chips.length > 0 && <span className="text-muted-foreground">·</span>}
        {chips.map(c => (
          <Badge key={c.key} variant="outline" className="gap-1">
            {c.label}
            <button type="button" aria-label={`Quitar ${c.label}`} onClick={c.clear} className="opacity-60 hover:opacity-100">
              <X size={12} />
            </button>
          </Badge>
        ))}
        {chips.length === 0 && <span className="text-sm text-muted-foreground">sin filtros: todo el catálogo</span>}

        <div className="ml-auto flex gap-2">
          {conteo && conteo.total > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setVerMuestra(v => !v)}>
              <MagnifyingGlass /> {verMuestra ? 'Ocultar' : 'Ver una muestra'}
            </Button>
          )}
          {chips.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onChange({})}>
              <Broom /> Limpiar
            </Button>
          )}
        </div>
      </div>

      {verMuestra && conteo && conteo.sample.length > 0 && (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead className="text-right">Venta</TableHead>
                <TableHead className="text-right">Margen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conteo.sample.map(p => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{p.cost === null ? '—' : money(p.cost)}</TableCell>
                  <TableCell className="text-right">{p.sale === null ? '—' : money(p.sale)}</TableCell>
                  <TableCell className="text-right">{p.margin === null ? '—' : `${p.margin.toFixed(1)}%`}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {conteo.total > conteo.sample.length && (
            <p className="border-t px-3 py-2 text-xs text-muted-foreground">
              Muestra de {conteo.sample.length} sobre {conteo.total}.
            </p>
          )}
        </div>
      )}

      <ProductSearchDialog
        open={buscadorAbierto}
        onOpenChange={setBuscadorAbierto}
        onPick={agregarProducto}
        titulo="Agregar producto a la selección"
        accion="Agregar"
        token={token}
      />
    </div>
  );
}
