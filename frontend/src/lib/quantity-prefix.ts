/**
 * "5*7790000000001" o "5x7790000000001": cargar varias unidades de un
 * producto sin escanearlo una vez por unidad. `*` y `x`/`X` son la misma
 * tecla en la práctica (la caja registradora de toda la vida usa `*`).
 */
export function parseQuantityPrefix(input: string): { quantity: number; barcode: string } | null {
  const m = input.trim().match(/^(\d+(?:[.,]\d+)?)\s*[x*]\s*(\S+)$/i);
  if (!m) return null;
  const quantity = Number(m[1].replace(',', '.'));
  const barcode = m[2];
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  return { quantity, barcode };
}

/**
 * "5x" sin código todavía: el cajero tipeó la cantidad pero va a elegir el
 * producto con F3 en vez de terminar de escribir/escanear el código. Sin
 * esto, F3 agregaba 1 unidad nomás e ignoraba en silencio lo que ya había
 * tipeado — el 5x tiene que valer también cuando se completa por búsqueda.
 */
export function parsePendingQuantity(input: string): number | null {
  const m = input.trim().match(/^(\d+(?:[.,]\d+)?)\s*[x*]$/i);
  if (!m) return null;
  const quantity = Number(m[1].replace(',', '.'));
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
}
