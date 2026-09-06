import ExcelJS from 'exceljs';
import type { Response } from 'express';

export type ExportColumn = {
  header: string;
  key: string;
  width?: number;
  /** Formato de número para Excel, p. ej. '#,##0.00' o 'dd/mm/yyyy'. */
  numFmt?: string;
};

const csvCell = (v: unknown): string => {
  const s = v == null ? '' : v instanceof Date ? v.toLocaleDateString('es-AR') : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Manda un listado como Excel o CSV, con el mismo estilo en todos los módulos.
 * `format` sale del querystring (`?format=csv`); por defecto, xlsx.
 * Ver docs/diseno.md, "Exportar — la salida universal".
 */
export async function sendExport(
  res: Response,
  format: string | undefined,
  filename: string,
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
) {
  if (format === 'csv') {
    const lines = [columns.map(c => csvCell(c.header)).join(';')];
    for (const r of rows) lines.push(columns.map(c => csvCell(r[c.key])).join(';'));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    // BOM para que Excel abra los acentos bien.
    res.send('﻿' + lines.join('\r\n'));
    return;
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Abasto';
  wb.created = new Date();
  const sheet = wb.addWorksheet('Datos', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width ?? 18 }));

  const head = sheet.getRow(1);
  head.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F7355' } }; // verde Yerba
  head.alignment = { vertical: 'middle', horizontal: 'left' };
  head.height = 22;

  for (const r of rows) {
    const row = sheet.addRow(r);
    for (const c of columns) if (c.numFmt) row.getCell(c.key).numFmt = c.numFmt;
    row.font = { name: 'Calibri', size: 11 };
  }

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  for (let i = 2; i <= rows.length + 1; i += 2) {
    sheet.getRow(i).eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  res.send(Buffer.from(buffer));
}
