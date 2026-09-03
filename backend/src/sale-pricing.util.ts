import { Prisma, PrismaClient } from '@prisma/client';
import { resolverPrecios } from './price-resolver.util';

type Db = PrismaClient | Prisma.TransactionClient;

export type LineaPedida = { productId: string; quantity: number };

export type LineaCotizada = {
  productId: string;
  quantity: number;
  /** Precio unitario de lista, antes de escalas y promociones. */
  listPrice: number;
  /** Precio unitario efectivo (puede venir de una escala por cantidad). */
  unitPrice: number;
  /** Descuento total de la línea que aporta la promoción. */
  discountAmount: number;
  promotionId: string | null;
  promotionName: string | null;
  taxRate: number;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
};

function r2(n: number) {
  return Math.round(n * 100) / 100;
}

type PromoConfig = Record<string, number>;

/**
 * Descuento que aporta una promoción sobre una línea, en pesos.
 * Devuelve 0 si la promoción no llega a aplicar (ej: un 3x2 con 2 unidades).
 */
export function descuentoPromo(tipo: string, config: PromoConfig, cantidad: number, precioUnitario: number): number {
  switch (tipo) {
    case 'nxm': {
      // Cada grupo de n unidades paga m: se regalan (n-m) por grupo completo.
      const grupos = Math.floor(cantidad / config.n);
      return r2(grupos * (config.n - config.m) * precioUnitario);
    }
    case 'a_plus_b': {
      // Por cada (buyQty + getQty) unidades llevadas, getQty son gratis.
      const bloque = config.buyQty + config.getQty;
      const grupos = Math.floor(cantidad / bloque);
      return r2(grupos * config.getQty * precioUnitario);
    }
    case 'percent': {
      // Las unidades desde desdeUnidad en adelante van con descuento.
      const conDescuento = Math.max(0, cantidad - (config.desdeUnidad - 1));
      return r2(conDescuento * precioUnitario * (config.percent / 100));
    }
    case 'amount':
      return r2(Math.min(config.amount * cantidad, precioUnitario * cantidad));
    case 'special_price':
      // El precio especial sólo descuenta si es menor al que se iba a cobrar.
      return r2(Math.max(0, (precioUnitario - config.price) * cantidad));
    default:
      return 0;
  }
}

type PromoFila = { id: string; name: string; type: string; config: unknown; scopeType: string; scopeValue: string | null };

/** ¿Esta promoción alcanza a este producto? */
function alcanza(promo: PromoFila, producto: { categoryId: string | null; brand: string | null }) {
  if (promo.scopeType === 'all') return true;
  if (promo.scopeType === 'category') return producto.categoryId === promo.scopeValue;
  if (promo.scopeType === 'brand') return producto.brand === promo.scopeValue;
  return false;
}

/**
 * Cotiza un carrito: resuelve precio de lista, escala por cantidad y promoción
 * para cada línea. No escribe nada — la usa tanto la pantalla de venta mientras
 * se cargan productos como la confirmación, para que ambas den el mismo número.
 */
export async function cotizar(
  db: Db,
  tenantId: string,
  priceListId: string,
  lineas: LineaPedida[],
  at: Date = new Date(),
): Promise<LineaCotizada[]> {
  if (!lineas.length) return [];
  const productIds = lineas.map(l => l.productId);

  const [productos, precios, escalas, promos] = await Promise.all([
    db.product.findMany({ where: { tenantId, id: { in: productIds } }, select: { id: true, taxRate: true, categoryId: true, brand: true } }),
    resolverPrecios(db, tenantId, productIds, priceListId, at),
    db.priceTier.findMany({ where: { tenantId, priceListId, productId: { in: productIds } }, orderBy: { minQty: 'desc' } }),
    db.promotion.findMany({
      where: { tenantId, isActive: true, validFrom: { lte: at }, OR: [{ validTo: null }, { validTo: { gte: at } }] },
    }),
  ]);
  const porProducto = new Map(productos.map(p => [p.id, p]));

  return lineas.map(l => {
    const producto = porProducto.get(l.productId);
    const base = precios.get(l.productId);
    const listPrice = base ? Number(base) : 0;
    const taxRate = producto ? Number(producto.taxRate) : 0;

    // Escala: gana el minQty más alto que la cantidad alcance.
    const escala = escalas.find(e => e.productId === l.productId && l.quantity >= Number(e.minQty));
    const unitPrice = escala ? Number(escala.price) : listPrice;

    // Promoción: si aplican varias, gana la que más descuenta y sólo esa.
    // Acumularlas abre casos de borde (dos del 60% dejarían el producto gratis)
    // que no valen la complejidad en un mostrador.
    let mejor: { promo: PromoFila; monto: number } | null = null;
    for (const promo of promos) {
      if (!producto || !alcanza(promo as PromoFila, producto)) continue;
      const monto = descuentoPromo(promo.type, (promo.config ?? {}) as PromoConfig, l.quantity, unitPrice);
      if (monto > 0 && (!mejor || monto > mejor.monto)) mejor = { promo: promo as PromoFila, monto };
    }

    const bruto = r2(unitPrice * l.quantity);
    const discountAmount = mejor ? Math.min(mejor.monto, bruto) : 0;
    const lineSubtotal = r2(bruto - discountAmount);
    const lineTax = r2(lineSubtotal * (taxRate / 100));

    return {
      productId: l.productId,
      quantity: l.quantity,
      listPrice,
      unitPrice,
      discountAmount,
      promotionId: mejor?.promo.id ?? null,
      promotionName: mejor?.promo.name ?? null,
      taxRate,
      lineSubtotal,
      lineTax,
      lineTotal: r2(lineSubtotal + lineTax),
    };
  });
}
