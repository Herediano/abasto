import { cell, normalizeHeader, normalizeNumber, type ColumnMapping, type ImportField, type Sheet } from './sheet-import.util';

// Importador de productos desde Excel: qué columnas se aceptan, cómo se leen y
// el "plan" (crear / actualizar / error por fila). Aplicarlo lo hace el
// controller, que tiene la máquina de precios y la secuencia de SKU.

export const PRODUCT_IMPORT_FIELDS: ImportField[] = [
  { key: 'barcode', label: 'Código de barras', aliases: ['codigodebarras', 'codbarras', 'codbarra', 'barcode', 'ean', 'ean13'], kind: 'text', matchKey: true },
  { key: 'name', label: 'Nombre', aliases: ['producto', 'nombre', 'descripcion', 'detalle', 'name'], kind: 'text', requiredForCreate: true },
  { key: 'brand', label: 'Marca', aliases: ['marca', 'brand'], kind: 'text' },
  { key: 'category', label: 'Categoría', aliases: ['categoria', 'rubro', 'category'], kind: 'text', help: 'Tiene que existir; no se crean solas.' },
  { key: 'unit', label: 'Unidad de venta', aliases: ['unidaddeventa', 'unidadventa', 'unidadvta', 'unit'], kind: 'enum', help: 'unidad, kg, g, litro, ml, metro, docena' },
  { key: 'isWeighed', label: 'Pesable', aliases: ['pesable', 'sepesa', 'porpeso', 'balanza'], kind: 'boolean', help: 'Sí / No. Si es sí, se vende por kilo.' },
  { key: 'iva', label: 'IVA', aliases: ['iva', 'alicuotaiva', 'ivapercent', 'alicuota'], kind: 'enum', help: '21, 10.5, 27, 0, 2.5, 5, exento, no gravado' },
  { key: 'internalTax', label: 'Impuestos internos %', aliases: ['impuestosinternos', 'impinternos', 'impuestointerno', 'internos', 'iinternos'], kind: 'number', help: 'Alcohol, cigarrillos, bebidas. 0 si no aplica.' },
  { key: 'purchaseUnit', label: 'Unidad de compra (bulto)', aliases: ['unidaddecompra', 'unidadcompra', 'unidadcpra', 'bulto', 'nombrebulto'], kind: 'text', help: 'Caja, pack, pallet… Necesita también "Unidades por bulto".' },
  { key: 'unitsPerPurchase', label: 'Unidades por bulto', aliases: ['unidadesporbulto', 'unidxbulto', 'uxb', 'cantidadporbulto', 'cantxbulto'], kind: 'number' },
  { key: 'packBarcode', label: 'Código de barras del bulto', aliases: ['codigodebarrasdelbulto', 'codigodelbulto', 'codbulto', 'eanbulto', 'barcodebulto'], kind: 'text' },
  { key: 'minStock', label: 'Stock mínimo', aliases: ['stockminimo', 'minimo', 'minstock'], kind: 'number' },
  { key: 'maxStock', label: 'Reponer hasta', aliases: ['reponerhasta', 'stockmaximo', 'maximo', 'maxstock'], kind: 'number' },
  { key: 'costPrice', label: 'Precio de costo', aliases: ['preciodecosto', 'preciocosto', 'costo', 'preciocompra', 'cost'], kind: 'number' },
  { key: 'salePrice', label: 'Precio de venta', aliases: ['preciodeventa', 'precioventa', 'precio', 'pvp', 'saleprice'], kind: 'number' },
  { key: 'manejaVencimiento', label: 'Maneja vencimiento', aliases: ['manejavencimiento', 'vencimiento', 'vence', 'lote'], kind: 'boolean', help: 'Sí / No. Fiambres, lácteos, todo lo que vence.' },
];

