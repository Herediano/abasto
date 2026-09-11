import { Prisma } from '@prisma/client';

/**
 * Una selección de productos para una actualización de precios.
 *
 * Reemplaza el viejo `scope` de un solo eje (todos / una categoría / una marca).
 * Todos los filtros presentes se combinan con AND: cada uno recorta el conjunto,
 * igual que los filtros de un listado. Sin ningún filtro = todos los productos
 * activos.
 *
 * Se resuelven en dos lugares por necesidad: lo que es columna del producto va a
 * SQL (`selectionWhere`), y lo que depende del precio vigente de la lista
 * —margen, rango de precio, antigüedad— se filtra en memoria una vez resueltos
 * los precios, porque el precio de venta real vive en ProductPrice con vigencia
 * y no se puede consultar desde el WHERE del producto.
 */
export type PriceSelection = {
  categoryIds?: string[];
  brands?: string[];
  supplierIds?: string[];
  productIds?: string[];
  /** Excepciones: se restan de todo lo anterior ("Bebidas menos estos tres"). */
  excludeIds?: string[];
  search?: string;
  /** Productos a los que les falta cargar un precio. El caso del catálogo recién importado. */
  missing?: 'sale' | 'cost';
  /** Margen actual sobre el costo, en %. Para encontrar lo que quedó mal cotizado. */
  marginMin?: number;
  marginMax?: number;
  /**
   * Margen actual por debajo del objetivo de SU PROPIA categoría
   * (Category.targetMargin), no de un umbral parejo para todo el catálogo.
   * Sin margen objetivo cargado en la categoría, el producto no entra: no hay
   * con qué compararlo.
   */
  belowCategoryMargin?: boolean;
  priceMin?: number;
  priceMax?: number;
  /** Precio sin tocar desde hace N días o más. Nunca tocado también cuenta. */
  staleDays?: number;
};

export type SelectionNames = {
  categories?: Map<string, string>;
  suppliers?: Map<string, string>;
};

const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

function lista(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const limpio = [...new Set(v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map(x => x.trim()))];
  return limpio.length ? limpio : undefined;
}

function numero(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Deja la selección en una forma canónica y descarta basura del cliente. No
 * tira error por un filtro mal escrito: lo ignora, así un campo nuevo del
 * frontend contra un backend viejo no rompe la pantalla entera.
 */
export function normalizarSeleccion(raw: unknown): PriceSelection {
  const r = (raw ?? {}) as Record<string, unknown>;
  const missing = r.missing === 'sale' || r.missing === 'cost' ? r.missing : undefined;
  const staleDays = numero(r.staleDays);
  return {
    categoryIds: lista(r.categoryIds),
    brands: lista(r.brands),
    supplierIds: lista(r.supplierIds),
    productIds: lista(r.productIds),
    excludeIds: lista(r.excludeIds),
    search: texto(r.search),
    missing,
    marginMin: numero(r.marginMin),
    marginMax: numero(r.marginMax),
    belowCategoryMargin: r.belowCategoryMargin === true ? true : undefined,
    priceMin: numero(r.priceMin),
    priceMax: numero(r.priceMax),
    staleDays: staleDays !== undefined && staleDays > 0 ? Math.floor(staleDays) : undefined,
  };
}

/** El viejo `scope` de un eje, traducido a una selección. Para las reglas ya guardadas. */
export function seleccionDesdeScope(scopeType?: string, scopeValue?: string | null, ids?: string[]): PriceSelection {
  if (scopeType === 'category' && scopeValue) return { categoryIds: [scopeValue] };
  if (scopeType === 'brand' && scopeValue) return { brands: [scopeValue] };
  if (scopeType === 'ids') return { productIds: ids ?? [] };
  return {};
}

/** true si la selección no recorta nada: son todos los productos activos. */
export function esTodo(s: PriceSelection): boolean {
  return !s.categoryIds && !s.brands && !s.supplierIds && !s.productIds && !s.excludeIds
    && !s.search && !s.missing && s.marginMin === undefined && s.marginMax === undefined
    && !s.belowCategoryMargin && s.priceMin === undefined && s.priceMax === undefined && s.staleDays === undefined;
}

/** true si hace falta el precio vigente para filtrar, no sólo para calcular. */
export function necesitaPrecioParaFiltrar(s: PriceSelection): boolean {
  return s.missing === 'sale' || s.marginMin !== undefined || s.marginMax !== undefined
    || !!s.belowCategoryMargin || s.priceMin !== undefined || s.priceMax !== undefined;
}

/** La parte de la selección que resuelve la base. */
export function selectionWhere(tenantId: string, s: PriceSelection): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [];
  if (s.categoryIds) and.push({ categoryId: { in: s.categoryIds } });
  if (s.brands) and.push({ brand: { in: s.brands } });
  // Cualquier vínculo con el proveedor, no sólo el preferido: si el producto se
  // le compra a Arcor aunque el preferido sea otro, el aumento de Arcor lo toca.
  if (s.supplierIds) and.push({ suppliers: { some: { supplierId: { in: s.supplierIds } } } });
  if (s.productIds) and.push({ id: { in: s.productIds } });
  if (s.excludeIds) and.push({ id: { notIn: s.excludeIds } });
  if (s.search) {
    and.push({
      OR: [
        { name: { contains: s.search, mode: 'insensitive' } },
        { sku: { contains: s.search, mode: 'insensitive' } },
        { barcode: { contains: s.search } },
        { brand: { contains: s.search, mode: 'insensitive' } },
      ],
    });
  }
  if (s.missing === 'cost') and.push({ costPrice: null });
  return { tenantId, isActive: true, ...(and.length ? { AND: and } : {}) };
}

