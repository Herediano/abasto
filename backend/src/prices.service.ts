import { BadRequestException, Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { priceChange } from './price-history.util';
import { guardarPrecio, resolverPrecios } from './price-resolver.util';
import {
  margenPorcentual,
  necesitaPrecioParaFiltrar,
  normalizarSeleccion,
  pasaFiltrosDePrecio,
  seleccionDesdeScope,
  selectionWhere,
  type PriceSelection,
} from './price-selection.util';

export type Target = 'salePrice' | 'costPrice';

/**
 * Las operaciones que se pueden hacer sobre una selección.
 *
 * - `percent`          — sube o baja un % el campo elegido en `target`.
 * - `margin`           — fija el precio de venta en costo + X% (aplana el margen).
 * - `supplierIncrease` — el aumento del proveedor: sube el costo un % y traslada
 *                        el mismo % al precio de venta, con lo que **cada
 *                        producto conserva su propio margen**. Es la operación
 *                        del día a día con inflación, y la razón de que el
 *                        costo no se pueda tocar solo sin comerse el margen.
 * - `round`            — sólo redondea, sin mover el valor de fondo.
 *
 * El redondeo NO es una operación: es un modificador opcional del resultado de
 * cualquiera de éstas (`operation.rounding`). Antes era excluyente y obligaba a
 * dos pasadas para "aumentar y redondear", duplicando historial.
 */
export type OperationType = 'percent' | 'margin' | 'round' | 'supplierIncrease';
// "byRules" usa la politica de redondeo por tramo del tenant en vez de un modo fijo.
export type Rounding = 'nearest10' | 'nearest100' | 'ending99' | 'byRules';

export const TARGETS: Target[] = ['salePrice', 'costPrice'];
export const OPERATIONS: OperationType[] = ['percent', 'margin', 'round', 'supplierIncrease'];
export const ROUNDINGS: Rounding[] = ['nearest10', 'nearest100', 'ending99', 'byRules'];
/** Se conserva para las reglas guardadas con el modelo viejo de un solo eje. */
export const SCOPES = ['all', 'category', 'brand', 'ids'];

// Tope de filas devueltas en la vista previa: el calculo se hace sobre todo el
// alcance, pero mandar 6000 filas al navegador no aporta nada.
const PREVIEW_LIMIT = 100;
const BATCH = 500;
/** Filas que devuelve el contador en vivo para mirar antes de operar. */
const MUESTRA = 20;

/** Un producto de la selección, ya resuelto lo que hace falta para operar. */
type Elegido = { id: string; name: string; cost: number | null; sale: number | null; ultimoCambio: Date | null; categoryId: string | null };

export type BulkInput = {
  priceListId?: string;
  validFrom?: string;
  /** Selección apilable (modelo actual). */
  selection?: unknown;
  /** Alcance de un solo eje (modelo viejo). Se traduce a `selection`. */
  scope?: { type?: string; value?: string; ids?: unknown };
  target?: string;
  operation?: { type?: string; value?: unknown; rounding?: string | null; useCategoryMargin?: boolean };
  dryRun?: boolean;
};

/** Precio por cantidad: "desde N unidades, X% menos que la venta actual". */
export type BulkTierInput = {
  priceListId?: string;
  selection?: unknown;
  minQty?: unknown;
  discountPercent?: unknown;
  rounding?: string | null;
  dryRun?: boolean;
};

/** Una fila de la previa de precio por cantidad. */
export type TierChange = { id: string; name: string; salePrice: number; tierBefore: number | null; tierAfter: number };

export type TramoRedondeo = { fromAmount: Prisma.Decimal; toAmount: Prisma.Decimal | null; mode: string };

/** Una fila de la previa: qué le pasa a un producto. `null` en un after = no se toca. */
export type Change = {
  id: string;
  name: string;
  costBefore: number | null;
  costAfter: number | null;
  saleBefore: number | null;
  saleAfter: number | null;
  marginBefore: number | null;
  marginAfter: number | null;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function aplicarModo(value: number, mode: string): number {
  if (mode === 'nearest10') return Math.round(value / 10) * 10;
  if (mode === 'nearest100') return Math.round(value / 100) * 100;
  if (mode === 'ending99') {
    // Al terminado en 99 MAS CERCANO, para arriba o para abajo: bajar siempre
    // haria perder margen en cada pasada.
    const base = Math.floor(value / 100) * 100;
    const bajo = base - 1;
    const alto = base + 99;
    if (bajo < 0) return alto;
    return value - bajo <= alto - value ? bajo : alto;
  }
  return round2(value); // 'none' o desconocido: no se toca
}

/** Elige el tramo que corresponde al monto. Sin tramo aplicable, no redondea. */
export function aplicarTramos(value: number, tramos: TramoRedondeo[]): number {
  const tramo = tramos.find(t => value >= Number(t.fromAmount) && (t.toAmount === null || value < Number(t.toAmount)));
  return tramo ? aplicarModo(value, tramo.mode) : round2(value);
}

@Injectable()
export class PricesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Lista sobre la que opera el pedido: la indicada o, si no vino, la base del tenant. */
  async resolverLista(tenantId: string, priceListId?: string) {
    const lista = priceListId
      ? await this.prisma.priceList.findFirst({ where: { id: priceListId, tenantId } })
      : await this.prisma.priceList.findFirst({ where: { tenantId, isDefault: true } });
    if (!lista) throw new BadRequestException('Lista de precios no encontrada');
    return lista;
  }

  /** La selección del pedido, venga en el formato nuevo o en el viejo. */
  private seleccionDe(body: BulkInput): PriceSelection {
    if (body.selection !== undefined && body.selection !== null) return normalizarSeleccion(body.selection);
    const ids = Array.isArray(body.scope?.ids)
      ? (body.scope!.ids as unknown[]).filter((id): id is string => typeof id === 'string')
      : [];
    return seleccionDesdeScope(body.scope?.type, body.scope?.value, ids);
  }

  /** Productos que matchean la parte de la selección que resuelve SQL. */
  private candidatos(tenantId: string, seleccion: PriceSelection) {
    return this.prisma.product.findMany({
      where: selectionWhere(tenantId, seleccion),
      select: { id: true, name: true, costPrice: true, categoryId: true },
      orderBy: { name: 'asc' },
    });
  }

  /** Precio vigente en la lista y fecha del último cambio, para los ids dados. */
  private async preciosDe(
    tenantId: string,
    ids: string[],
    listaId: string,
    validFrom: Date,
    campoFecha: 'sale' | 'cost',
    conFecha: boolean,
  ) {
    const precios = ids.length ? await resolverPrecios(this.prisma, tenantId, ids, listaId, validFrom) : new Map();
    const ultimos = new Map<string, Date>();
    // El último cambio sólo se consulta si hay un filtro que lo use.
    if (conFecha && ids.length) {
      const filas = campoFecha === 'cost'
        ? await this.prisma.productPriceHistory.groupBy({
          by: ['productId'],
          where: { tenantId, field: 'cost', productId: { in: ids } },
          _max: { createdAt: true },
        })
        : await this.prisma.productPrice.groupBy({
          by: ['productId'],
          where: { tenantId, priceListId: listaId, productId: { in: ids } },
          _max: { createdAt: true },
        });
      for (const f of filas) if (f._max.createdAt) ultimos.set(f.productId, f._max.createdAt);
    }
    return { precios, ultimos };
  }

  /** Margen objetivo por categoría, sólo para las categorías presentes en `products`. */
  private async margenPorCategoriaDe(tenantId: string, products: Array<{ categoryId: string | null }>) {
    const categoryIds = [...new Set(products.map(p => p.categoryId).filter((id): id is string => id !== null))];
    if (!categoryIds.length) return new Map<string, number>();
    const categorias = await this.prisma.category.findMany({
      where: { tenantId, id: { in: categoryIds }, targetMargin: { not: null } },
      select: { id: true, targetMargin: true },
    });
    return new Map(categorias.filter(c => c.targetMargin !== null).map(c => [c.id, Number(c.targetMargin)]));
  }

  private armar(
    products: Array<{ id: string; name: string; costPrice: Prisma.Decimal | null; categoryId: string | null }>,
    precios: Map<string, Prisma.Decimal | null>,
    ultimos: Map<string, Date>,
  ): Elegido[] {
    return products.map(p => {
      const vigente = precios.get(p.id);
      return {
        id: p.id,
        name: p.name,
        cost: p.costPrice === null ? null : Number(p.costPrice),
        sale: vigente === undefined || vigente === null ? null : Number(vigente),
        ultimoCambio: ultimos.get(p.id) ?? null,
        categoryId: p.categoryId,
      };
    });
  }

  /**
   * Resuelve la selección a productos con su costo, su precio vigente en la
   * lista y la fecha del último cambio. Es el paso común del contador en vivo y
   * de la actualización, así que lo que se cuenta es exactamente lo que se toca.
   */
  private async seleccionar(
    tenantId: string,
    seleccion: PriceSelection,
    listaId: string,
    validFrom: Date,
    campoFecha: 'sale' | 'cost',
  ): Promise<Elegido[]> {
    const products = await this.candidatos(tenantId, seleccion);
    if (!products.length) return [];
    const conFecha = seleccion.staleDays !== undefined;
    const { precios, ultimos } = await this.preciosDe(tenantId, products.map(p => p.id), listaId, validFrom, campoFecha, conFecha);
    const ahora = new Date();
    const filtrar = necesitaPrecioParaFiltrar(seleccion) || conFecha;
    const margenPorCategoria = seleccion.belowCategoryMargin ? await this.margenPorCategoriaDe(tenantId, products) : undefined;
    return this.armar(products, precios, ultimos)
      .filter(p => !filtrar || pasaFiltrosDePrecio(seleccion, p, ahora, margenPorCategoria));
  }

  /** Contador en vivo de la selección, con una muestra para mirar antes de operar. */
  async contar(tenantId: string, body: BulkInput) {
    const lista = await this.resolverLista(tenantId, body.priceListId);
    const seleccion = this.seleccionDe(body);
    const validFrom = this.fechaDe(body.validFrom);

    const products = await this.candidatos(tenantId, seleccion);
    const conFecha = seleccion.staleDays !== undefined;
    const debeFiltrar = necesitaPrecioParaFiltrar(seleccion) || conFecha;

    // Si ningún filtro depende del precio, el SQL ya devolvió el conjunto final
    // y alcanza con resolver el precio de la muestra que se va a mostrar. Sin
    // esto, cada tecla del contador en vivo resolvía el precio vigente de los
    // miles de productos del catálogo para devolver un número.
    const aResolver = debeFiltrar ? products : products.slice(0, MUESTRA);
    const { precios, ultimos } = await this.preciosDe(tenantId, aResolver.map(p => p.id), lista.id, validFrom, 'sale', conFecha);

    const ahora = new Date();
    const margenPorCategoria = seleccion.belowCategoryMargin ? await this.margenPorCategoriaDe(tenantId, aResolver) : undefined;
    const filas = this.armar(aResolver, precios, ultimos);
    const elegidos = debeFiltrar ? filas.filter(p => pasaFiltrosDePrecio(seleccion, p, ahora, margenPorCategoria)) : filas;

    return {
      total: debeFiltrar ? elegidos.length : products.length,
      sample: elegidos.slice(0, MUESTRA).map(p => ({
        id: p.id,
        name: p.name,
        cost: p.cost,
        sale: p.sale,
        margin: margenPorcentual(p.cost, p.sale),
      })),
      priceList: { id: lista.id, name: lista.name },
    };
  }

  private fechaDe(raw?: string) {
    const validFrom = raw ? new Date(raw) : new Date();
    if (Number.isNaN(validFrom.getTime())) throw new UnprocessableEntityException('La fecha de aplicación no es válida');
    return validFrom;
  }

  async ejecutar(tenantId: string, userId: string, body: BulkInput) {
    const operationType = body.operation?.type as OperationType | undefined;
    if (!operationType || !OPERATIONS.includes(operationType)) throw new UnprocessableEntityException('operation.type no es válido');

    // `margin` y `supplierIncrease` mandan sobre el target: el primero sólo
    // escribe venta, el segundo escribe los dos. Pedirlo aparte sólo da lugar a
    // combinaciones imposibles.
    const target = (operationType === 'margin' ? 'salePrice' : body.target) as Target | undefined;
    if (operationType !== 'supplierIncrease' && (!target || !TARGETS.includes(target))) {
      throw new UnprocessableEntityException('target debe ser salePrice o costPrice');
    }
    const escribeCosto = operationType === 'supplierIncrease' || target === 'costPrice';
    const escribeVenta = operationType === 'supplierIncrease' || target === 'salePrice';

    // "Fijar un margen" admite un % a mano o, con este flag, el margen objetivo
    // de la categoría de cada producto — así una selección con varios rubros no
    // se aplana a un único número.
    const useCategoryMargin = operationType === 'margin' && body.operation?.useCategoryMargin === true;

    const rawValue = Number(body.operation?.value);
    if (operationType !== 'round' && !useCategoryMargin) {
      if (!Number.isFinite(rawValue)) throw new UnprocessableEntityException('operation.value debe ser un número');
      if (operationType === 'margin' && rawValue < 0) throw new UnprocessableEntityException('El margen no puede ser negativo');
      if (operationType !== 'margin' && rawValue <= -100) {
        throw new UnprocessableEntityException('Una baja de 100% o más dejaría el precio en cero o negativo');
      }
    }

    const rounding = (body.operation?.rounding ?? undefined) as Rounding | undefined;
    if (rounding !== undefined && !ROUNDINGS.includes(rounding)) throw new UnprocessableEntityException('operation.rounding no es válido');
    if (operationType === 'round' && !rounding) throw new UnprocessableEntityException('Elegí cómo redondear');

    const lista = await this.resolverLista(tenantId, body.priceListId);
    // Aumentar una lista derivada crearia precios explicitos para cada producto,
    // congelandolos y rompiendo la derivacion sin que se note. Mejor frenarlo.
    if (escribeVenta && lista.derivesFromId) {
      const padre = await this.prisma.priceList.findFirst({ where: { id: lista.derivesFromId }, select: { name: true } });
      throw new UnprocessableEntityException(
        `"${lista.name}" se calcula automáticamente desde "${padre?.name ?? 'otra lista'}". Actualizá esa lista y ésta se mueve sola, o convertila en lista independiente si querés precios propios.`,
      );
    }

    const validFrom = this.fechaDe(body.validFrom);
    const seleccion = this.seleccionDe(body);

    // Tramos de redondeo, solo si se pidió usar la política del tenant.
    const tramos: TramoRedondeo[] = rounding === 'byRules'
      ? await this.prisma.roundingRule.findMany({ where: { tenantId }, orderBy: { fromAmount: 'asc' }, select: { fromAmount: true, toAmount: true, mode: true } })
      : [];
    if (rounding === 'byRules' && !tramos.length) {
      throw new UnprocessableEntityException('No hay tramos de redondeo configurados. Cargá al menos uno o elegí un redondeo fijo.');
    }
    const redondear = (v: number) => {
      if (!rounding) return round2(v);
      return rounding === 'byRules' ? aplicarTramos(v, tramos) : aplicarModo(v, rounding);
    };

    const elegidos = await this.seleccionar(tenantId, seleccion, lista.id, validFrom, target === 'costPrice' ? 'cost' : 'sale');

    // Margen objetivo por categoría, sólo si se pidió usarlo: un mapa categoryId -> %.
    const margenPorCategoria = new Map<string, number>();
    if (useCategoryMargin) {
      const categoryIds = [...new Set(elegidos.map(p => p.categoryId).filter((id): id is string => id !== null))];
      if (categoryIds.length) {
        const categorias = await this.prisma.category.findMany({
          where: { tenantId, id: { in: categoryIds }, targetMargin: { not: null } },
          select: { id: true, targetMargin: true },
        });
        for (const c of categorias) if (c.targetMargin !== null) margenPorCategoria.set(c.id, Number(c.targetMargin));
      }
    }

    const changes: Change[] = [];
    // Productos que no se pueden calcular: no se inventan valores, se reportan.
    const skipped: Array<{ id: string; name: string; reason: string }> = [];
    const factor = 1 + rawValue / 100;

    for (const p of elegidos) {
      let costAfter: number | null = null;
      let saleAfter: number | null = null;

      if (operationType === 'supplierIncrease') {
        if (p.cost === null) {
          skipped.push({ id: p.id, name: p.name, reason: 'sin precio de costo' });
          continue;
        }
        costAfter = round2(p.cost * factor);
        // Mantener el margen de cada producto equivale a mover los dos el mismo
        // %; el redondeo después lo corre un poco, y eso se ve en la previa.
        if (p.sale !== null) saleAfter = redondear(p.sale * factor);
      } else if (operationType === 'margin') {
        if (p.cost === null) {
          skipped.push({ id: p.id, name: p.name, reason: 'sin precio de costo' });
          continue;
        }
        let margen = rawValue;
        if (useCategoryMargin) {
          const deLaCategoria = p.categoryId ? margenPorCategoria.get(p.categoryId) : undefined;
          if (deLaCategoria === undefined) {
            skipped.push({ id: p.id, name: p.name, reason: 'su categoría no tiene margen objetivo definido' });
            continue;
          }
          margen = deLaCategoria;
        }
        saleAfter = redondear(p.cost * (1 + margen / 100));
      } else {
        const base = target === 'costPrice' ? p.cost : p.sale;
        if (base === null) {
          skipped.push({ id: p.id, name: p.name, reason: target === 'costPrice' ? 'sin precio de costo' : 'sin precio de venta' });
          continue;
        }
        const calculado = operationType === 'round' ? redondear(base) : redondear(base * factor);
        if (target === 'costPrice') costAfter = calculado;
        else saleAfter = calculado;
      }

      if ((costAfter !== null && costAfter < 0) || (saleAfter !== null && saleAfter < 0)) {
        skipped.push({ id: p.id, name: p.name, reason: 'el resultado sería negativo' });
        continue;
      }

      // Nada que escribir si los valores no se movieron.
      const costoCambia = costAfter !== null && (p.cost === null || round2(p.cost) !== costAfter);
      const ventaCambia = saleAfter !== null && (p.sale === null || round2(p.sale) !== saleAfter);
      if (!costoCambia && !ventaCambia) continue;

      const costFinal = costoCambia ? costAfter : null;
      const saleFinal = ventaCambia ? saleAfter : null;
      changes.push({
        id: p.id,
        name: p.name,
        costBefore: p.cost,
        costAfter: costFinal,
        saleBefore: p.sale,
        saleAfter: saleFinal,
        marginBefore: margenPorcentual(p.cost, p.sale),
        marginAfter: margenPorcentual(costFinal ?? p.cost, saleFinal ?? p.sale),
      });
    }

    const resumen = {
      affected: changes.length,
      selected: elegidos.length,
      skipped: skipped.length,
      skippedDetail: skipped.slice(0, PREVIEW_LIMIT),
      preview: changes.slice(0, PREVIEW_LIMIT),
      priceList: { id: lista.id, name: lista.name },
      writes: { cost: escribeCosto, sale: escribeVenta },
      scheduled: validFrom > new Date(),
      validFrom: validFrom.toISOString(),
    };
    if (body.dryRun) return { ...resumen, applied: false };

    for (let i = 0; i < changes.length; i += BATCH) {
      const batch = changes.slice(i, i + BATCH);
      await this.prisma.$transaction(async tx => {
        for (const c of batch) {
          if (c.costAfter !== null) {
            // El costo no vive en listas: sigue en el producto, con su historial.
            await tx.product.update({ where: { id: c.id }, data: { costPrice: c.costAfter } });
            const h = priceChange({ tenantId, productId: c.id, field: 'cost', before: c.costBefore, after: c.costAfter, source: 'bulk', userId });
            if (h) await tx.productPriceHistory.create({ data: h });
          }
          if (c.saleAfter !== null) {
            await guardarPrecio(tx, { tenantId, productId: c.id, priceListId: lista.id, price: c.saleAfter, validFrom, source: 'bulk', userId });
          }
        }
      });
    }

    return { ...resumen, applied: true };
  }

  /**
   * Precio por cantidad para toda una selección de una vez: "desde N unidades,
   * X% menos que la venta actual". Escribe `PriceTier`, no `ProductPrice` —
   * cada producto conserva su precio único y, además, este escalón. No crea
   * escalas donde no había: el producto sigue teniendo precio único si nunca
   * se le carga ninguna (acá, a mano en su ficha, o importando precios).
   */
  async ejecutarEscala(tenantId: string, userId: string, body: BulkTierInput) {
    const minQty = Number(body.minQty);
    if (!Number.isFinite(minQty) || minQty <= 1) throw new UnprocessableEntityException('La cantidad tiene que ser mayor a 1');
    const discountPercent = Number(body.discountPercent);
    if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent >= 100) {
      throw new UnprocessableEntityException('El descuento tiene que ser mayor a 0% y menor a 100%');
    }
    const rounding = (body.rounding ?? undefined) as Rounding | undefined;
    if (rounding !== undefined && !ROUNDINGS.includes(rounding)) throw new UnprocessableEntityException('El redondeo no es válido');

    const lista = await this.resolverLista(tenantId, body.priceListId);
    const tramos: TramoRedondeo[] = rounding === 'byRules'
      ? await this.prisma.roundingRule.findMany({ where: { tenantId }, orderBy: { fromAmount: 'asc' }, select: { fromAmount: true, toAmount: true, mode: true } })
      : [];
    if (rounding === 'byRules' && !tramos.length) {
      throw new UnprocessableEntityException('No hay tramos de redondeo configurados. Cargá al menos uno o elegí un redondeo fijo.');
    }
    const redondear = (v: number) => {
      if (!rounding) return round2(v);
      return rounding === 'byRules' ? aplicarTramos(v, tramos) : aplicarModo(v, rounding);
    };

    const seleccion = this.seleccionDe(body as BulkInput);
    const elegidos = await this.seleccionar(tenantId, seleccion, lista.id, new Date(), 'sale');

    const existentes = elegidos.length
      ? await this.prisma.priceTier.findMany({ where: { tenantId, priceListId: lista.id, minQty, productId: { in: elegidos.map(e => e.id) } } })
      : [];
    const tierActual = new Map(existentes.map(t => [t.productId, Number(t.price)]));

    const changes: TierChange[] = [];
    const skipped: Array<{ id: string; name: string; reason: string }> = [];
    for (const p of elegidos) {
      if (p.sale === null) {
        skipped.push({ id: p.id, name: p.name, reason: 'sin precio de venta' });
        continue;
      }
      const tierAfter = redondear(p.sale * (1 - discountPercent / 100));
      if (tierAfter <= 0) {
        skipped.push({ id: p.id, name: p.name, reason: 'el resultado sería cero o negativo' });
        continue;
      }
      const tierBefore = tierActual.get(p.id) ?? null;
      if (tierBefore !== null && round2(tierBefore) === tierAfter) continue;
      changes.push({ id: p.id, name: p.name, salePrice: p.sale, tierBefore, tierAfter });
    }

    const resumen = {
      affected: changes.length,
      selected: elegidos.length,
      skipped: skipped.length,
      skippedDetail: skipped.slice(0, PREVIEW_LIMIT),
      preview: changes.slice(0, PREVIEW_LIMIT),
      priceList: { id: lista.id, name: lista.name },
      minQty,
      discountPercent,
    };
    if (body.dryRun) return { ...resumen, applied: false };

    for (let i = 0; i < changes.length; i += BATCH) {
      const batch = changes.slice(i, i + BATCH);
      await this.prisma.$transaction(
        batch.map(c => this.prisma.priceTier.upsert({
          where: { tenantId_priceListId_productId_minQty: { tenantId, priceListId: lista.id, productId: c.id, minQty } },
          create: { tenantId, priceListId: lista.id, productId: c.id, minQty, price: c.tierAfter },
          update: { price: c.tierAfter },
        })),
      );
    }
    return { ...resumen, applied: true };
  }

  /**
   * Productos donde la última compra registrada (`ProductSupplier.lastCost`,
   * el proveedor con `lastPurchaseAt` más reciente) quedó en un número distinto
   * al costo que el producto tiene cargado. Pasa cuando el tenant no activó
   * "actualizar costo automático" en Ajustes → La empresa: la compra se
   * registra igual, pero el costo del producto no se pisa solo.
   */
  async costosPendientes(tenantId: string) {
    const filas = await this.prisma.$queryRaw<Array<{
      product_id: string; product_name: string; cost_price: Prisma.Decimal | null;
      supplier_id: string; supplier_name: string; last_cost: Prisma.Decimal; last_purchase_at: Date | null;
    }>>`
      SELECT DISTINCT ON (ps.product_id)
        ps.product_id, p.name AS product_name, p.cost_price,
        ps.supplier_id, s.name AS supplier_name, ps.last_cost, ps.last_purchase_at
      FROM product_suppliers ps
      JOIN products p ON p.id = ps.product_id AND p.tenant_id = ps.tenant_id
      JOIN suppliers s ON s.id = ps.supplier_id AND s.tenant_id = ps.tenant_id
      -- Sólo compras de verdad: un costo de proveedor cargado a mano en la
      -- ficha (sin comprarle todavía) deja last_purchase_at en null y no es
      -- "la última compra" de nada — incluirlo mostraría un dato inventado
      -- como si viniera de una factura, y con más de uno así el DISTINCT ON
      -- elegiría cualquiera de forma arbitraria.
      WHERE ps.tenant_id = ${tenantId}::uuid AND ps.last_cost IS NOT NULL AND ps.last_purchase_at IS NOT NULL AND p.is_active = true
      ORDER BY ps.product_id, ps.last_purchase_at DESC
    `;
    return filas
      .filter(f => f.cost_price === null || !f.cost_price.equals(f.last_cost))
      .map(f => ({
        productId: f.product_id,
        productName: f.product_name,
        currentCost: f.cost_price === null ? null : Number(f.cost_price),
        lastCost: Number(f.last_cost),
        supplierId: f.supplier_id,
        supplierName: f.supplier_name,
        lastPurchaseAt: f.last_purchase_at ? f.last_purchase_at.toISOString() : null,
      }));
  }

  /** Aplica el costo de la última compra a los productos elegidos del panel de arriba. */
  async sincronizarCostos(tenantId: string, userId: string, productIds: string[]) {
    const pendientes = (await this.costosPendientes(tenantId)).filter(p => productIds.includes(p.productId));
    let updated = 0;
    await this.prisma.$transaction(async tx => {
      for (const p of pendientes) {
        await tx.product.update({ where: { id: p.productId }, data: { costPrice: p.lastCost } });
        const h = priceChange({ tenantId, productId: p.productId, field: 'cost', before: p.currentCost, after: p.lastCost, source: 'invoice', userId });
        if (h) await tx.productPriceHistory.create({ data: h });
        updated++;
      }
    });
    return { updated };
  }
}
