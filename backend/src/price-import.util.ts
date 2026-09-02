import ExcelJS from 'exceljs';

const BARCODE_ALIASES = ['codigodebarras', 'codigobarras', 'codbarras', 'codbarra', 'codigoean', 'eancode', 'codbar', 'barcode', 'ean', 'ean13', 'codigo', 'cod'];
const COST_ALIASES = ['preciodecosto', 'preciocosto', 'costprice', 'preciocompra', 'pcompra', 'costo', 'cost'];
const SALE_ALIASES = ['preciodeventa', 'precioventa', 'precioalpublico', 'preciopublico', 'preciofinal', 'saleprice', 'pvp', 'precio', 'price'];

export type ParsedPriceRow = { barcode: string; costPrice: string; salePrice: string };
export type ParsePricesResult = { rows: ParsedPriceRow[]; matchedColumns: { barcode: string | null; costPrice: string | null; salePrice: string | null } };

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function findColumn(headers: string[], aliases: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

export function normalizeNumber(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'number') return String(raw);
  let trimmed = raw.trim().replace(/[$\s]/g, '').replace(/ARS/gi, '');
  if (!trimmed) return '';
  // Formato argentino/europeo: "1.997,50" (punto miles, coma decimal)
  if (/^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(trimmed)) return trimmed.replace(/\./g, '').replace(',', '.');
  // Solo coma decimal: "1997,50"
  if (/^-?\d+,\d+$/.test(trimmed)) return trimmed.replace(',', '.');
  // Formato US con miles: "1,997.50"
  if (/^-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(trimmed)) return trimmed.replace(/,/g, '');
  return trimmed;
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; } else { inQuotes = false; }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

function detectDelimiter(headerLine: string): string {
  const commaCount = (headerLine.match(/,/g) ?? []).length;
  const semicolonCount = (headerLine.match(/;/g) ?? []).length;
  const tabCount = (headerLine.match(/\t/g) ?? []).length;
  if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
  if (semicolonCount > commaCount) return ';';
  return ',';
}

function matrixFromCsv(buffer: Buffer): string[][] {
  const text = buffer.toString('utf-8').replace(/^﻿/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const delimiter = detectDelimiter(lines[0]);
  return lines.map(line => splitCsvLine(line, delimiter));
}

async function matrixFromXlsx(buffer: Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const matrix: string[][] = [];
  sheet.eachRow(row => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, cell => {
      const v = cell.value as unknown;
      if (v === null || v === undefined) cells.push('');
      else if (typeof v === 'object' && v !== null && 'text' in (v as Record<string, unknown>)) cells.push(String((v as { text: unknown }).text));
      else if (typeof v === 'object' && v !== null && 'result' in (v as Record<string, unknown>)) cells.push(String((v as { result: unknown }).result ?? ''));
      else cells.push(String(v));
    });
    matrix.push(cells);
  });
  return matrix;
}

export async function parsePricesFile(buffer: Buffer, filename: string): Promise<ParsePricesResult> {
  const isXlsx = /\.xlsx?$/i.test(filename);
  const matrix = isXlsx ? await matrixFromXlsx(buffer) : matrixFromCsv(buffer);
  if (!matrix.length) return { rows: [], matchedColumns: { barcode: null, costPrice: null, salePrice: null } };

  const headers = matrix[0];
  const barcodeIdx = findColumn(headers, BARCODE_ALIASES);
  const costIdx = findColumn(headers, COST_ALIASES);
  let saleIdx = findColumn(headers, SALE_ALIASES);
  if (saleIdx !== -1 && saleIdx === costIdx) saleIdx = -1;

  if (barcodeIdx === -1) return { rows: [], matchedColumns: { barcode: null, costPrice: costIdx === -1 ? null : headers[costIdx], salePrice: saleIdx === -1 ? null : headers[saleIdx] } };

  const rows: ParsedPriceRow[] = matrix
    .slice(1)
    .map(fields => ({
      barcode: (fields[barcodeIdx] ?? '').trim(),
      costPrice: normalizeNumber(costIdx === -1 ? '' : fields[costIdx]),
      salePrice: normalizeNumber(saleIdx === -1 ? '' : fields[saleIdx]),
    }))
    .filter(r => r.barcode);

  return {
    rows,
    matchedColumns: {
      barcode: headers[barcodeIdx],
      costPrice: costIdx === -1 ? null : headers[costIdx],
      salePrice: saleIdx === -1 ? null : headers[saleIdx],
    },
  };
}