/**
 * Margen sobre el costo en %, la definición que usa el mostrador
 * ("lo compro a 100 y lo vendo a 135" = 35%). null si no se puede calcular.
 */
export function margenPorcentual(cost: number | null, sale: number | null): number | null {
  if (cost === null || sale === null || cost <= 0) return null;
  return ((sale - cost) / cost) * 100;
}

/** Aplica los filtros que dependen del precio vigente. */
export function pasaFiltrosDePrecio(
  s: PriceSelection,
  datos: { cost: number | null; sale: number | null; ultimoCambio: Date | null; categoryId?: string | null },
  ahora: Date,
  margenPorCategoria?: Map<string, number>,
): boolean {
  if (s.missing === 'sale' && datos.sale !== null) return false;
  if (s.priceMin !== undefined && (datos.sale === null || datos.sale < s.priceMin)) return false;
  if (s.priceMax !== undefined && (datos.sale === null || datos.sale > s.priceMax)) return false;
  if (s.marginMin !== undefined || s.marginMax !== undefined) {
    const m = margenPorcentual(datos.cost, datos.sale);
    if (m === null) return false;
    if (s.marginMin !== undefined && m < s.marginMin) return false;
    if (s.marginMax !== undefined && m > s.marginMax) return false;
  }
  if (s.belowCategoryMargin) {
    const objetivo = datos.categoryId ? margenPorCategoria?.get(datos.categoryId) : undefined;
    if (objetivo === undefined) return false;
    const m = margenPorcentual(datos.cost, datos.sale);
    if (m === null || m >= objetivo) return false;
  }
  // Nunca tocado cuenta como lo más viejo: es justamente lo que se busca.
  if (s.staleDays !== undefined && datos.ultimoCambio !== null) {
    const dias = (ahora.getTime() - datos.ultimoCambio.getTime()) / 86_400_000;
    if (dias < s.staleDays) return false;
  }
  return true;
}

/** Texto en criollo de la selección, para listarla sin mostrar el JSON. */
export function describirSeleccion(s: PriceSelection, nombres: SelectionNames = {}): string {
  if (esTodo(s)) return 'Todos los productos';
  const partes: string[] = [];
  const nombrar = (ids: string[], mapa: Map<string, string> | undefined, singular: string, plural: string) =>
    ids.length === 1 ? `${singular} ${mapa?.get(ids[0]) ?? ids[0]}` : `${ids.length} ${plural}`;
  const plural = (n: number, palabra: string) => `${n} ${palabra}${n === 1 ? '' : 's'}`;

  if (s.categoryIds) partes.push(nombrar(s.categoryIds, nombres.categories, 'categoría', 'categorías'));
  if (s.brands) partes.push(s.brands.length === 1 ? `marca ${s.brands[0]}` : plural(s.brands.length, 'marca'));
  if (s.supplierIds) partes.push(nombrar(s.supplierIds, nombres.suppliers, 'proveedor', 'proveedores'));
  if (s.productIds) partes.push(`${plural(s.productIds.length, 'producto')} elegido${s.productIds.length === 1 ? '' : 's'}`);
  if (s.search) partes.push(`que digan «${s.search}»`);
  if (s.missing === 'sale') partes.push('sin precio de venta');
  if (s.missing === 'cost') partes.push('sin costo cargado');
  if (s.marginMin !== undefined && s.marginMax !== undefined) partes.push(`margen entre ${s.marginMin}% y ${s.marginMax}%`);
  else if (s.marginMin !== undefined) partes.push(`margen desde ${s.marginMin}%`);
  else if (s.marginMax !== undefined) partes.push(`margen hasta ${s.marginMax}%`);
  if (s.belowCategoryMargin) partes.push('por debajo del margen de su categoría');
  if (s.priceMin !== undefined && s.priceMax !== undefined) partes.push(`precio entre ${s.priceMin} y ${s.priceMax}`);
  else if (s.priceMin !== undefined) partes.push(`precio desde ${s.priceMin}`);
  else if (s.priceMax !== undefined) partes.push(`precio hasta ${s.priceMax}`);
  if (s.staleDays !== undefined) partes.push(`sin cambios desde hace ${s.staleDays} días`);
  if (s.excludeIds) partes.push(`menos ${s.excludeIds.length}`);
  return partes.join(' · ');
}
