import { Prisma } from '@prisma/client';
import type { PrismaService } from './prisma/prisma.service';

/**
 * Búsqueda de productos pensada para el mostrador, no para una base de datos.
 *
 * El catálogo real viene lleno de palabras cortadas — "QUE.FONTINA",
 * "GAS. TONICA", "FIA.CER.PALETA" —, casi la mitad de las filas. Buscar la
 * consulta como una sola subcadena no encuentra casi nada.
 *
 * La regla, por cada palabra que escribe el usuario:
 *
 *   1. Alguna palabra del catálogo **empieza con** lo escrito.
 *      "gase" encuentra "GASEOSA", "coca" encuentra "COCA COLA".
 *   2. O alguna palabra **completa** del catálogo es el **principio** de lo
 *      escrito, con al menos 3 letras. Esto es lo que resuelve las
 *      abreviaturas: "queso" encuentra "QUE.", "gaseosa" encuentra "GAS.".
 *      Se exige palabra completa para no traer "QUEMAITA" al buscar "queso".
 *
 * Todas las palabras tienen que aparecer, en cualquier orden y en cualquier
 * campo (nombre, marca, código). La comparación es sin acentos y sin
 * puntuación, así "panal" encuentra "PAÑAL".
 *
 * Si con esa regla no aparece nada, se hace una segunda pasada por parecido
 * (trigramas), que es la que salva los errores de tipeo: "cocacola", "gaseoza".
 */

/** Deja el texto como lo deja `product_haystack` en SQL: minúsculas, sin acentos, sólo alfanumérico. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const LIMITE_TERMINOS = 6;
const ABREVIATURA_MINIMA = 3;
/** Por debajo de esto el parecido es ruido y trae cualquier cosa. */
const PARECIDO_MINIMO = 0.25;

function condicionTermino(termino: string): Prisma.Sql {
  // Ojo con los comodines: LIKE ancla al principio si no arranca con '%'. El
  // '%' inicial es lo que hace que la palabra pueda estar en cualquier parte
  // del texto; el espacio que le sigue es lo que la ata a un comienzo de palabra.
  const alternativas: Prisma.Sql[] = [
    // Alguna palabra del catálogo empieza con lo escrito: "gase" → "GASEOSA".
    Prisma.sql`h LIKE ${'% ' + termino + '%'}`,
  ];
  // O el catálogo tiene la abreviatura como palabra completa: "QUE." → "queso".
  for (let corte = ABREVIATURA_MINIMA; corte < termino.length; corte++) {
    alternativas.push(Prisma.sql`h LIKE ${'% ' + termino.slice(0, corte) + ' %'}`);
  }
  return Prisma.sql`(${Prisma.join(alternativas, ' OR ')})`;
}

/**
 * Devuelve los ids de producto que coinciden, **ordenados por relevancia**.
 * El llamador aplica el resto de sus filtros y conserva este orden.
 */
export async function buscarProductoIds(
  prisma: PrismaService,
  tenantId: string,
  consulta: string,
  limite = 400,
): Promise<string[]> {
  const normal = normalizar(consulta);
  if (!normal) return [];
  const terminos = normal.split(' ').filter(Boolean).slice(0, LIMITE_TERMINOS);
  if (!terminos.length) return [];

  const base = Prisma.sql`
    SELECT id, name, product_haystack(name, brand, barcode, internal_code) AS h
    FROM products
    WHERE tenant_id = ${tenantId}::uuid
  `;

  // El orden: primero lo que arranca con lo que se escribió, después lo más
  // parecido, y a igualdad alfabético para que el listado no baile entre
  // búsquedas iguales.
  const orden = Prisma.sql`
    ORDER BY
      (CASE WHEN h LIKE ${' ' + normal + '%'} THEN 1 ELSE 0 END) DESC,
      similarity(h, ${normal}) DESC,
      name ASC
    LIMIT ${limite}
  `;

  const exactos = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    WITH base AS (${base})
    SELECT id FROM base
    WHERE ${Prisma.join(terminos.map(condicionTermino), ' AND ')}
    ${orden}
  `);
  if (exactos.length) return exactos.map(r => r.id);

  const parecidos = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    WITH base AS (${base})
    SELECT id FROM base
    WHERE similarity(h, ${normal}) > ${PARECIDO_MINIMO}
    ${orden}
  `);
  return parecidos.map(r => r.id);
}
