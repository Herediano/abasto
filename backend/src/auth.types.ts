import { Request } from 'express';

export type AuthUser = { id: string; tenantId: string; name: string; email: string; role: 'admin' | 'user'; warehouseId?: string | null };
export type AuthRequest = Request & { user: AuthUser };
