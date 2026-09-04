import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

/** Marca un endpoint con la clave del catálogo que hace falta tener (ver permissions.catalog.ts). */
export const RequirePermission = (permission: string) => SetMetadata(PERMISSION_KEY, permission);
