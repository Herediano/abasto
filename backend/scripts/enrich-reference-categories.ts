/**
 * Completa product_reference.category (rubro canonico) a partir del arbol de
 * categorias de Precios Claros, que es la misma fuente publica de la que sale el
 * catalogo de referencia (SEPA no publica el rubro de cada producto).
 *
 * Como funciona: la API de Precios Claros no devuelve la categoria dentro de
 * cada producto, pero permite pedir "los productos de la categoria X". Entonces
 * recorremos las 11 categorias de nivel 1 (Almacen, Limpieza, Perfumeria, ...) y
 * a cada EAN que devuelven le asignamos ese rubro. Solo se actualizan filas que
 * ya existen en product_reference; la creacion de filas la sigue haciendo la
 * carga de SEPA.
 *
 *   npm run db:enrich-categories                 # corre contra DATABASE_URL
 *   npm run db:enrich-categories -- --dry-run    # no escribe, solo informa
 *   npm run db:enrich-categories -- --rubros=02,07   # solo esos ids de nivel 1
 *
 * Es idempotente: volver a correrlo re-clasifica y pisa el valor anterior.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const API = 'https://d3e6htiiul5ek9.cloudfront.net/prod';
// Clave publica embebida en el frontend de preciosclaros.gob.ar.
const HEADERS = {
  'x-api-key': 'zIgFou7Gta7g87VFGL9dZ4BEEs19gNYS1SOQZt96',
  referer: 'https://www.preciosclaros.gob.ar',
  'user-agent': 'Mozilla/5.0 (abasto enrich-reference-categories)',
};
const PAGE = 100; // maxLimitPermitido de la API
const SUCURSALES_POR_LOTE = 45; // maxCantSucursalesPermitido es 50
const LOTES = 4; // pasadas con distintas sucursales; se unen los EAN de todas
const REQUEST_PAUSE_MS = 150;

// Rubro que informa la API (en mayusculas) -> nombre canonico que se guarda y que
// import-reference usa para crear/reusar la Category del tenant.
const RUBRO_CANONICO: Record<string, string> = {
  'ALIMENTOS CONGELADOS': 'Congelados',
  'ALMACÉN': 'Almacén',
  'BEBÉS': 'Bebés',
  'BEBIDAS CON ALCOHOL': 'Bebidas con alcohol',
  'BEBIDAS SIN ALCOHOL': 'Bebidas sin alcohol',
  FRESCOS: 'Frescos',
  LIMPIEZA: 'Limpieza',
  MASCOTAS: 'Mascotas',
  'PERFUMERÍA y CUIDADO PERSONAL': 'Perfumería y cuidado personal',
  'ELECTRODOMÉSTICOS Y EQUIPAMIENTO PARA EL HOGAR': 'Electrodomésticos y hogar',
  'MATERIALES PARA LA CONSTRUCCIÓN': 'Construcción',
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function apiGet<T>(path: string, attempt = 1): Promise<T> {
  try {
    const res = await fetch(`${API}${path}`, { headers: HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status} en ${path}`);
    return (await res.json()) as T;
  } catch (err) {
    if (attempt >= 4) throw err;
    await sleep(attempt * 1000);
    return apiGet<T>(path, attempt + 1);
  }
}

type Categoria = { id: string; nombre: string | null; padres?: string[] };
type Producto = { id: string };

function titleCase(s: string) {
  return s.toLowerCase().replace(/(^|\s)\p{L}/gu, m => m.toUpperCase());
}

/** Arma varios lotes de sucursales de cadenas y provincias variadas. La API solo
 *  lista productos "disponibles" en las sucursales que se le pasan (tope 50), asi
 *  que se hacen varias pasadas con lotes distintos y se unen los EAN. Los codigos
 *  son nacionales: no hace falta cubrir todo el pais, esto solo ensancha el
 *  universo de productos que devuelve. */
