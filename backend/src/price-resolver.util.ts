import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export type PriceSource = 'manual' | 'import' | 'bulk' | 'rule';

/**
 * Resolución del precio de un producto en una lista, en un momento dado.
 *
 * Orden de precedencia:
 *   1. Fila explícita de ProductPrice para (producto, lista) ya vigente.
 *      Esto es lo que permite pisar un producto puntual en una lista derivada.
 *   2. Si la lista deriva de otra, resolver en la lista padre y aplicar el recargo.
 *   3. Sin precio.
 *
 * El paso 2 es recursivo pero acotado: crearLista/actualizarLista rechazan ciclos,
 * y aun así se corta a MAX_PROFUNDIDAD por seguridad.
 */
const MAX_PROFUNDIDAD = 10;

export type ListaResuelta = { id: string; derivesFromId: string | null; markupPercent: Prisma.Decimal | null };

function redondear2(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/** Precio vigente explícito en una lista, sin mirar derivación. */
async function precioExplicito(db: Db, tenantId: string, productId: string, priceListId: string, at: Date) {
  const fila = await db.productPrice.findFirst({
    where: { tenantId, productId, priceListId, validFrom: { lte: at } },
    orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
    select: { price: true },
  });
  return fila?.price ?? null;
}

export async function resolverPrecio(
  db: Db,
  tenantId: string,
  productId: string,
  priceListId: string,
  at: Date = new Date(),
): Promise<Prisma.Decimal | null> {
  let listaId: string | null = priceListId;
  // Recargos acumulados de cada salto de derivación, aplicados al final sobre el
  // primer precio explícito que aparezca subiendo por la cadena.
  const recargos: Prisma.Decimal[] = [];

  for (let salto = 0; salto < MAX_PROFUNDIDAD && listaId; salto++) {
    const explicito = await precioExplicito(db, tenantId, productId, listaId, at);
    if (explicito !== null) {
      let precio = explicito;
      for (const recargo of recargos) precio = precio.mul(recargo.div(100).plus(1));
      return redondear2(precio);
    }
    const lista: ListaResuelta | null = await db.priceList.findFirst({
      where: { id: listaId, tenantId },
      select: { id: true, derivesFromId: true, markupPercent: true },
    });
    if (!lista?.derivesFromId) return null;
    recargos.unshift(lista.markupPercent ?? new Prisma.Decimal(0));
    listaId = lista.derivesFromId;
  }
  return null;
}

/** Resuelve muchos productos de una lista de una sola vez (para listados y export). */
export async function resolverPrecios(
  db: Db,
  tenantId: string,
  productIds: string[],
  priceListId: string,
  at: Date = new Date(),
): Promise<Map<string, Prisma.Decimal>> {
  const salida = new Map<string, Prisma.Decimal>();
  if (!productIds.length) return salida;

  // Cadena de listas desde la pedida hasta la raíz, con su recargo.
  const cadena: Array<{ id: string; recargoAcumulado: Prisma.Decimal }> = [];
  let listaId: string | null = priceListId;
  let acumulado = new Prisma.Decimal(1);
  for (let salto = 0; salto < MAX_PROFUNDIDAD && listaId; salto++) {
    cadena.push({ id: listaId, recargoAcumulado: acumulado });
    const lista: ListaResuelta | null = await db.priceList.findFirst({
      where: { id: listaId, tenantId },
      select: { id: true, derivesFromId: true, markupPercent: true },
    });
    if (!lista?.derivesFromId) break;
    acumulado = acumulado.mul((lista.markupPercent ?? new Prisma.Decimal(0)).div(100).plus(1));
    listaId = lista.derivesFromId;
  }

  // Se recorre la cadena de la lista pedida hacia la raíz: el primer eslabón que
  // tenga precio para un producto gana, y los que ya se resolvieron se saltean.
  for (const eslabon of cadena) {
    const faltantes = productIds.filter(id => !salida.has(id));
    if (!faltantes.length) break;
    const filas = await db.$queryRaw<Array<{ product_id: string; price: Prisma.Decimal }>>`
      SELECT DISTINCT ON (product_id) product_id, price
      FROM product_prices
      WHERE tenant_id = ${tenantId}::uuid
        AND price_list_id = ${eslabon.id}::uuid
        AND product_id = ANY(${faltantes}::uuid[])
        AND valid_from <= ${at}
      ORDER BY product_id, valid_from DESC, created_at DESC
    `;
    for (const f of filas) salida.set(f.product_id, redondear2(f.price.mul(eslabon.recargoAcumulado)));
  }
  return salida;
}

/**
 * Guarda un precio. Si la fila queda vigente y es de la lista base, además
 * refresca la caché Product.salePrice — único lugar donde se escribe ese campo.
 */
export async function guardarPrecio(
  db: Db,
  params: { tenantId: string; productId: string; priceListId: string; price: Prisma.Decimal | number; validFrom?: Date; source: PriceSource; userId?: string | null },
) {
  const validFrom = params.validFrom ?? new Date();
  await db.productPrice.create({
    data: {
      tenantId: params.tenantId,
      productId: params.productId,
      priceListId: params.priceListId,
      price: params.price,
      validFrom,
      source: params.source,
      userId: params.userId ?? null,
    },
  });
  if (validFrom > new Date()) return; // programado: lo activa el job cuando corresponda
  const lista = await db.priceList.findFirst({ where: { id: params.priceListId, tenantId: params.tenantId }, select: { isDefault: true } });
  if (lista?.isDefault) {
    await db.product.update({ where: { id: params.productId }, data: { salePrice: params.price } });
  }
}

/**
 * Materializa en Product.salePrice los precios de la lista base que ya entraron
 * en vigencia. Lo llama el job programado y también se puede correr a mano.
 * Devuelve cuántas filas cambió.
 */
export async function activarPreciosVigentes(db: Db): Promise<number> {
  const filas = await db.$executeRaw`
    UPDATE products p
    SET sale_price = v.price
    FROM (
      SELECT DISTINCT ON (pp.tenant_id, pp.product_id) pp.tenant_id, pp.product_id, pp.price
      FROM product_prices pp
      JOIN price_lists pl ON pl.id = pp.price_list_id AND pl.is_default = true
      WHERE pp.valid_from <= NOW()
      ORDER BY pp.tenant_id, pp.product_id, pp.valid_from DESC, pp.created_at DESC
    ) v
    WHERE p.id = v.product_id AND p.tenant_id = v.tenant_id
      AND (p.sale_price IS DISTINCT FROM v.price)
  `;
  return filas;
}
