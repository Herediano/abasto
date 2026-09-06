import { Request } from 'express';

export type AuthUser = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  rangoId: string;
  rangoName: string;
  permissions: Set<string>;
  warehouseId?: string | null;
  /** La sucursal del usuario, derivada de su depósito. */
  branchId?: string | null;
};
export type AuthRequest = Request & { user: AuthUser };