async function pickSucursalBatches(): Promise<string[][]> {
  const porCadena = new Map<string, string[]>(); // comercio-bandera -> ids
  for (let offset = 0; offset < 2200; offset += 70) {
    const data = await apiGet<{ sucursales: Array<{ id: string; banderaId?: string; comercioId?: string }> }>(
      `/sucursales?limit=30&offset=${offset}`,
    );
    for (const s of data.sucursales ?? []) {
      const key = `${s.comercioId ?? '?'}-${s.banderaId ?? '?'}`;
      const list = porCadena.get(key) ?? [];
      if (list.length < LOTES * 3) list.push(s.id);
      porCadena.set(key, list);
    }
    await sleep(REQUEST_PAUSE_MS);
  }

  // Repartir en LOTES rondas tomando de a una sucursal por cadena, para que cada
  // lote tenga la mayor variedad de cadenas posible.
  const colas = [...porCadena.values()];
  const lotes: string[][] = Array.from({ length: LOTES }, () => []);
  for (let ronda = 0; ronda < LOTES * 3; ronda++) {
    for (const cola of colas) {
      const id = cola[ronda];
      if (!id) continue;
      const lote = lotes[ronda % LOTES];
      if (lote.length < SUCURSALES_POR_LOTE) lote.push(id);
    }
  }
  return lotes.filter(l => l.length > 0);
}

async function productosDeRubro(idCategoria: string, lotes: string[][]): Promise<Set<string>> {
  const eans = new Set<string>();
  for (const lote of lotes) {
    const sucursales = lote.join(',');
    const page = (offset: number) =>
      apiGet<{ total: number; productos: Producto[] }>(
        `/productos?array_sucursales=${sucursales}&limit=${PAGE}&offset=${offset}&id_categoria=${idCategoria}&sort=-cant_sucursales_disponible`,
      );
    const first = await page(0);
    const total = first.total ?? 0;
    for (const p of first.productos) eans.add(p.id);
    for (let offset = PAGE; offset < total; offset += PAGE) {
      const data = await page(offset);
      for (const p of data.productos) eans.add(p.id);
      await sleep(REQUEST_PAUSE_MS);
    }
    process.stdout.write(`      lote de ${lote.length} suc.: +${total} (union ${eans.size})\n`);
  }
  return eans;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const only = args.find(a => a.startsWith('--rubros='))?.split('=')[1]?.split(',').map(s => s.trim());

  console.log('Buscando sucursales de referencia...');
  const lotes = await pickSucursalBatches();
  console.log(`  ${lotes.length} lotes (${lotes.map(l => l.length).join(', ')} sucursales)`);

  const cats = await apiGet<{ categorias: Categoria[] }>('/categorias');
  const rubros = cats.categorias
    .filter(c => c.id.length === 2 && c.id !== '99' && (!only || only.includes(c.id)))
    .map(c => ({ id: c.id, nombre: c.nombre ?? c.id }));
  console.log(`Rubros a recorrer: ${rubros.map(r => r.nombre).join(', ')}`);

  const eanRubro = new Map<string, string>();
  let conflicts = 0;
  for (const rubro of rubros) {
    const label = RUBRO_CANONICO[rubro.nombre] ?? titleCase(rubro.nombre);
    console.log(`\n  ${rubro.nombre} -> "${label}"`);
    const eans = await productosDeRubro(rubro.id, lotes);
    let nuevos = 0;
    for (const ean of eans) {
      const prev = eanRubro.get(ean);
      if (prev && prev !== label) { conflicts++; continue; } // primer rubro gana
      if (!prev) nuevos++;
      eanRubro.set(ean, label);
    }
    console.log(`      ${eans.size} productos (${nuevos} EAN nuevos)`);
  }
  console.log(`\nTotal EAN clasificados por la API: ${eanRubro.size} (conflictos ignorados: ${conflicts})`);

  const refs = await prisma.productReference.findMany({ select: { ean: true } });
  const refEans = new Set(refs.map(r => r.ean));
  const porLabel = new Map<string, string[]>();
  for (const [ean, label] of eanRubro) {
    if (!refEans.has(ean)) continue;
    const list = porLabel.get(label) ?? [];
    list.push(ean);
    porLabel.set(label, list);
  }
  const matched = [...porLabel.values()].reduce((n, l) => n + l.length, 0);
  console.log(`De ${refEans.size} referencias, ${matched} quedan con rubro y ${refEans.size - matched} sin dato.`);
  for (const [label, eans] of porLabel) console.log(`  ${label}: ${eans.length}`);

  if (dryRun) {
    console.log('\n--dry-run: no se escribio nada.');
    return;
  }

  let written = 0;
  for (const [label, eans] of porLabel) {
    for (let i = 0; i < eans.length; i += 1000) {
      const chunk = eans.slice(i, i + 1000);
      const { count } = await prisma.productReference.updateMany({ where: { ean: { in: chunk } }, data: { category: label } });
      written += count;
    }
  }
  console.log(`\nListo: ${written} filas de product_reference actualizadas.`);
}

main()
  .catch(err => { console.error(err); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
