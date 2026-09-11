import { cell, normalizeNumber, type ColumnMapping, type ImportField, type Sheet } from './sheet-import.util';

/**
 * Importador de precios: sólo costo y venta sobre productos que **ya existen**,
 * matcheando por código de barras. No crea nada — para eso está el importador de
 * Productos, que cubre todos los campos.
 *
 * Usa el mismo contrato de 3 fases que el de productos (`inspect` → `preview` →
 * `apply`) para poder compartir el wizard del frontend. Antes tenía su propio
 * diálogo que adivinaba las columnas y aplicaba de una, sin previa: si el
 * archivo traía la columna equivocada, te enterabas después de escribir.
 */
export const PRICE_IMPORT_FIELDS: ImportField[] = [
  {
    key: 'barcode',
    label: 'Código de barras',
    aliases: ['codigodebarras', 'codigobarras', 'barcode', 'ean', 'ean13', 'codigo', 'cod'],
    kind: 'text',
    matchKey: true,
    help: 'Con esto se busca el producto. Los códigos que no estén en el catálogo se informan y no se tocan.',
  },
  {
    key: 'costPrice',
    label: 'Precio de costo',
    aliases: ['preciodecosto', 'preciocosto', 'costprice', 'preciocompra', 'pcompra', 'costo', 'cost'],
    kind: 'number',
  },
  {
    key: 'salePrice',
    label: 'Precio de venta',
    aliases: ['preciodeventa', 'precioventa', 'saleprice', 'precio', 'pventa', 'venta', 'plista', 'preciolista'],
    kind: 'number',
  },
  {
    key: 'name',
    label: 'Nombre nuevo',
    aliases: ['nombrenuevo', 'nombre', 'producto', 'descripcion', 'detalle'],
    kind: 'text',
    help: 'Opcional. El nombre se actualiza sólo si mapeás esta columna: un archivo de precios no debe reescribir el catálogo por accidente.',
  },
  {
    key: 'tier3Price',
    label: 'Precio por 3 o más',
    aliases: ['preciox3', 'precio3', 'preciopor3', 'tier3'],
    kind: 'number',
    help: 'Opcional. Sin mapear, el producto queda con precio único. Rige a partir de 3 unidades en la misma venta.',
  },
  {
    key: 'tier6Price',
    label: 'Precio por 6 o más',
    aliases: ['preciox6', 'precio6', 'preciopor6', 'tier6', 'preciomediadocena'],
    kind: 'number',
    help: 'Opcional, independiente del anterior. Rige a partir de 6 unidades.',
  },
  {
    key: 'tier12Price',
    label: 'Precio por 12 o más',
    aliases: ['preciox12', 'precio12', 'preciopor12', 'tier12', 'preciodocena'],
    kind: 'number',
    help: 'Opcional, independiente de los anteriores. Rige a partir de 12 unidades.',
  },
];

/** Los tres escalones fijos que entiende el import: unidad, media docena, docena. */
export const TIER_IMPORT_STEPS: Array<{ field: 'tier3Price' | 'tier6Price' | 'tier12Price'; minQty: number }> = [
  { field: 'tier3Price', minQty: 3 },
  { field: 'tier6Price', minQty: 6 },
  { field: 'tier12Price', minQty: 12 },
];

/** Lo que ya hay cargado para un producto, para saber si la fila cambia algo. */
export type PrecioActual = {
  id: string; name: string; cost: number | null; sale: number | null;
  /** Escalas ya cargadas en la lista base, por cantidad mínima. */
  tiers?: Map<number, number>;
};

export type TierUpdate = { minQty: number; price: number };

export type PricePlanRow =
  | { kind: 'update'; rowNumber: number; barcode: string; productId: string; cost?: number; sale?: number; name?: string; tiers?: TierUpdate[] }
  | { kind: 'skip'; rowNumber: number; barcode: string; reason: string }
  | { kind: 'error'; rowNumber: number; barcode: string; message: string };

function numero(raw: string): number | null | 'invalido' {
  const limpio = normalizeNumber(raw);
  if (!limpio) return null;
  const n = Number(limpio);
  if (!Number.isFinite(n) || n < 0) return 'invalido';
  return n;
}

/**
 * Plan de lo que haría el archivo, sin tocar nada. Una fila sólo entra como
 * `update` si cambia algo de verdad, así la previa no promete trabajo que no va
 * a pasar.
 */
export function planPriceRows(params: {
  sheet: Sheet;
  mapping: ColumnMapping;
  existingByBarcode: Map<string, PrecioActual>;
}): PricePlanRow[] {
  const { sheet, mapping, existingByBarcode } = params;
  const mapeado = (k: string) => mapping[k] != null && mapping[k] >= 0;
  const tocaNombre = mapeado('name');
  const salida: PricePlanRow[] = [];
  const vistos = new Set<string>();

  sheet.rows.forEach((row, i) => {
    // +2: la fila 1 es el encabezado y las planillas se numeran desde 1.
    const rowNumber = i + 2;
    if (!row.some(c => c.trim())) return;

    const barcode = cell(row, mapping, 'barcode');
    if (!barcode) {
      salida.push({ kind: 'error', rowNumber, barcode: '', message: 'Falta el código de barras' });
      return;
    }
    if (vistos.has(barcode)) {
      salida.push({ kind: 'skip', rowNumber, barcode, reason: 'repetido en el archivo' });
      return;
    }
    vistos.add(barcode);

    const actual = existingByBarcode.get(barcode);
    if (!actual) {
      salida.push({ kind: 'skip', rowNumber, barcode, reason: 'no está en el catálogo' });
      return;
    }

    const costo = numero(cell(row, mapping, 'costPrice'));
    if (costo === 'invalido') {
      salida.push({ kind: 'error', rowNumber, barcode, message: 'El precio de costo no es un número válido' });
      return;
    }
    const venta = numero(cell(row, mapping, 'salePrice'));
    if (venta === 'invalido') {
      salida.push({ kind: 'error', rowNumber, barcode, message: 'El precio de venta no es un número válido' });
      return;
    }

    const nombre = tocaNombre ? cell(row, mapping, 'name') : '';
    // Celda vacía = no cambiar ese campo, igual que en el importador de productos.
    const fila: PricePlanRow = { kind: 'update', rowNumber, barcode, productId: actual.id };
    if (costo !== null && costo !== actual.cost) fila.cost = costo;
    if (venta !== null && venta !== actual.sale) fila.sale = venta;
    if (nombre && nombre !== actual.name) fila.name = nombre;

    const tiers: TierUpdate[] = [];
    for (const paso of TIER_IMPORT_STEPS) {
      const precio = numero(cell(row, mapping, paso.field));
      if (precio === 'invalido') {
        salida.push({ kind: 'error', rowNumber, barcode, message: `El precio por ${paso.minQty} o más no es un número válido` });
        return;
      }
      if (precio === null) continue;
      if (actual.tiers?.get(paso.minQty) !== precio) tiers.push({ minQty: paso.minQty, price: precio });
    }
    if (tiers.length) fila.tiers = tiers;

    if (fila.cost === undefined && fila.sale === undefined && fila.name === undefined && !fila.tiers) {
      salida.push({ kind: 'skip', rowNumber, barcode, reason: 'sin cambios' });
      return;
    }
    salida.push(fila);
  });

  return salida;
}
