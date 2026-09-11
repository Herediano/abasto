import { useEffect, useState, type FormEvent } from 'react';
import { PencilSimple, Plus, Trash, UploadSimple } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExportMenu } from '@/components/export-menu';
import { ImportWizard } from '@/components/import-wizard';
import { ListFilters, type ActiveFilter } from '@/components/list-filters';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { ModuleScreen, ModuleSection } from '@/components/module-screen';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, type Branch, type Category, type PriceList, type PriceListDetail, type Promotion, type PriceAuditRow } from '@/lib/api';
import { fecha, fechaHora, inputDate, money } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { BulkUpdate } from './bulk-update';

type View = 'listas' | 'actualizar' | 'promociones' | 'historial';
/** Alcance de una promoción: sigue siendo de un solo eje. */
type ScopeType = 'all' | 'category' | 'brand';

/**
 * Atajos para nombrar una lista. Una lista es un **segmento de cliente**, así
 * que el nombre tiene que decir a quién se le cobra; la cuenta (de dónde se
 * calcula y con qué %) va en su propio campo y cambia con el tiempo, por lo que
 * meterla en el nombre lo deja viejo enseguida.
 */
const NOMBRES_SUGERIDOS = ['Mostrador', 'Mayorista', 'Distribuidor', 'Revendedor', 'Empleados'];

const PRICE_SOURCES: Record<string, string> = {
  manual: 'Edición manual',
  import: 'Importación',
  bulk: 'Acción masiva',
  rule: 'Criterio guardado',
  invoice: 'Factura de compra',
};

