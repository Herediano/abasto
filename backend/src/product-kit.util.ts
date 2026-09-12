import { Prisma } from '@prisma/client';

export type KitComponent = { componentProductId: string; quantity: number; name: string; manejaVencimiento: boolean };

/**
 * Componentes de un kit/combo, si los tiene. Un kit nunca tiene stock propio:
 * vender o devolver un kit mueve el stock de estos componentes, no el del
 * kit — quien llama a esto tiene que expandir cada línea antes de tocar
 * stock_movements. Vacío = no es un kit, es un producto común.
 */
export async function obtenerComponentes(
  db: Pick<Prisma.TransactionClient, 'productComponent'>,
  tenantId: string,
  kitProductId: string,
): Promise<KitComponent[]> {
  const filas = await db.productComponent.findMany({
    where: { tenantId, kitProductId },
    select: { componentProductId: true, quantity: true, componentProduct: { select: { name: true, manejaVencimiento: true } } },
  });
  return filas.map(f => ({
    componentProductId: f.componentProductId,
    quantity: Number(f.quantity),
    name: f.componentProduct.name,
    manejaVencimiento: f.componentProduct.manejaVencimiento,
  }));
}
