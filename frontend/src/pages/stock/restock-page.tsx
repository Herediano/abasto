import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowsClockwise, ShoppingCartSimple } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { ListFilters } from '@/components/list-filters';
import { ModuleScreen } from '@/components/module-screen';
import { stockViews } from '@/components/stock-nav';
import { Select } from '@/components/ui/select';
import { PageSpinner, Spinner } from '@/components/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, type LowStockProduct } from '@/lib/api';
import { quantity } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';

export function RestockPage() {
  const { session, can } = useAuth();
  const puedePedir = can('compras.crear');
  const token = session!.accessToken;
  const [items, setItems] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pedidoOpen, setPedidoOpen] = useState(false);
  const [pedidoSaving, setPedidoSaving] = useState(false);
  const [pedidoError, setPedidoError] = useState('');
  const [pedidoDone, setPedidoDone] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    return api<LowStockProduct[]>('/products/low-stock', {}, token)
      .then(setItems)
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { void load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSelect(id: string) {
    setSelected(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const seleccionados = items.filter(p => selected.has(p.id));
  const gruposPedido = Object.values(
    seleccionados.reduce<Record<string, { supplierId: string; supplierName: string; items: LowStockProduct[] }>>((acc, p) => {
      if (!p.preferredSupplierId) return acc;
      const key = p.preferredSupplierId;
      (acc[key] ??= { supplierId: key, supplierName: p.preferredSupplierName ?? '—', items: [] }).items.push(p);
      return acc;
    }, {}),
  );
  const sinProveedor = seleccionados.filter(p => !p.preferredSupplierId);

  function openPedido() {
    setPedidoError('');
    setPedidoDone(null);
    setPedidoOpen(true);
  }

  async function confirmarPedido() {
    setPedidoSaving(true);
    setPedidoError('');
    try {
      for (const grupo of gruposPedido) {
        await api('/purchase-orders', {
          method: 'POST',
          body: JSON.stringify({
            supplierId: grupo.supplierId,
            lines: grupo.items.map(p => ({ productId: p.id, quantity: p.suggestedOrder ?? Number(p.minStock) })),
          }),
        }, token);
      }
      setPedidoDone(gruposPedido.length);
      setSelected(new Set());
      await load();
    } catch (err) {
      setPedidoError(errorMessage(err));
    } finally {
      setPedidoSaving(false);
    }
  }

  const q = search.trim().toLowerCase();
  const visibles = items.filter(p => {
    if (q && !p.name.toLowerCase().includes(q)) return false;
    if (estado === 'out' && p.currentStock > 0) return false;
    if (estado === 'low' && p.currentStock <= 0) return false;
    return true;
  });

  const activeFilters = [
    estado && { key: 'estado', label: estado === 'out' ? 'Sin stock' : 'Bajo el mínimo', clear: () => setEstado('') },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  return (
    <ModuleScreen
      title="Stock"
      views={stockViews(can)}
      actions={
        <div className="flex gap-2">
          {puedePedir && selected.size > 0 && (
            <Button onClick={openPedido}><ShoppingCartSimple /> Generar pedido ({selected.size})</Button>
          )}
          {puedePedir && (
            <Button asChild variant="outline">
              <Link to="/compras"><ShoppingCartSimple /> Cargar factura</Link>
            </Button>
          )}
        </div>
      }
    >
      {error && <Alert variant="destructive">{error}</Alert>}
      <ListFilters
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Producto"
        searchLabel="Buscar en reposición"
        activeFilters={activeFilters}
      >
        <Field label="Estado" htmlFor="f-estado">
          <Select id="f-estado" value={estado} onChange={e => setEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="out">Sin stock</option>
            <option value="low">Bajo el mínimo</option>
          </Select>
        </Field>
      </ListFilters>
      {loading ? (
        <PageSpinner />
      ) : items.length === 0 ? (
        <EmptyState icon={ArrowsClockwise} title="Todo en orden" description="Ningún producto con stock mínimo configurado está por debajo del umbral. Configurá un stock mínimo desde la ficha de cada producto para que aparezca acá cuando corresponda reponerlo." />
      ) : visibles.length === 0 ? (
        <EmptyState icon={ArrowsClockwise} title="Sin resultados" description="Ningún producto coincide con la búsqueda." />
      ) : (
        <Table>
              <TableHeader>
                <TableRow>
                  {puedePedir && <TableHead className="w-8" />}
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Stock actual</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead className="text-right">Pedir</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map(p => {
                  const min = Number(p.minStock);
                  const urgent = p.currentStock <= 0;
                  return (
                    <TableRow key={p.id}>
                      {puedePedir && (
                        <TableCell>
                          <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} aria-label={`Seleccionar ${p.name}`} />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">
                        <Link to={`/catalog/products/${p.id}`} className="hover:underline">
                          {p.name}
                        </Link>
                        {p.branchOverride && <span className="ml-2 text-micro text-placeholder">(mínimo propio de la sucursal)</span>}
                      </TableCell>
                      <TableCell className="text-right tabular">{quantity(p.currentStock)}</TableCell>
                      <TableCell className="text-right tabular">{quantity(min)}</TableCell>
                      <TableCell className="text-right tabular">
                        {p.suggestedOrder != null
                          ? <span className="font-semibold">{quantity(p.suggestedOrder)}{p.purchaseUnit ? ` (${p.suggestedOrder / Number(p.unitsPerPurchase)} ${p.purchaseUnit.toLowerCase()})` : ''}</span>
                          : <span className="text-placeholder">—</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.preferredSupplierName
                          ? <>{p.preferredSupplierName}{p.preferredSupplierCode ? <span className="text-placeholder"> · {p.preferredSupplierCode}</span> : null}</>
                          : <span className="text-placeholder">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={urgent ? 'destructive' : 'warning'}>{urgent ? 'Sin stock' : 'Por debajo del mínimo'}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      )}

      <Dialog open={pedidoOpen} onOpenChange={setPedidoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar pedido a proveedor</DialogTitle>
          </DialogHeader>
          {pedidoDone !== null ? (
            <Alert>Se generó{pedidoDone === 1 ? ' 1 pedido' : `n ${pedidoDone} pedidos`}. Podés verlos en Compras → Pedidos.</Alert>
          ) : (
            <div className="flex flex-col gap-4">
              {pedidoError && <Alert variant="destructive">{pedidoError}</Alert>}
              {sinProveedor.length > 0 && (
                <Alert variant="destructive">
                  {sinProveedor.length} producto{sinProveedor.length === 1 ? '' : 's'} sin proveedor preferido — no se va{sinProveedor.length === 1 ? '' : 'n'} a incluir: {sinProveedor.map(p => p.name).join(', ')}.
                </Alert>
              )}
              {gruposPedido.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ningún producto seleccionado tiene proveedor preferido.</p>
              ) : (
                gruposPedido.map(g => (
                  <div key={g.supplierId} className="rounded-md border border-border p-3">
                    <p className="mb-2 text-sm font-semibold">{g.supplierName}</p>
                    <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                      {g.items.map(p => (
                        <li key={p.id} className="flex justify-between">
                          <span>{p.name}</span>
                          <span className="tabular">{quantity(p.suggestedOrder ?? Number(p.minStock))}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          )}
          <DialogFooter>
            {pedidoDone !== null ? (
              <Button onClick={() => setPedidoOpen(false)}>Cerrar</Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setPedidoOpen(false)}>Cancelar</Button>
                <Button onClick={confirmarPedido} disabled={pedidoSaving || gruposPedido.length === 0}>
                  {pedidoSaving && <Spinner />} Generar {gruposPedido.length > 1 ? `${gruposPedido.length} pedidos` : 'pedido'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleScreen>
  );
}