export function PricesPage() {
  const { session, can } = useAuth();
  const token = session?.accessToken ?? '';
  // Cada acción de la cabecera se arma por el permiso que de verdad necesita su
  // endpoint: la planilla sale de Productos y las promos tienen su propia área,
  // así que un rango con precios y nada más no debe ver botones que darían 403.
  const puedeEditarPrecios = can('precios.editar');
  const puedeVerProductos = can('productos.ver');
  const puedeVerPromos = can('promociones.ver');
  const puedeCrearPromos = can('promociones.crear');
  const [error, setError] = useState('');
  const [toolsMessage, setToolsMessage] = useState('');
  const [view, setView] = useState<View>('listas');

  // herramientas de catalogo
  const [categories, setCategories] = useState<Category[]>([]);
  const [importOpen, setImportOpen] = useState(false);

  // listas de precios
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [priceListId, setPriceListId] = useState('');
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<PriceList | null>(null);
  const [listForm, setListForm] = useState({ name: '', derivesFromId: '', markupPercent: '', branchId: '', isDefault: false });
  const [savingList, setSavingList] = useState(false);
  // Sucursales, para elegir el alcance de una lista. Con una sola el campo no
  // se muestra: un negocio de una sucursal no tiene que enterarse del concepto.
  const [branches, setBranches] = useState<Branch[]>([]);
  // Lista abierta: qué cobra, producto por producto.
  const [detalle, setDetalle] = useState<PriceListDetail | null>(null);
  const [detalleId, setDetalleId] = useState('');
  const [detalleBusqueda, setDetalleBusqueda] = useState('');
  const [detallePagina, setDetallePagina] = useState(1);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  // promociones: se configuran ahora, las aplica Ventas
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promoOpen, setPromoOpen] = useState(false);
  const [savingPromo, setSavingPromo] = useState(false);
  const [promoForm, setPromoForm] = useState({
    name: '', type: 'nxm' as Promotion['type'],
    n: '3', m: '2', buyQty: '2', getQty: '1', percent: '50', desdeUnidad: '2', amount: '500', price: '',
    scopeType: 'all' as ScopeType, scopeValue: '',
    validFrom: inputDate(), validTo: '',
  });

  // auditoría
  const [audit, setAudit] = useState<PriceAuditRow[]>([]);
  const [auditFiltro, setAuditFiltro] = useState({ field: '', source: '', from: '', to: '' });
  const [loadingAudit, setLoadingAudit] = useState(false);

  const loadLists = () =>
    api<PriceList[]>('/price-lists', {}, token)
      .then(l => {
        setPriceLists(l);
        setPriceListId(prev => prev || l.find(x => x.isDefault)?.id || l[0]?.id || '');
      })
      .catch(e => setError(errorMessage(e)));

  const loadPromotions = () => api<Promotion[]>('/promotions', {}, token).then(setPromotions).catch(() => {});

  const abrirLista = (id: string) => {
    setDetalleId(id);
    setDetalleBusqueda('');
    setDetallePagina(1);
  };

  // El detalle se recarga solo al cambiar de lista, buscar o pasar de página.
  useEffect(() => {
    if (!detalleId) {
      setDetalle(null);
      return;
    }
    setCargandoDetalle(true);
    const p = new URLSearchParams({ page: String(detallePagina), pageSize: '50' });
    if (detalleBusqueda.trim()) p.set('search', detalleBusqueda.trim());
    const t = setTimeout(() => {
      api<PriceListDetail>(`/price-lists/${detalleId}?${p}`, {}, token)
        .then(setDetalle)
        .catch(e => setError(errorMessage(e)))
        .finally(() => setCargandoDetalle(false));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detalleId, detalleBusqueda, detallePagina, token]);

  const loadAudit = () => {
    setLoadingAudit(true);
    const p = new URLSearchParams({ limit: '100' });
    if (auditFiltro.field) p.set('field', auditFiltro.field);
    if (auditFiltro.source) p.set('source', auditFiltro.source);
    if (auditFiltro.from) p.set('from', auditFiltro.from);
    if (auditFiltro.to) p.set('to', auditFiltro.to);
    return api<{ items: PriceAuditRow[] }>(`/prices/audit?${p}`, {}, token)
      .then(r => setAudit(r.items))
      .catch(() => {})
      .finally(() => setLoadingAudit(false));
  };

  /** Arma el config según el tipo: cada promoción tiene sus propios parámetros. */
  function promoConfig() {
    const f = promoForm;
    switch (f.type) {
      case 'nxm': return { n: Number(f.n), m: Number(f.m) };
      case 'a_plus_b': return { buyQty: Number(f.buyQty), getQty: Number(f.getQty) };
      case 'percent': return { percent: Number(f.percent), desdeUnidad: Number(f.desdeUnidad) };
      case 'amount': return { amount: Number(f.amount) };
      case 'special_price': return { price: Number(f.price) };
    }
  }

  async function savePromo(e: FormEvent) {
    e.preventDefault();
    setSavingPromo(true);
    setError('');
    try {
      await api('/promotions', { method: 'POST', body: JSON.stringify({
        name: promoForm.name.trim(),
        type: promoForm.type,
        config: promoConfig(),
        scopeType: promoForm.scopeType,
        scopeValue: promoForm.scopeType === 'all' ? null : promoForm.scopeValue,
        validFrom: new Date(`${promoForm.validFrom}T00:00:00`).toISOString(),
        validTo: promoForm.validTo ? new Date(`${promoForm.validTo}T23:59:59`).toISOString() : null,
      }) }, token);
      setPromoOpen(false);
      setPromoForm({ ...promoForm, name: '' });
      await loadPromotions();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingPromo(false);
    }
  }

  async function deletePromo(id: string) {
    try {
      await api(`/promotions/${id}`, { method: 'DELETE' }, token);
      await loadPromotions();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  /** Texto legible de la promoción, para no mostrar el JSON crudo. */
  function describirPromo(p: Promotion) {
    const c = p.config;
    switch (p.type) {
      case 'nxm': return `Llevá ${c.n}, pagá ${c.m}`;
      case 'a_plus_b': return `Comprá ${c.buyQty}, llevate ${c.getQty} de regalo`;
      case 'percent': return c.desdeUnidad > 1 ? `${c.percent}% off desde la unidad ${c.desdeUnidad}` : `${c.percent}% de descuento`;
      case 'amount': return `$${c.amount} de descuento`;
      case 'special_price': return `Precio especial $${c.price}`;
      default: return JSON.stringify(c);
    }
  }

  useEffect(() => {
    api<Category[]>('/categories', {}, token).then(setCategories).catch(e => setError(errorMessage(e)));
    api<Branch[]>('/branches', {}, token).then(setBranches).catch(() => {});
    void loadLists();
    void loadPromotions();
  }, [token]);

  // La auditoria se recarga sola al cambiar los filtros.
  useEffect(() => { void loadAudit(); }, [token, auditFiltro]); // eslint-disable-line react-hooks/exhaustive-deps

  function openListDialog(lista: PriceList | null) {
    setEditingList(lista);
    setListForm({
      name: lista?.name ?? '',
      derivesFromId: lista?.derivesFromId ?? '',
      markupPercent: lista?.markupPercent ?? '',
      branchId: lista?.branchId ?? '',
      isDefault: lista?.isDefault ?? false,
    });
    setError('');
    setListDialogOpen(true);
  }

  async function saveList(e: FormEvent) {
    e.preventDefault();
    setSavingList(true);
    setError('');
    try {
      const body = {
        name: listForm.name.trim(),
        derivesFromId: listForm.derivesFromId || null,
        markupPercent: listForm.derivesFromId ? listForm.markupPercent : null,
        // '' = general (toda la empresa). El backend lo traduce a null.
        branchId: listForm.branchId || null,
        isDefault: listForm.isDefault,
      };
      if (editingList) await api(`/price-lists/${editingList.id}`, { method: 'PUT', body: JSON.stringify(body) }, token);
      else await api('/price-lists', { method: 'POST', body: JSON.stringify(body) }, token);
      setListDialogOpen(false);
      await loadLists();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingList(false);
    }
  }

  async function deleteList(lista: PriceList) {
    setError('');
    try {
      await api(`/price-lists/${lista.id}`, { method: 'DELETE' }, token);
      if (priceListId === lista.id) setPriceListId('');
      await loadLists();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  /** Chips de los filtros de auditoría activos, como en el resto de los listados. */
  const auditFiltrosActivos: ActiveFilter[] = [
    auditFiltro.field && {
      key: 'field',
      label: auditFiltro.field === 'sale' ? 'sólo venta' : 'sólo costo',
      clear: () => setAuditFiltro({ ...auditFiltro, field: '' }),
    },
    auditFiltro.source && {
      key: 'source',
      label: PRICE_SOURCES[auditFiltro.source] ?? auditFiltro.source,
      clear: () => setAuditFiltro({ ...auditFiltro, source: '' }),
    },
    auditFiltro.from && {
      key: 'from',
      label: `desde ${fecha(auditFiltro.from)}`,
      clear: () => setAuditFiltro({ ...auditFiltro, from: '' }),
    },
    auditFiltro.to && {
      key: 'to',
      label: `hasta ${fecha(auditFiltro.to)}`,
      clear: () => setAuditFiltro({ ...auditFiltro, to: '' }),
    },
  ].filter(Boolean) as ActiveFilter[];

  return (
    <>
      <ModuleScreen
        title="Precios"
        /**
         * Exportar y la acción principal van acá, en la cabecera, y cambian con
         * la vista activa (docs/diseno.md, «La cabecera»). Cada acción existe en
         * un solo lugar: dentro de las vistas ya no hay botones de exportar.
         */
        actions={
          <>
            {view === 'listas' && (
              <>
                <ExportMenu path="/price-lists" filename="listas-de-precios" label="Exportar listas" />
                {puedeEditarPrecios && (
                  <Button onClick={() => openListDialog(null)}>
                    <Plus /> Nueva lista
                  </Button>
                )}
              </>
            )}
            {view === 'actualizar' && (
              <>
                {/* La planilla y su reimporte son el mismo viaje de ida y vuelta,
                    así que el par vive junto en la vista donde se actualiza. */}
                {puedeVerProductos && <ExportMenu path="/products" filename="planilla-de-precios" label="Exportar planilla" />}
                {puedeEditarPrecios && (
                  <Button onClick={() => setImportOpen(true)}>
                    <UploadSimple /> Importar precios
                  </Button>
                )}
              </>
            )}
            {view === 'promociones' && (
              <>
                {puedeVerPromos && <ExportMenu path="/promotions" filename="promociones" label="Exportar promociones" />}
                {puedeCrearPromos && (
                  <Button onClick={() => setPromoOpen(true)}>
                    <Plus /> Nueva promoción
                  </Button>
                )}
              </>
            )}
          </>
        }
        views={[
          { key: 'listas', label: 'Listas' },
          { key: 'actualizar', label: 'Actualizar' },
          { key: 'promociones', label: 'Promociones' },
          { key: 'historial', label: 'Historial' },
        ]}
        view={view}
        onView={k => setView(k as View)}
      >
      {toolsMessage && <Alert>{toolsMessage}</Alert>}
      {error && <Alert variant="destructive">{error}</Alert>}

      {/* Lista abierta: qué cobra, producto por producto. Reemplaza la tabla de
          listas en lugar de apilarse debajo, como cualquier drill-down. */}
      {view === 'listas' && detalleId && (
        <div className="flex flex-col">
          <ModuleSection
            title={detalle?.list.name ?? 'Lista'}
            description={
              detalle
                ? [
                  detalle.list.branchName ? `Sólo ${detalle.list.branchName}` : 'General — toda la empresa',
                  detalle.list.isDefault ? 'por defecto' : null,
                  detalle.list.derivesFromName
                    ? `calculada desde ${detalle.list.derivesFromName} ${Number(detalle.list.markupPercent) >= 0 ? '+' : ''}${Number(detalle.list.markupPercent)}%`
                    : 'precios cargados a mano',
                  `${detalle.list.pricedProducts ?? 0} de ${detalle.list.totalProducts ?? 0} con precio propio`,
                  detalle.list.customerCount ? `${detalle.list.customerCount} cliente(s)` : null,
                ].filter(Boolean).join(' · ')
                : 'Cargando…'
            }
            actions={
              <Button variant="outline" size="sm" onClick={() => setDetalleId('')}>
                ← Listas
              </Button>
            }
          >
            <ListFilters
              search={detalleBusqueda}
              onSearch={v => { setDetalleBusqueda(v); setDetallePagina(1); }}
              searchPlaceholder="Nombre, SKU o código de barras"
              searchLabel="Buscar en la lista"
              activeFilters={[]}
            />

            {cargandoDetalle && !detalle ? (
              <Spinner />
            ) : !detalle || detalle.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay productos que coincidan.</p>
            ) : (
              <>
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Costo</TableHead>
                        <TableHead className="text-right">Precio en esta lista</TableHead>
                        <TableHead className="text-right">Margen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detalle.items.map(p => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <span className="font-medium">{p.name}</span>
                            <span className="block text-micro text-muted-foreground">{p.sku || p.barcode}</span>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {p.cost === null ? '—' : money(p.cost)}
                          </TableCell>
                          <TableCell className="text-right">
                            {p.price === null
                              ? <span className="text-muted-foreground">sin precio</span>
                              : <>
                                  <span className="font-medium">{money(p.price)}</span>
                                  {/* Un precio heredado se mueve solo cuando cambia la
                                      lista de origen; uno propio, no. */}
                                  {!p.explicit && (
                                    <span className="block text-micro text-muted-foreground">heredado</span>
                                  )}
                                </>}
                          </TableCell>
                          <TableCell className="text-right">
                            {p.margin === null ? '—' : `${p.margin.toFixed(1)}%`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {detalle.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm text-muted-foreground">
                      Página {detalle.pagination.page} de {detalle.pagination.totalPages} · {detalle.pagination.total} productos
                    </span>
                    <Button variant="outline" size="sm" disabled={detallePagina <= 1} onClick={() => setDetallePagina(detallePagina - 1)}>
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={detallePagina >= detalle.pagination.totalPages}
                      onClick={() => setDetallePagina(detallePagina + 1)}
                    >
                      Siguiente
                    </Button>
                  </div>
                )}
              </>
            )}
          </ModuleSection>
        </div>
      )}

      {view === 'listas' && !detalleId && (
        <div className="flex flex-col">
          <ModuleSection
            title="Listas de precios"
            description="Una lista de precios es a quién se le cobra ese precio: mostrador, mayorista, distribuidor. Se le asigna a un cliente en su ficha; el que no tiene ninguna paga la lista por defecto."
          >
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lista</TableHead>
                  <TableHead>Alcance</TableHead>
                  <TableHead className="text-right">Con precio</TableHead>
                  <TableHead className="text-right">Clientes</TableHead>
                  <TableHead className="text-right">Último cambio</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceLists.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">
                      {/* La fila abre la lista: es lo que antes no se podía hacer. */}
                      <button type="button" onClick={() => abrirLista(l.id)} className="text-left hover:underline">
                        {l.name}
                      </button>{' '}
                      {l.isDefault && <Badge variant="secondary" title="Se usa cuando el cliente no tiene lista propia, y para consumidor final.">por defecto</Badge>}
                      {!l.isActive && <Badge variant="outline">inactiva</Badge>}
                    </TableCell>
                    {/* Sólo el alcance. Cómo se arma la lista (a mano o calculada
                        desde otra) se ve al abrirla y al editarla, no en la tabla. */}
                    <TableCell className="text-muted-foreground">{l.branchName ?? 'General'}</TableCell>
                    {/* Una lista derivada no tiene precios propios: los calcula. Poner 0
                        ahí haría pensar que está vacía. */}
                    <TableCell className="text-right">
                      {l.derivesFromName && !l.pricedProducts
                        ? <span className="text-muted-foreground">calculados</span>
                        : <>
                            {l.pricedProducts ?? 0}
                            <span className="text-muted-foreground"> de {l.totalProducts ?? 0}</span>
                            {!!l.scheduledProducts && (
                              <span className="ml-1 text-warning" title={`${l.scheduledProducts} con un cambio programado`}>
                                +{l.scheduledProducts}
                              </span>
                            )}
                          </>}
                    </TableCell>
                    <TableCell className="text-right">
                      {l.customerCount || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {l.lastChangeAt ? fecha(l.lastChangeAt) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openListDialog(l)} aria-label={`Editar ${l.name}`}>
                          <PencilSimple />
                        </Button>
                        {!l.isDefault && (
                          <Button variant="ghost" size="icon" onClick={() => deleteList(l)} aria-label={`Borrar ${l.name}`}>
                            <Trash />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          </ModuleSection>

        </div>
      )}

      {view === 'actualizar' && (
        <BulkUpdate
          token={token}
          priceLists={priceLists}
          categories={categories}
          priceListId={priceListId}
          onPriceListChange={setPriceListId}
          onError={setError}
          onMessage={setToolsMessage}
        />
      )}

      {view === 'promociones' && (
        <div className="flex flex-col">
          <ModuleSection
            title="Promociones"
            description="Se configuran acá y se aplican solas en la caja mientras estén vigentes. F6 en la caja lista las ofertas del momento."
          >
          {promotions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no cargaste ninguna.</p>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Promoción</TableHead>
                    <TableHead>Qué hace</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotions.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {describirPromo(p)}
                        {p.scopeType !== 'all' && ` · sólo ${p.scopeType === 'brand' ? p.scopeValue : categories.find(c => c.id === p.scopeValue)?.name ?? 'una categoría'}`}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fecha(p.validFrom)} {p.validTo ? `→ ${fecha(p.validTo)}` : '→ sin fin'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => deletePromo(p.id)} aria-label={`Borrar ${p.name}`}>
                          <Trash />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          </ModuleSection>
        </div>
      )}

      {view === 'historial' && (
        <div className="flex flex-col">
          <ModuleSection
            title="Auditoría de precios"
            description="Cada cambio de precio, con su origen y quién lo hizo. Es sólo lectura: nada de esto se edita ni se borra."
          >
          {/* Mismo molde que el resto de los listados: los filtros detrás del
              botón y lo activo vuelve como chips que se sacan de a uno. */}
          <ListFilters activeFilters={auditFiltrosActivos}>
            <Field label="Precio" htmlFor="audit-field">
              <Select id="audit-field" value={auditFiltro.field} onChange={e => setAuditFiltro({ ...auditFiltro, field: e.target.value })}>
                <option value="">Costo y venta</option>
                <option value="sale">Sólo venta</option>
                <option value="cost">Sólo costo</option>
              </Select>
            </Field>
            <Field label="Origen" htmlFor="audit-source">
              <Select id="audit-source" value={auditFiltro.source} onChange={e => setAuditFiltro({ ...auditFiltro, source: e.target.value })}>
                <option value="">Todos</option>
                <option value="manual">Edición manual</option>
                <option value="import">Importación</option>
                <option value="bulk">Acción masiva</option>
                <option value="invoice">Factura de compra</option>
              </Select>
            </Field>
            <Field label="Desde" htmlFor="audit-from">
              <Input id="audit-from" type="date" value={auditFiltro.from} onChange={e => setAuditFiltro({ ...auditFiltro, from: e.target.value })} />
            </Field>
            <Field label="Hasta" htmlFor="audit-to">
              <Input id="audit-to" type="date" value={auditFiltro.to} onChange={e => setAuditFiltro({ ...auditFiltro, to: e.target.value })} />
            </Field>
          </ListFilters>

          {loadingAudit ? (
            <Spinner />
          ) : audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay cambios que coincidan con esos filtros.</p>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead className="text-right">Antes</TableHead>
                    <TableHead className="text-right">Después</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Usuario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audit.map(a => (
                    <TableRow key={`${a.field}-${a.id}`}>
                      <TableCell className="whitespace-nowrap">{fechaHora(a.at)}</TableCell>
                      <TableCell className="font-medium">{a.productName}</TableCell>
                      <TableCell>
                        {a.field === 'cost' ? 'Costo' : 'Venta'}
                        {a.scope && <span className="text-muted-foreground"> · {a.scope}</span>}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{a.before === null ? '—' : money(a.before)}</TableCell>
                      <TableCell className="text-right font-medium">{money(a.after)}</TableCell>
                      <TableCell><Badge variant="outline">{PRICE_SOURCES[a.source] ?? a.source}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{a.userName ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          </ModuleSection>
        </div>
      )}
      </ModuleScreen>

      <Dialog open={promoOpen} onOpenChange={setPromoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva promoción</DialogTitle>
          </DialogHeader>
          <form onSubmit={savePromo} className="grid gap-4">
            <Field label="Nombre" htmlFor="promo-name">
              <Input id="promo-name" required value={promoForm.name} onChange={e => setPromoForm({ ...promoForm, name: e.target.value })} placeholder="3x2 en gaseosas" />
            </Field>

            <Field label="Tipo" htmlFor="promo-type">
              <Select id="promo-type" value={promoForm.type} onChange={e => setPromoForm({ ...promoForm, type: e.target.value as Promotion['type'] })}>
                <option value="nxm">NxM — llevá 3, pagá 2</option>
                <option value="a_plus_b">A+B — comprá 2, llevate 1</option>
                <option value="percent">Descuento %</option>
                <option value="amount">Descuento en $</option>
                <option value="special_price">Precio especial</option>
              </Select>
            </Field>

            {promoForm.type === 'nxm' && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Se lleva" htmlFor="promo-n"><Input id="promo-n" required type="number" min="2" value={promoForm.n} onChange={e => setPromoForm({ ...promoForm, n: e.target.value })} /></Field>
                <Field label="Paga" htmlFor="promo-m"><Input id="promo-m" required type="number" min="1" value={promoForm.m} onChange={e => setPromoForm({ ...promoForm, m: e.target.value })} /></Field>
              </div>
            )}
            {promoForm.type === 'a_plus_b' && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Compra" htmlFor="promo-buy"><Input id="promo-buy" required type="number" min="1" value={promoForm.buyQty} onChange={e => setPromoForm({ ...promoForm, buyQty: e.target.value })} /></Field>
                <Field label="Se lleva gratis" htmlFor="promo-get"><Input id="promo-get" required type="number" min="1" value={promoForm.getQty} onChange={e => setPromoForm({ ...promoForm, getQty: e.target.value })} /></Field>
              </div>
            )}
            {promoForm.type === 'percent' && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Descuento %" htmlFor="promo-pct"><Input id="promo-pct" required type="number" min="1" max="99" value={promoForm.percent} onChange={e => setPromoForm({ ...promoForm, percent: e.target.value })} /></Field>
                <Field label="Desde la unidad" htmlFor="promo-desde" hint="(2 = la segunda)">
                  <Input id="promo-desde" required type="number" min="1" value={promoForm.desdeUnidad} onChange={e => setPromoForm({ ...promoForm, desdeUnidad: e.target.value })} />
                </Field>
              </div>
            )}
            {promoForm.type === 'amount' && (
              <Field label="Descuento en $" htmlFor="promo-amount"><Input id="promo-amount" required type="number" min="1" step="0.01" value={promoForm.amount} onChange={e => setPromoForm({ ...promoForm, amount: e.target.value })} /></Field>
            )}
            {promoForm.type === 'special_price' && (
              <Field label="Precio especial $" htmlFor="promo-price"><Input id="promo-price" required type="number" min="0.01" step="0.01" value={promoForm.price} onChange={e => setPromoForm({ ...promoForm, price: e.target.value })} /></Field>
            )}

            <Field label="Aplicar a" htmlFor="promo-scope">
              <Select id="promo-scope" value={promoForm.scopeType} onChange={e => setPromoForm({ ...promoForm, scopeType: e.target.value as ScopeType, scopeValue: '' })}>
                <option value="all">Todos los productos</option>
                <option value="category">Una categoría</option>
                <option value="brand">Una marca</option>
              </Select>
            </Field>
            {promoForm.scopeType === 'category' && (
              <Field label="Categoría" htmlFor="promo-cat">
                <Select id="promo-cat" required value={promoForm.scopeValue} onChange={e => setPromoForm({ ...promoForm, scopeValue: e.target.value })}>
                  <option value="">Elegí una…</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
            )}
            {promoForm.scopeType === 'brand' && (
              <Field label="Marca" htmlFor="promo-brand">
                <Input id="promo-brand" required value={promoForm.scopeValue} onChange={e => setPromoForm({ ...promoForm, scopeValue: e.target.value })} />
              </Field>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field label="Desde" htmlFor="promo-from"><Input id="promo-from" required type="date" value={promoForm.validFrom} onChange={e => setPromoForm({ ...promoForm, validFrom: e.target.value })} /></Field>
              <Field label="Hasta" htmlFor="promo-to" hint="(vacío = sin fin)"><Input id="promo-to" type="date" value={promoForm.validTo} onChange={e => setPromoForm({ ...promoForm, validTo: e.target.value })} /></Field>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPromoOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={savingPromo}>{savingPromo && <Spinner />} Crear promoción</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={listDialogOpen} onOpenChange={setListDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingList ? 'Editar lista' : 'Nueva lista de precios'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveList} className="grid gap-4">
            <Field
              label="¿A quién se le cobra con esta lista?"
              htmlFor="list-name"
              hint="ese es el nombre"
            >
              <Input id="list-name" required value={listForm.name} onChange={e => setListForm({ ...listForm, name: e.target.value })} placeholder="Mayorista" />
            </Field>

            {/* El nombre de una lista es el segmento de cliente, no la cuenta que
                hay detrás («Mayorista», no «Base -15%»): la cuenta ya la dice el
                campo de abajo y cambia con el tiempo. Los atajos son los
                segmentos que aparecen en casi todos los negocios del rubro. */}
            {!editingList && (
              <div className="flex flex-wrap gap-1.5">
                {NOMBRES_SUGERIDOS.filter(n => !priceLists.some(l => l.name.toLowerCase() === n.toLowerCase())).map(n => (
                  <Button key={n} type="button" variant="outline" size="sm" onClick={() => setListForm({ ...listForm, name: n })}>
                    {n}
                  </Button>
                ))}
              </div>
            )}

            {/* Con una sola sucursal el alcance no se pregunta: siempre es general. */}
            {branches.length > 1 && (
              <Field label="¿Dónde se aplica?" htmlFor="list-branch">
                <Select
                  id="list-branch"
                  value={listForm.branchId}
                  onChange={e => setListForm({ ...listForm, branchId: e.target.value })}
                  disabled={editingList?.isDefault && !editingList.branchId}
                >
                  <option value="">General — toda la empresa</option>
                  {branches.map(b => <option key={b.id} value={b.id}>Sólo {b.name}</option>)}
                </Select>
              </Field>
            )}

            <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
              <Checkbox
                checked={listForm.isDefault}
                onCheckedChange={v => setListForm({ ...listForm, isDefault: v === true })}
                disabled={editingList?.isDefault && !editingList.branchId}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Usar por defecto</span>
                <span className="block text-muted-foreground">
                  {listForm.branchId
                    ? 'En esa sucursal se cobra con esta lista cuando el cliente no tiene una propia. Le gana a la general.'
                    : 'Es la que paga el consumidor final y cualquier cliente sin lista propia.'}
                </span>
              </span>
            </label>

            <Field label="Cómo se arma" htmlFor="list-derives">
              <Select
                id="list-derives"
                value={listForm.derivesFromId}
                onChange={e => setListForm({ ...listForm, derivesFromId: e.target.value })}
                disabled={editingList?.isDefault}
              >
                <option value="">Precio por precio, a mano</option>
                {priceLists
                  .filter(l => l.id !== editingList?.id)
                  .map(l => <option key={l.id} value={l.id}>Calculada desde {l.name}</option>)}
              </Select>
            </Field>

            {editingList?.isDefault && (
              <p className="text-sm text-muted-foreground">
                Esta es la lista por defecto: la que paga el cliente que no tiene una propia y el consumidor final.
                Sus precios se cargan a mano porque es el origen del que se calculan las demás.
              </p>
            )}

            {listForm.derivesFromId && (
              <Field label="Recargo %" htmlFor="list-markup" hint="(negativo = descuento)">
                <Input
                  id="list-markup"
                  required
                  type="number"
                  step="0.01"
                  value={listForm.markupPercent}
                  onChange={e => setListForm({ ...listForm, markupPercent: e.target.value })}
                  placeholder="40"
                />
              </Field>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setListDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingList}>
                {savingList && <Spinner />} {editingList ? 'Guardar' : 'Crear lista'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mismo wizard que Productos → Importar: subir, mapear, ver qué cambia, aplicar. */}
      <ImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={() => setToolsMessage('Precios importados.')}
        token={token}
        title="Importar precios"
        fieldsPath="/prices/import-fields"
        importPath="/prices/import"
      />
    </>
  );
}
