/**
 * Carga la tabla global `product_reference` desde un Excel.
 *
 * El archivo debe tener una fila de encabezados con las columnas
 * "Código de barras" (o EAN / Barcode), "Nombre" (o Descripción / Producto) y,
 * opcionalmente, "Marca". Toma la hoja "Nombres" si existe, o la primera.
 *
 *   npm run db:import-reference -- <ruta.xlsx>
 *   npm run db:import-reference -- <ruta.xlsx> --replace   # vacía product_reference antes de cargar
 *   npm run db:import-reference -- <ruta.xlsx> --dry-run   # solo informa, no escribe
 *
 * Es un upsert por EAN: volver a correrlo actualiza nombre y marca sin duplicar
 * y sin tocar `category` de las filas que ya existían.
 *
 * El nombre se carga tal cual viene en el Excel (incluido el sufijo con los
 * últimos dígitos del código de barras, que es parte deseada de la descripción).
 *
 * Para actualizar el catálogo que viene por defecto con el programa (el que usa
 * el seed), agregá `--emit prisma/data/reference-catalog.ndjson` y commiteá ese
 * archivo:
 *
 *   npm run db:import-reference -- <ruta.xlsx> --emit prisma/data/reference-catalog.ndjson
 */
import { writeFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';

const prisma = new PrismaClient();

const HEADERS = {
  ean: ['código de barras', 'codigo de barras', 'ean', 'barcode', 'cod. barras', 'cód. barras'],
  name: ['nombre', 'descripción', 'descripcion', 'producto', 'detalle'],
  brand: ['marca', 'brand'],
};

function findColumn(headerRow: ExcelJS.Row, candidates: string[]): number | null {
  for (let c = 1; c <= headerRow.cellCount; c++) {
    const raw = headerRow.getCell(c).value;
    const text = String(typeof raw === 'object' && raw && 'richText' in raw
      ? (raw.richText as Array<{ text: string }>).map(t => t.text).join('')
      : raw ?? '').trim().toLowerCase();
    if (candidates.includes(text)) return c;
  }
  return null;
}

function cellText(row: ExcelJS.Row, col: number | null): string {
  if (!col) return '';
  const v = row.getCell(col).value;
  if (v == null) return '';
  if (typeof v === 'object' && 'richText' in v) return (v.richText as Array<{ text: string }>).map(t => t.text).join('').trim();
  if (typeof v === 'object' && 'text' in v) return String((v as { text: unknown }).text).trim();
  return String(v).trim();
}

async function main() {
  const args = process.argv.slice(2);
  const positional = args.filter(a => !a.startsWith('--'));
  const emitIdx = args.indexOf('--emit');
  const emitPath = emitIdx !== -1 ? args[emitIdx + 1] : null;
  const file = positional.find(p => p !== emitPath);
  const dryRun = args.includes('--dry-run');
  const replace = args.includes('--replace');
  if (!file) {
    console.error('Falta la ruta del Excel.\n  npm run db:import-reference -- <ruta.xlsx> [--replace] [--dry-run] [--emit <ruta.ndjson>]');
    process.exit(1);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.getWorksheet('Nombres') ?? wb.worksheets[0];
  if (!ws) throw new Error('El archivo no tiene hojas.');

  const header = ws.getRow(1);
  const eanCol = findColumn(header, HEADERS.ean);
  const nameCol = findColumn(header, HEADERS.name);
  const brandCol = findColumn(header, HEADERS.brand);
  if (!eanCol || !nameCol) {
    throw new Error(`No encontré las columnas necesarias. Encabezados vistos: ${JSON.stringify(header.values)}`);
  }
  console.log(`Hoja "${ws.name}" — columnas: EAN=${eanCol}, Nombre=${nameCol}, Marca=${brandCol ?? '(sin columna)'}`);

  const rows: Array<{ ean: string; name: string; brand: string | null }> = [];
  const bad: string[] = [];
  const seen = new Set<string>();
  let dupes = 0;
  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const ean = cellText(row, eanCol).replace(/\s+/g, '');
    const name = cellText(row, nameCol);
    const brand = brandCol ? cellText(row, brandCol) : '';
    if (!ean && !name) continue;
    if (!/^[0-9]{8,14}$/.test(ean)) { bad.push(`fila ${i}: "${ean}"`); continue; }
    if (!name) { bad.push(`fila ${i}: EAN ${ean} sin nombre`); continue; }
    if (seen.has(ean)) { dupes++; continue; }
    seen.add(ean);
    rows.push({ ean, name, brand: brand || null });
  }

  console.log(`Filas válidas: ${rows.length}`);
  if (dupes) console.log(`EAN duplicados en el archivo (se ignoró la repetición): ${dupes}`);
  if (bad.length) console.log(`Filas descartadas: ${bad.length}\n  ${bad.slice(0, 10).join('\n  ')}${bad.length > 10 ? '\n  ...' : ''}`);

  if (emitPath) {
    const sorted = [...rows].sort((a, b) => a.ean.localeCompare(b.ean));
    writeFileSync(emitPath, sorted.map(r => JSON.stringify(r)).join('\n') + '\n');
    console.log(`Escrito ${emitPath} (${sorted.length} filas). Commiteá ese archivo para que el seed lo use.`);
  }

  if (dryRun) {
    console.log('\n--dry-run: no se escribió nada. Ejemplos:');
    rows.slice(0, 5).forEach(r => console.log(' ', JSON.stringify(r)));
    return;
  }

  if (replace) {
    const { count } = await prisma.productReference.deleteMany({});
    console.log(`--replace: se borraron ${count} filas previas.`);
  }

  let written = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    await prisma.$transaction(
      batch.map(r =>
        prisma.productReference.upsert({
          where: { ean: r.ean },
          create: { ean: r.ean, name: r.name, brand: r.brand, source: 'xlsx' },
          update: { name: r.name, brand: r.brand },
        }),
      ),
    );
    written += batch.length;
    process.stdout.write(`\r  ${written}/${rows.length}`);
  }
  process.stdout.write('\n');

  const total = await prisma.productReference.count();
  console.log(`Listo. product_reference ahora tiene ${total} filas.`);
}

main()
  .catch(err => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
