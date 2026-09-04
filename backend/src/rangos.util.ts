import { Prisma } from '@prisma/client';
import { DEFAULT_RANGOS } from './permissions.catalog';

type Db = Prisma.TransactionClient;

/**
 * Crea los 7 rangos de fábrica con sus permisos para un tenant. Se usa al
 * dar de alta una empresa (signup) y para sembrar tenants ya existentes que
 * todavía no los tengan (seed.ts, backfill). Devuelve el id de cada rango
 * por nombre, para poder asignarle uno al usuario que se está creando.
 */
export async function sembrarRangosDeFabrica(tx: Db, tenantId: string): Promise<Map<string, string>> {
  const porNombre = new Map<string, string>();
  for (const [name, keys] of Object.entries(DEFAULT_RANGOS)) {
    const rango = await tx.rango.create({ data: { tenantId, name, isSystem: true } });
    porNombre.set(name, rango.id);
    if (keys.length) {
      await tx.rangoPermission.createMany({ data: keys.map(key => ({ tenantId, rangoId: rango.id, key })) });
    }
  }
  return porNombre;
}
