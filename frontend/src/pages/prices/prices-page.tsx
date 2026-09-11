import { useEffect, useState, type FormEvent } from 'react';
import { ArrowsClockwise, CurrencyDollar, DotsSixVertical, Gift, PencilSimple, Percent, Plus, Tag, Trash, UploadSimple } from '@phosphor-icons/react';
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
import { api, errorMessage, type Branch, type Category, type PendingCost, type PriceList, type PriceListDetail, type Promotion, type PromoPreview, type PriceAuditRow } from '@/lib/api';
import { fecha, fechaHora, inputDate, money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { BulkUpdate } from './bulk-update';
import { TierBulkUpdate } from './tier-bulk-update';

type View = 'listas' | 'actualizar' | 'promociones' | 'historial';
/** Dentro de "Actualizar": precio único (venta/costo/margen) o precio por cantidad (escalas). */
type ModoActualizar = 'unico' | 'cantidad';
/** Alcance de una promoción: sigue siendo de un solo eje. */
type ScopeType = 'all' | 'category' | 'brand';
/** Los mismos 7 días que entiende el backend: 0=domingo…6=sábado. */
const DIAS_SEMANA = [
  { value: 0, label: 'D' }, { value: 1, label: 'L' }, { value: 2, label: 'M' }, { value: 3, label: 'X' },
  { value: 4, label: 'J' }, { value: 5, label: 'V' }, { value: 6, label: 'S' },
];

/**
 * Atajos para nombrar una lista. Una lista es un **segmento de cliente**, así
 * que el nombre tiene que decir a quién se le cobra; la cuenta (de dónde se
 * calcula y con qué %) va en su propio campo y cambia con el tiempo, por lo que
 * meterla en el nombre lo deja viejo enseguida.
 */
const NOMBRES_SUGERIDOS = ['Mostrador', 'Mayorista', 'Distribuidor', 'Revendedor', 'Empleados'];

/** Un tipo de promo como lo piensa el mostrador, no como lo guarda la base. */
const TIPOS_PROMO: Array<{ key: Promotion['type']; titulo: string; detalle: string; Icon: typeof Gift }> = [
  { key: 'nxm', titulo: 'Llevá 3, pagá 2', detalle: 'NxM: se lleva una cantidad y se paga menos.', Icon: Gift },
  { key: 'a_plus_b', titulo: 'Compre 2 y llévese 1 gratis', detalle: 'Comprás una cantidad y te llevás otras de regalo.', Icon: Gift },
  { key: 'percent', titulo: '20% de descuento', detalle: 'Un % sobre el precio, opcionalmente desde la 2ª unidad.', Icon: Percent },
  { key: 'amount', titulo: '$500 menos', detalle: 'Un monto fijo de descuento por unidad.', Icon: CurrencyDollar },
  { key: 'special_price', titulo: 'Precio fijo de $999', detalle: 'Un precio especial cerrado mientras dure.', Icon: Tag },
];

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
  const [modoActualizar, setModoActualizar] = useState<ModoActualizar>('unico');

  // herramientas de catalogo
  const [categories, setCategories] = useState<Category[]>([]);
  const [importOpen, setImportOpen] = useState(false);

  // costos que quedaron atrás de la última compra (ver Ajustes → La empresa)
  const [pendingCosts, setPendingCosts] = useState<PendingCost[]>([]);
  const [pendingCostsElegidos, setPendingCostsElegidos] = useState<string[]>([]);
  const [sincronizandoCostos, setSincronizandoCostos] = useState(false);

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
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [savingPromo, setSavingPromo] = useState(false);
  const [reordenando, setReordenando] = useState(false);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [promoForm, setPromoForm] = useState({
    name: '', type: 'nxm' as Promotion['type'],
    n: '3', m: '2', buyQty: '2', getQty: '1', percent: '50', desdeUnidad: '2', amount: '500', price: '',
    scopeType: 'all' as ScopeType, scopeValue: '',
    validFrom: inputDate(), validTo: '',
    exclusive: true,
    daysOfWeek: [] as number[], limitarHorario: false, startTime: '09:00', endTime: '22:00',
  });

  // "Probar esta promo": simula el descuento sobre un precio y una cantidad de
  // ejemplo antes de guardar, con la misma cuenta que usa la caja.
  const [prueba, setPrueba] = useState({ cantidad: '3', precio: '1000' });
  const [pruebaResultado, setPruebaResultado] = useState<PromoPreview | null>(null);
  const [probando, setProbando] = useState(false);
  const [pruebaError, setPruebaError] = useState('');
  // Cualquier cambio en el tipo o sus parámetros invalida el resultado: mostrar
  // un cálculo viejo al lado de un config nuevo confundiría más que ayudar.
  useEffect(() => setPruebaResultado(null), [promoForm.type, promoForm.n, promoForm.m, promoForm.buyQty, promoForm.getQty, promoForm.percent, promoForm.desdeUnidad, promoForm.amount, promoForm.price]);

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

  const loadPendingCosts = () => api<PendingCost[]>('/prices/pending-costs', {}, token).then(setPendingCosts).catch(() => {});

  async function sincronizarCostos(productIds: string[]) {
    setSincronizandoCostos(true);
    setError('');
    try {
      const r = await api<{ updated: number }>('/prices/pending-costs/sync', { method: 'POST', body: JSON.stringify({ productIds }) }, token);
      setToolsMessage(`Costo actualizado en ${r.updated} producto${r.updated === 1 ? '' : 's'}.`);
      setPendingCostsElegidos([]);
      await loadPendingCosts();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSincronizandoCostos(false);
    }
  }

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

  async function probarPromo() {
    setProbando(true);
    setPruebaError('');
    try {
      const r = await api<PromoPreview>('/promotions/preview', {
        method: 'POST',
        body: JSON.stringify({
          type: promoForm.type,
          config: promoConfig(),
          quantity: Number(prueba.cantidad),
          unitPrice: Number(prueba.precio),
        }),
      }, token);
      setPruebaResultado(r);
    } catch (err) {
      setPruebaError(errorMessage(err));
      setPruebaResultado(null);
    } finally {
      setProbando(false);
    }
  }

  function openPromoDialog(promo: Promotion | null) {
    setEditingPromo(promo);
    setError('');
    setPruebaResultado(null);
    setPruebaError('');
    if (promo) {
      const c = promo.config;
      setPromoForm({
        name: promo.name,
        type: promo.type,
        n: String(c.n ?? 3), m: String(c.m ?? 2),
        buyQty: String(c.buyQty ?? 2), getQty: String(c.getQty ?? 1),
        percent: String(c.percent ?? 50), desdeUnidad: String(c.desdeUnidad ?? 2),
        amount: String(c.amount ?? 500), price: String(c.price ?? ''),
        scopeType: promo.scopeType, scopeValue: promo.scopeValue ?? '',
        validFrom: promo.validFrom.slice(0, 10),
        validTo: promo.validTo ? promo.validTo.slice(0, 10) : '',
        exclusive: promo.exclusive,
        daysOfWeek: promo.daysOfWeek,
        limitarHorario: !!(promo.startTime && promo.endTime),
        startTime: promo.startTime ?? '09:00',
        endTime: promo.endTime ?? '22:00',
      });
    } else {
      setPromoForm({
        name: '', type: 'nxm', n: '3', m: '2', buyQty: '2', getQty: '1', percent: '50', desdeUnidad: '2', amount: '500', price: '',
        scopeType: 'all', scopeValue: '', validFrom: inputDate(), validTo: '', exclusive: true,
        daysOfWeek: [], limitarHorario: false, startTime: '09:00', endTime: '22:00',
      });
    }
    setPromoOpen(true);
  }

  async function savePromo(e: FormEvent) {
    e.preventDefault();
    setSavingPromo(true);
    setError('');
    try {
      const body = {
        name: promoForm.name.trim(),
        type: promoForm.type,
        config: promoConfig(),
        scopeType: promoForm.scopeType,
        scopeValue: promoForm.scopeType === 'all' ? null : promoForm.scopeValue,
        validFrom: new Date(`${promoForm.validFrom}T00:00:00`).toISOString(),
        validTo: promoForm.validTo ? new Date(`${promoForm.validTo}T23:59:59`).toISOString() : null,
        exclusive: promoForm.exclusive,
        daysOfWeek: promoForm.daysOfWeek,
        startTime: promoForm.limitarHorario ? promoForm.startTime : null,
        endTime: promoForm.limitarHorario ? promoForm.endTime : null,
      };
      if (editingPromo) await api(`/promotions/${editingPromo.id}`, { method: 'PUT', body: JSON.stringify(body) }, token);
      else await api('/promotions', { method: 'POST', body: JSON.stringify(body) }, token);
      setPromoOpen(false);
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

  /** Reordena localmente (respuesta inmediata) y persiste el orden nuevo. */
  async function moverPromo(idArrastrada: string, idDestino: string) {
    if (idArrastrada === idDestino) return;
    const actual = [...promotions];
    const desde = actual.findIndex(p => p.id === idArrastrada);
    const hasta = actual.findIndex(p => p.id === idDestino);
    if (desde < 0 || hasta < 0) return;
    const [movida] = actual.splice(desde, 1);
    actual.splice(hasta, 0, movida);
    setPromotions(actual);
    setReordenando(true);
    try {
      await api('/promotions/reorder', { method: 'PUT', body: JSON.stringify({ ids: actual.map(p => p.id) }) }, token);
    } catch (err) {
      setError(errorMessage(err));
      await loadPromotions();
    } finally {
      setReordenando(false);
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

  /** "Vie, sáb y dom · 18:00 a 22:00", en criollo y compacto para la tabla. */
  function describirVigenciaSemanal(p: Promotion) {
    if (!p.daysOfWeek.length && !p.startTime) return null;
    const dias = p.daysOfWeek.length === 0
      ? null
      : p.daysOfWeek.length <= 2
        ? p.daysOfWeek.map(d => DIAS_SEMANA[d].label).join(' y ')
        : `${p.daysOfWeek.map(d => DIAS_SEMANA[d].label).slice(0, -1).join(', ')} y ${DIAS_SEMANA[p.daysOfWeek[p.daysOfWeek.length - 1]].label}`;
    const horario = p.startTime && p.endTime ? `${p.startTime} a ${p.endTime}` : null;
    return [dias, horario].filter(Boolean).join(' · ');
  }

  useEffect(() => {
    api<Category[]>('/categories', {}, token).then(setCategories).catch(e => setError(errorMessage(e)));
    api<Branch[]>('/branches', {}, token).then(setBranches).catch(() => {});
    void loadLists();
    void loadPromotions();
    void loadPendingCosts();
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
                  <Button onClick={() => openPromoDialog(null)}>
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
        <div className="flex flex-col">
          {pendingCosts.length > 0 && (
            <ModuleSection
              title="Costos por sincronizar"
              description="La última compra de estos productos quedó a un costo distinto del que tienen cargado. No se tocó solo porque «actualizar costo automático» está apagado en Ajustes → La empresa: revisá y aplicá el que corresponda antes de armar un aumento de venta."
            >
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">
                        <Checkbox
                          checked={pendingCostsElegidos.length === pendingCosts.length}
                          onCheckedChange={v => setPendingCostsElegidos(v ? pendingCosts.map(p => p.productId) : [])}
                        />
                      </TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Costo actual</TableHead>
                      <TableHead className="text-right">Última compra</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingCosts.map(p => (
                      <TableRow key={p.productId}>
                        <TableCell>
                          <Checkbox
                            checked={pendingCostsElegidos.includes(p.productId)}
                            onCheckedChange={v => setPendingCostsElegidos(prev => v ? [...prev, p.productId] : prev.filter(id => id !== p.productId))}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{p.productName}</TableCell>
                        <TableCell className="text-muted-foreground">{p.supplierName}{p.lastPurchaseAt ? ` · ${fecha(p.lastPurchaseAt)}` : ''}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{p.currentCost === null ? 'sin costo' : money(p.currentCost)}</TableCell>
                        <TableCell className="text-right font-medium">{money(p.lastCost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  disabled={pendingCostsElegidos.length === 0 || sincronizandoCostos}
                  onClick={() => void sincronizarCostos(pendingCostsElegidos)}
                >
                  {sincronizandoCostos ? <Spinner /> : <ArrowsClockwise />} Actualizar costo de {pendingCostsElegidos.length || 'los elegidos'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => void sincronizarCostos(pendingCosts.map(p => p.productId))} disabled={sincronizandoCostos}>
                  Actualizar todos ({pendingCosts.length})
                </Button>
              </div>
            </ModuleSection>
          )}

          <div className="flex gap-2 border-b px-1 pb-3">
            <Button size="sm" variant={modoActualizar === 'unico' ? 'default' : 'outline'} onClick={() => setModoActualizar('unico')}>
              Precio único
            </Button>
            <Button size="sm" variant={modoActualizar === 'cantidad' ? 'default' : 'outline'} onClick={() => setModoActualizar('cantidad')}>
              Precio por cantidad
            </Button>
          </div>

          {modoActualizar === 'unico' ? (
            <BulkUpdate
              token={token}
              priceLists={priceLists}
              categories={categories}
              priceListId={priceListId}
              onPriceListChange={setPriceListId}
              onError={setError}
              onMessage={setToolsMessage}
            />
          ) : (
            <TierBulkUpdate
              token={token}
              priceLists={priceLists}
              categories={categories}
              priceListId={priceListId}
              onPriceListChange={setPriceListId}
              onError={setError}
              onMessage={setToolsMessage}
            />
          )}
        </div>
      )}

      {view === 'promociones' && (
        <div className="flex flex-col">
          <ModuleSection
            title="Promociones"
            description="Se configuran acá y se aplican solas en la caja mientras estén vigentes. F6 en la caja lista las ofertas del momento. Arrastrá una fila para cambiar el orden: si dos pegan sobre el mismo producto, gana la primera de la lista."
          >
          {promotions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no cargaste ninguna.</p>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Promoción</TableHead>
                    <TableHead>Qué hace</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead>Combina</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotions.map(p => (
                    <TableRow
                      key={p.id}
                      draggable={puedeCrearPromos && !reordenando}
                      onDragStart={() => setArrastrando(p.id)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => { if (arrastrando) void moverPromo(arrastrando, p.id); setArrastrando(null); }}
                      onDragEnd={() => setArrastrando(null)}
                      className={cn(arrastrando === p.id && 'opacity-50', !p.isActive && 'text-muted-foreground')}
                    >
                      <TableCell className="cursor-grab text-muted-foreground" title="Arrastrar para reordenar">
                        {puedeCrearPromos && <DotsSixVertical />}
                      </TableCell>
                      <TableCell className="font-medium">
                        {p.name} {!p.isActive && <Badge variant="outline">inactiva</Badge>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {describirPromo(p)}
                        {p.scopeType !== 'all' && ` · sólo ${p.scopeType === 'brand' ? p.scopeValue : categories.find(c => c.id === p.scopeValue)?.name ?? 'una categoría'}`}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fecha(p.validFrom)} {p.validTo ? `→ ${fecha(p.validTo)}` : '→ sin fin'}
                        {describirVigenciaSemanal(p) && <span className="block text-micro">{describirVigenciaSemanal(p)}</span>}
                      </TableCell>
                      <TableCell>
                        {p.exclusive
                          ? <Badge variant="outline">no</Badge>
                          : <Badge variant="secondary" title="Si aplica, sigue sumando lo que agreguen las siguientes de la lista.">sí</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openPromoDialog(p)} aria-label={`Editar ${p.name}`}>
                            <PencilSimple />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deletePromo(p.id)} aria-label={`Borrar ${p.name}`}>
                            <Trash />
                          </Button>
                        </div>
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
            <DialogTitle>{editingPromo ? 'Editar promoción' : 'Nueva promoción'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={savePromo} className="grid gap-4">
            <Field label="Nombre" htmlFor="promo-name">
              <Input id="promo-name" required value={promoForm.name} onChange={e => setPromoForm({ ...promoForm, name: e.target.value })} placeholder="3x2 en gaseosas" />
            </Field>

            <Field label="Tipo">
              <div className="grid gap-2 sm:grid-cols-2">
                {TIPOS_PROMO.map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setPromoForm({ ...promoForm, type: t.key })}
                    className={cn(
                      'flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors',
                      promoForm.type === t.key ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50',
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <t.Icon size={15} /> {t.titulo}
                    </span>
                    <span className="text-xs text-muted-foreground">{t.detalle}</span>
                  </button>
                ))}
              </div>
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

            <div className="rounded-md border bg-muted/40 p-3">
              <p className="mb-2 text-sm font-medium">Probar esta promo</p>
              <p className="mb-3 text-xs text-muted-foreground">
                Antes de guardar: con un precio y una cantidad de ejemplo, así ves cómo cierra la cuenta en la caja.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <Field label="Cantidad" htmlFor="prueba-cant" className="max-w-28">
                  <Input id="prueba-cant" type="number" min="1" step="1" value={prueba.cantidad} onChange={e => setPrueba({ ...prueba, cantidad: e.target.value })} />
                </Field>
                <Field label="Precio unitario $" htmlFor="prueba-precio" className="max-w-32">
                  <Input id="prueba-precio" type="number" min="0.01" step="0.01" value={prueba.precio} onChange={e => setPrueba({ ...prueba, precio: e.target.value })} />
                </Field>
                <Button type="button" variant="outline" size="sm" onClick={() => void probarPromo()} disabled={probando}>
                  {probando && <Spinner />} Probar
                </Button>
              </div>
              {pruebaError && <Alert variant="destructive" className="mt-2">{pruebaError}</Alert>}
              {pruebaResultado && (
                <p className="mt-3 text-sm">
                  {pruebaResultado.aplica ? (
                    <>
                      Sin promo: <span className="font-medium">{money(pruebaResultado.bruto)}</span>.
                      Con promo: <span className="font-medium text-primary">{money(pruebaResultado.total)}</span>
                      {' '}(descuenta {money(pruebaResultado.discountAmount)}, queda a {money(pruebaResultado.unitPriceEfectivo)} la unidad).
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      Con {pruebaResultado.quantity} unidad{pruebaResultado.quantity === 1 ? '' : 'es'} todavía no llega a aplicar
                      {promoForm.type === 'nxm' && ` (hace falta al menos ${promoForm.n})`}
                      {promoForm.type === 'a_plus_b' && ` (hace falta al menos ${Number(promoForm.buyQty) + Number(promoForm.getQty)})`}
                      {promoForm.type === 'percent' && Number(promoForm.desdeUnidad) > 1 && ` (hace falta al menos ${promoForm.desdeUnidad})`}.
                    </span>
                  )}
                </p>
              )}
            </div>

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

            <Field label="¿Qué días?" hint="ninguno marcado = todos los días">
              <div className="flex gap-1.5">
                {DIAS_SEMANA.map(d => {
                  const activo = promoForm.daysOfWeek.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      title={activo ? 'Sacar este día' : 'Sólo este día (y los demás que marques)'}
                      onClick={() => setPromoForm({
                        ...promoForm,
                        daysOfWeek: activo ? promoForm.daysOfWeek.filter(x => x !== d.value) : [...promoForm.daysOfWeek, d.value].sort(),
                      })}
                      className={cn(
                        'size-8 rounded-full border text-sm font-medium transition-colors',
                        activo ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <div>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={promoForm.limitarHorario}
                  onChange={e => setPromoForm({ ...promoForm, limitarHorario: e.target.checked })}
                  className="size-4"
                />
                Sólo en un horario
              </label>
              {promoForm.limitarHorario && (
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <Field label="Desde qué hora" htmlFor="promo-hora-desde">
                    <Input id="promo-hora-desde" type="time" required value={promoForm.startTime} onChange={e => setPromoForm({ ...promoForm, startTime: e.target.value })} />
                  </Field>
                  <Field label="Hasta qué hora" htmlFor="promo-hora-hasta">
                    <Input id="promo-hora-hasta" type="time" required value={promoForm.endTime} onChange={e => setPromoForm({ ...promoForm, endTime: e.target.value })} />
                  </Field>
                </div>
              )}
            </div>

            <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
              <Checkbox
                checked={!promoForm.exclusive}
                onCheckedChange={v => setPromoForm({ ...promoForm, exclusive: v !== true })}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Combina con otras promociones</span>
                <span className="block text-muted-foreground">
                  Si un producto tiene otra promo con más prioridad que también aplica, se suman las dos. Por defecto una
                  promo es exclusiva: si aplica, no se busca ninguna otra para ese producto.
                </span>
              </span>
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPromoOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={savingPromo}>{savingPromo && <Spinner />} {editingPromo ? 'Guardar cambios' : 'Crear promoción'}</Button>
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
