import { MovementType } from '@prisma/client';

export const IN_MOVEMENT_TYPES = [MovementType.purchase_in, MovementType.transfer_in, MovementType.adjustment_in] as const;
export const OUT_MOVEMENT_TYPES = [MovementType.sale_out, MovementType.transfer_out, MovementType.adjustment_out] as const;

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
  notes?: unknown;
};

