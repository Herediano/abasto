import { Request } from 'express';

export type AuthUser = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  rangoId: string;
  rangoName: string;
  permissions: Set<string>;
  /** El depósito operativo de la sucursal ACTIVA: a dónde van las ventas, compras y movimientos de stock. */
  warehouseId?: string | null;
  /** La sucursal activa (la propia, o la que se está mirando con `sucursales.navegar`). */
  branchId?: string | null;
  /** La sucursal propia del usuario, la que deriva de su depósito. */
  homeBranchId?: string | null;
  /** Todos los depósitos de la sucursal activa — con qué filtrar los listados y reportes. */
  branchWarehouseIds?: string[];
  /** ¿Puede mirar otras sucursales además de la suya? */
  canNavigateBranches?: boolean;
};
export type AuthRequest = Request & { user: AuthUser };
