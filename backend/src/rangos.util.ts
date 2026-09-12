import { Prisma } from '@prisma/client';
import { DEFAULT_RANGOS, PLANTILLAS, type PlantillaKey } from './permissions.catalog';

type Db = Prisma.TransactionClient;

/**
 * Crea los rangos de fábrica de la plantilla elegida (todos los permisos
 * salen de DEFAULT_RANGOS; la plantilla sólo filtra cuántos rangos nacen). Se
 * usa al dar de alta una empresa (signup) y para sembrar tenants ya
 * existentes que todavía no los tengan (seed.ts, backfill), donde no aplica
 * ninguna plantilla y se siembran los 7 completos. Devuelve el id de cada
 * rango por nombre, para poder asignarle uno al usuario que se está creando.
 */
export async function sembrarRangosDeFabrica(tx: Db, tenantId: string, plantilla: PlantillaKey = 'mayorista'): Promise<Map<string, string>> {
  const nombres = PLANTILLAS[plantilla]?.rangos ?? PLANTILLAS.mayorista.rangos;
  const porNombre = new Map<string, string>();
  for (const name of nombres) {
    const keys = DEFAULT_RANGOS[name] ?? [];
    const rango = await tx.rango.create({ data: { tenantId, name, isSystem: true } });
    porNombre.set(name, rango.id);
    if (keys.length) {
      await tx.rangoPermission.createMany({ data: keys.map(key => ({ tenantId, rangoId: rango.id, key })) });
    }
  }
  return porNombre;
}
