/**
 * Código de balanza: prefijo 2 (rango 20-29, convención argentina) + 5 dígitos
 * del SKU del producto + 5 dígitos de peso en gramos + dígito verificador, 13 en
 * total. No es el barcode del producto — lo arma la balanza al pesar, y hay que
 * resolverlo antes de buscar por código.
 */
export function parseWeighedBarcode(code: string): { sku: string; weightKg: number } | null {
  const limpio = code.trim();
  if (!/^2\d{12}$/.test(limpio)) return null;
  const sku = limpio.slice(1, 6).replace(/^0+/, '') || '0';
  const weightGrams = Number(limpio.slice(6, 11));
  if (!Number.isFinite(weightGrams) || weightGrams <= 0) return null;
  return { sku, weightKg: Math.round(weightGrams) / 1000 };
}