const SALE_UNITS = ['unidad', 'kg', 'g', 'litro', 'ml', 'metro', 'docena'];
const UNIT_ALIAS: Record<string, string> = {
  u: 'unidad', un: 'unidad', uni: 'unidad', unidades: 'unidad',
  kilo: 'kg', kilos: 'kg', kilogramo: 'kg', kgs: 'kg',
  gr: 'g', grs: 'g', gramo: 'g', gramos: 'g',
  l: 'litro', lt: 'litro', lts: 'litro', litros: 'litro',
  mililitro: 'ml', mililitros: 'ml', cc: 'ml',
  m: 'metro', mt: 'metro', mts: 'metro', metros: 'metro',
  doc: 'docena', docenas: 'docena',
};
const IVA_RATE: Record<string, number> = { '21': 21, '10.5': 10.5, '27': 27, '0': 0, '2.5': 2.5, '5': 5, exento: 0, no_gravado: 0 };

const INVALID = Symbol('invalid');
type Parsed<T> = T | null | typeof INVALID;

function num(raw: string): Parsed<number> {
  const s = normalizeNumber(raw);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : INVALID;
}
function bool(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (['si', 'sí', 's', 'x', 'true', '1', 'verdadero'].includes(v)) return true;
  if (['no', 'n', 'false', '0', 'falso'].includes(v)) return false;
  return null;
}
function unit(raw: string): Parsed<string> {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  const c = UNIT_ALIAS[v] ?? v;
  return SALE_UNITS.includes(c) ? c : INVALID;
}
function iva(raw: string): Parsed<{ ivaSituacion: string; taxRate: number }> {
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  if (t.includes('exent')) return { ivaSituacion: 'exento', taxRate: 0 };
  if (t.replace(/\s/g, '').includes('nogravad')) return { ivaSituacion: 'no_gravado', taxRate: 0 };
  const n = Number(normalizeNumber(t.replace(/%/g, '').replace(/iva/g, '')));
  if (Number.isFinite(n) && String(n) in IVA_RATE) return { ivaSituacion: String(n), taxRate: n };
  return INVALID;
}

export type ImportedProductFields = {
  name?: string;
  brand?: string;
  categoryId?: string;
  unit?: string;
  isWeighed?: boolean;
  ivaSituacion?: string;
  taxRate?: number;
  internalTaxRate?: number;
  purchaseUnit?: string;
  unitsPerPurchase?: number;
  packBarcode?: string;
  minStock?: number;
  maxStock?: number;
  manejaVencimiento?: boolean;
};

export type PlanRow =
  | { kind: 'create'; rowNumber: number; barcode: string; fields: ImportedProductFields; cost?: number; sale?: number }
  | { kind: 'update'; rowNumber: number; barcode: string; productId: string; fields: ImportedProductFields; cost?: number; sale?: number }
  | { kind: 'error'; rowNumber: number; message: string }
  | { kind: 'skip' };

