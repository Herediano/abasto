import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Carga el catálogo de referencia global (`product_reference`) que viene por
 * defecto con el programa. Cualquier tenant lo puede volcar a sus productos con
 * "Cargar catálogo regional". Solo carga si la tabla está vacía; para actualizar
 * el catálogo, usar `npm run db:import-reference`.
 */
async function seedReferenceCatalog() {
  if ((await prisma.productReference.count()) > 0) return;
  const path = join(__dirname, 'data', 'reference-catalog.ndjson');
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    console.log('Sin prisma/data/reference-catalog.ndjson: se omite el catálogo de referencia.');
    return;
  }
  const data = raw
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line) as { ean: string; name: string; brand: string | null });
  for (let i = 0; i < data.length; i += 1000) {
    await prisma.productReference.createMany({ data: data.slice(i, i + 1000), skipDuplicates: true });
  }
  console.log(`Catálogo de referencia cargado: ${data.length} códigos.`);
}

seedReferenceCatalog().catch(console.error).finally(async () => prisma.$disconnect());
