import ExcelJS from 'exceljs';

// Lectura y mapeo de planillas (xlsx / csv) para los importadores. La parte
// específica de cada import (qué columnas, cómo se validan) vive aparte;
// esto es solo "leer la grilla" y "adivinar qué columna es qué".

export function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Convierte "1.997,50" / "1997,50" / "1,997.50" / "$ 1997" a "1997.5". */
export function normalizeNumber(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'number') return String(raw);
  const trimmed = raw.trim().replace(/[$\s]/g, '').replace(/ARS/gi, '');
  if (!trimmed) return '';
  if (/^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(trimmed)) return trimmed.replace(/\./g, '').replace(',', '.');
  if (/^-?\d+,\d+$/.test(trimmed)) return trimmed.replace(',', '.');
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
      } else current += char;
    } else if (char === '"') inQuotes = true;
    else if (char === delimiter) { fields.push(current); current = ''; }
    else current += char;
  }
  fields.push(current);
  return fields;
}

function detectDelimiter(headerLine: string): string {
  const comma = (headerLine.match(/,/g) ?? []).length;
  const semi = (headerLine.match(/;/g) ?? []).length;
  const tab = (headerLine.match(/\t/g) ?? []).length;
  if (tab > comma && tab > semi) return '\t';
  if (semi > comma) return ';';
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

export type Sheet = { headers: string[]; rows: string[][] };

/** Lee la primera hoja. Fila 1 = encabezados; el resto, datos. */
export async function readSheet(buffer: Buffer, filename: string): Promise<Sheet> {
  const isXlsx = /\.xlsx?$/i.test(filename);
  const matrix = isXlsx ? await matrixFromXlsx(buffer) : matrixFromCsv(buffer);
  if (!matrix.length) return { headers: [], rows: [] };
  return { headers: matrix[0].map(h => h.trim()), rows: matrix.slice(1) };
}

export type ImportFieldKind = 'text' | 'number' | 'boolean' | 'enum';
export type ImportField = {
  key: string;
  label: string;
  aliases: string[];
  kind: ImportFieldKind;
  /** Columna por la que se identifica la fila (no editable). */
  matchKey?: boolean;
  /** Obligatoria para crear un registro nuevo. */
  requiredForCreate?: boolean;
  help?: string;
};

/** mapping: campo -> índice de columna (0-based). -1 / ausente = sin mapear. */
export type ColumnMapping = Record<string, number>;

/**
 * Adivina qué columna corresponde a cada campo. Una columna no se asigna a dos
 * campos: gana el primer campo (en orden de la lista) que la reclame.
 */
export function autoMap(headers: string[], fields: ImportField[]): ColumnMapping {
  const norm = headers.map(normalizeHeader);
  const usados = new Set<number>();
  const mapping: ColumnMapping = {};
  for (const field of fields) {
    let hit = -1;
    for (const alias of field.aliases) {
      const idx = norm.indexOf(normalizeHeader(alias));
      if (idx !== -1 && !usados.has(idx)) { hit = idx; break; }
    }
    if (hit !== -1) { usados.add(hit); mapping[field.key] = hit; }
  }
  return mapping;
}

/** El valor de un campo mapeado en una fila (string crudo, ya trim). */
export function cell(row: string[], mapping: ColumnMapping, key: string): string {
  const idx = mapping[key];
  if (idx == null || idx < 0) return '';
  return (row[idx] ?? '').trim();
}