export function planProductRows(params: {
  sheet: Sheet;
  mapping: ColumnMapping;
  existingByBarcode: Map<string, { id: string }>;
  categoriesByName: Map<string, string>;
  takenBarcodes: Set<string>;
}): PlanRow[] {
  const { sheet, mapping, existingByBarcode, categoriesByName, takenBarcodes } = params;
  const has = (k: string) => mapping[k] != null && mapping[k] >= 0;
  const val = (row: string[], k: string) => cell(row, mapping, k);
  const out: PlanRow[] = [];
  const vistos = new Set<string>();

  sheet.rows.forEach((row, i) => {
    const rowNumber = i + 2; // fila 1 = encabezados
    const barcode = val(row, 'barcode');
    if (!barcode && row.every(c => !c.trim())) { out.push({ kind: 'skip' }); return; }
    if (!barcode) { out.push({ kind: 'error', rowNumber, message: 'Sin código de barras' }); return; }
    if (vistos.has(barcode)) { out.push({ kind: 'error', rowNumber, message: `Código ${barcode} repetido en el archivo` }); return; }
    vistos.add(barcode);

    const existing = existingByBarcode.get(barcode);
    const fields: ImportedProductFields = {};
    let cost: number | undefined;
    let sale: number | undefined;

    const fail = (message: string) => out.push({ kind: 'error', rowNumber, message });

    // Regla general: una celda vacía = "no cambiar ese campo" (para que
    // reimportar un export editado no borre lo que no tocaste).
    if (has('name')) {
      const v = val(row, 'name');
      if (v) fields.name = v;
    }
    if (has('brand')) {
      const v = val(row, 'brand');
      if (v) fields.brand = v;
    }
    if (has('category')) {
      const v = val(row, 'category');
      if (v) {
        const id = categoriesByName.get(normalizeHeader(v));
        if (!id) return fail(`La categoría «${v}» no existe`);
        fields.categoryId = id;
      }
    }
    if (has('unit')) {
      const u = unit(val(row, 'unit'));
      if (u === INVALID) return fail(`Unidad de venta «${val(row, 'unit')}» no válida`);
      if (u) fields.unit = u;
    }
    if (has('isWeighed')) {
      const b = bool(val(row, 'isWeighed'));
      if (b !== null) fields.isWeighed = b;
    }
    if (has('iva')) {
      const r = iva(val(row, 'iva'));
      if (r === INVALID) return fail(`IVA «${val(row, 'iva')}» no válido`);
      if (r) { fields.ivaSituacion = r.ivaSituacion; fields.taxRate = r.taxRate; }
    }
    if (has('internalTax')) {
      const n = num(val(row, 'internalTax'));
      if (n === INVALID) return fail('Impuestos internos no es un número');
      if (n !== null) fields.internalTaxRate = n;
    }
    if (has('purchaseUnit') && val(row, 'purchaseUnit')) {
      const pu = val(row, 'purchaseUnit');
      const upRaw = num(has('unitsPerPurchase') ? val(row, 'unitsPerPurchase') : '');
      if (upRaw === INVALID) return fail('Unidades por bulto no es un número');
      if (!upRaw || upRaw <= 1) return fail(`El bulto «${pu}» tiene que traer más de una unidad (revisá la columna «Unidades por bulto»)`);
      fields.purchaseUnit = pu;
      fields.unitsPerPurchase = upRaw;
    }
    if (has('packBarcode')) {
      const v = val(row, 'packBarcode');
      if (v) {
        if (v === barcode) return fail('El código del bulto no puede ser igual al código principal');
        if (takenBarcodes.has(v)) return fail(`El código del bulto ${v} ya lo usa otro producto`);
        fields.packBarcode = v;
      }
    }
    // Pesable siempre se vende por kilo.
    if (fields.isWeighed === true) fields.unit = 'kg';
    for (const [key, target] of [['minStock', 'minStock'], ['maxStock', 'maxStock']] as const) {
      if (!has(key)) continue;
      const n = num(val(row, key));
      if (n === INVALID) return fail(`${key === 'minStock' ? 'Stock mínimo' : 'Reponer hasta'} no es un número`);
      if (n !== null) fields[target] = n;
    }
    if (has('manejaVencimiento')) {
      const b = bool(val(row, 'manejaVencimiento'));
      if (b !== null) fields.manejaVencimiento = b;
    }
    if (has('costPrice')) {
      const n = num(val(row, 'costPrice'));
      if (n === INVALID) return fail('Precio de costo no es un número');
      if (n !== null) cost = n;
    }
    if (has('salePrice')) {
      const n = num(val(row, 'salePrice'));
      if (n === INVALID) return fail('Precio de venta no es un número');
      if (n !== null && n > 0) sale = n;
    }

    if (existing) {
      out.push({ kind: 'update', rowNumber, barcode, productId: existing.id, fields, cost, sale });
      return;
    }
    // Alta
    if (!fields.name) return fail('Producto nuevo sin nombre');
    if (takenBarcodes.has(barcode)) return fail(`El código ${barcode} ya lo usa otro producto (como código de bulto o alternativo)`);
    out.push({ kind: 'create', rowNumber, barcode, fields, cost, sale });
  });

  return out;
}
