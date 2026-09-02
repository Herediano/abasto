import { Prisma } from '@prisma/client';

export type PriceField = 'cost' | 'sale';
export type PriceSource = 'manual' | 'import' | 'bulk' | 'invoice';

type Decimalish = Prisma.Decimal | number | string | null | undefined;

export type PriceHistoryEntry = {
  tenantId: string;
  productId: string;
  field: PriceField;
  oldValue: number | null;
  newValue: number;
  source: PriceSource;
  userId?: string | null;
};

function toNumber(value: Decimalish): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Arma la entrada de historial sólo si el precio realmente cambió.
 * Devuelve null cuando no hay nada que registrar, para que quien llama pueda
 * filtrar sin repetir la comparación en cada lugar.
 */
export function priceChange(params: {
  tenantId: string;
  productId: string;
  field: PriceField;
  before: Decimalish;
  after: Decimalish;
  source: PriceSource;
  userId?: string | null;
}): PriceHistoryEntry | null {
  const oldValue = toNumber(params.before);
  const newValue = toNumber(params.after);
  if (newValue === null) return null;
  // Se comparan redondeados a 2 decimales, que es como se guardan.
  if (oldValue !== null && Math.round(oldValue * 100) === Math.round(newValue * 100)) return null;
  return {
    tenantId: params.tenantId,
    productId: params.productId,
    field: params.field,
    oldValue,
    newValue,
    source: params.source,
    userId: params.userId ?? null,
  };
}
