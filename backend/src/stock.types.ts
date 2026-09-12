import { AdjustmentReason, MovementType } from '@prisma/client';

// purchase_in, sale_out, transfer_in/out se generan sólo desde sus propios flujos
// (compras, ventas, POST /stock/transfer), cada uno con su referencia. El
// endpoint manual de movimientos es sólo para ajustes sin flujo propio.
export const IN_MOVEMENT_TYPES = [MovementType.adjustment_in] as const;
export const OUT_MOVEMENT_TYPES = [MovementType.adjustment_out] as const;

export const ADJUSTMENT_REASONS = [AdjustmentReason.merma, AdjustmentReason.rotura, AdjustmentReason.vencido, AdjustmentReason.otro] as const;

export type MovementInput = {
  productId?: unknown;
  productLotId?: unknown;
  warehouseId?: unknown;
  quantity?: unknown;
  movementType?: unknown;
  operationId?: unknown;
  occurredAt?: unknown;
  referenceType?: unknown;
  referenceId?: unknown;
  reason?: unknown;
  notes?: unknown;
};

