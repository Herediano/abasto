import { normalizeHeader, normalizeNumber, readSheet } from './sheet-import.util';

export { normalizeNumber };

const BARCODE_ALIASES = ['codigodebarras', 'codigobarras', 'codbarras', 'codbarra', 'codigoean', 'eancode', 'codbar', 'barcode', 'ean', 'ean13', 'codigo', 'cod'];
const COST_ALIASES = ['preciodecosto', 'preciocosto', 'costprice', 'preciocompra', 'pcompra', 'costo', 'cost'];
const SALE_ALIASES = ['preciodeventa', 'precioventa', 'precioalpublico', 'preciopublico', 'preciofinal', 'saleprice', 'pvp', 'precio', 'price'];
// "nombreactual" queda afuera a proposito: en la planilla de renombrado es la
// columna del nombre viejo, no la que hay que aplicar.
const NAME_ALIASES = ['nombrenuevo', 'nuevonombre', 'nombreproducto', 'descripcion', 'detalle', 'producto', 'nombre', 'name', 'description'];

export type ParsedPriceRow = { barcode: string; costPrice: string; salePrice: string; name: string };
export type ParsePricesResult = {
  rows: ParsedPriceRow[];
  matchedColumns: { barcode: string | null; costPrice: string | null; salePrice: string | null; name: string | null };
};

function findColumn(headers: string[], aliases: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

export async function parsePricesFile(buffer: Buffer, filename: string): Promise<ParsePricesResult> {
  const { headers, rows: matrix } = await readSheet(buffer, filename);
  if (!headers.length) return { rows: [], matchedColumns: { barcode: null, costPrice: null, salePrice: null, name: null } };

  const barcodeIdx = findColumn(headers, BARCODE_ALIASES);
  const costIdx = findColumn(headers, COST_ALIASES);
  let saleIdx = findColumn(headers, SALE_ALIASES);
  if (saleIdx !== -1 && saleIdx === costIdx) saleIdx = -1;
  let nameIdx = findColumn(headers, NAME_ALIASES);
  if (nameIdx !== -1 && (nameIdx === costIdx || nameIdx === saleIdx || nameIdx === barcodeIdx)) nameIdx = -1;

  const columns = {
    barcode: barcodeIdx === -1 ? null : headers[barcodeIdx],
    costPrice: costIdx === -1 ? null : headers[costIdx],
    salePrice: saleIdx === -1 ? null : headers[saleIdx],
    name: nameIdx === -1 ? null : headers[nameIdx],
  };
  if (barcodeIdx === -1) return { rows: [], matchedColumns: columns };

  const rows: ParsedPriceRow[] = matrix
    .map(fields => ({
      barcode: (fields[barcodeIdx] ?? '').trim(),
      costPrice: normalizeNumber(costIdx === -1 ? '' : fields[costIdx]),
      salePrice: normalizeNumber(saleIdx === -1 ? '' : fields[saleIdx]),
      name: nameIdx === -1 ? '' : (fields[nameIdx] ?? '').trim(),
    }))
    .filter(r => r.barcode);

  return { rows, matchedColumns: columns };
}
