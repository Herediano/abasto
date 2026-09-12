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
 * Cuánto pedir para volver al máximo ("reponer hasta"), o si no hay máximo
 * configurado, al menos hasta el mínimo (sin esto, un producto sin "reponer
 * hasta" quedaba sin sugerencia real — el llamador tenía que inventar algo,
 * y el fallback que había en Reposición usaba el mínimo tal cual, como si
 * "pedir" y "el umbral que dispara la alerta" fueran lo mismo). Redondea
 * hacia arriba al múltiplo del bulto de compra (si se compra por bulto).
 * null sólo si no hay ni máximo ni mínimo, o ya está en el objetivo o por
 * encima.
 */
export function suggestedOrder(current: number, max: number | null, packSize = 1, min: number | null = null): number | null {
  const objetivo = max ?? min;
  if (objetivo == null || current >= objetivo) return null;
  const need = objetivo - current;
  const step = packSize > 1 ? packSize : 1;
  return Math.ceil(need / step) * step;
}
