import { Prisma } from '@prisma/client';

type Decish = Prisma.Decimal | null | undefined;
const num = (v: Decish): number | null => (v == null ? null : Number(v));

export type EffectiveStockRule = {
  /** Umbral que dispara la alerta de reposición. */
  minStock: number | null;
  /** Objetivo al reponer ("reponer hasta"). */
  maxStock: number | null;
  /** true si la sucursal activa tiene una regla propia con algún valor. */
  branchOverride: boolean;
};

/**
 * Mínimo / máximo efectivos de un producto en una sucursal: la regla de la
 * sucursal pisa el valor general del producto, campo por campo.
 */
export function effectiveStockRule(
  product: { minStock: Decish; maxStock: Decish },
  rule?: { minStock: Decish; maxStock: Decish } | null,
): EffectiveStockRule {
  const min = rule?.minStock ?? product.minStock;
  const max = rule?.maxStock ?? product.maxStock;
  return {
    minStock: num(min),
    maxStock: num(max),
    branchOverride: !!rule && (rule.minStock != null || rule.maxStock != null),
  };
}

/**
 * Cuánto pedir para volver al máximo. Redondea hacia arriba al múltiplo del
 * bulto de compra (si se compra por bulto). null si no hay máximo o ya está por
 * encima.
 */
export function suggestedOrder(current: number, max: number | null, packSize = 1): number | null {
  if (max == null || current >= max) return null;
  const need = max - current;
  const step = packSize > 1 ? packSize : 1;
  return Math.ceil(need / step) * step;
}
