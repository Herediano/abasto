import { Request } from 'express';

export type AuthUser = { id: string; tenantId: string; name: string; email: string };
export type AuthRequest = Request & { user: AuthUser };
