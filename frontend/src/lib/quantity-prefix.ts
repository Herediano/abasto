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
