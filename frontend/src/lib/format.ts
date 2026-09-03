/**
 * Formato de moneda argentino: punto para miles, coma para decimales.
 * Vive acá y no en cada pantalla porque un importe escrito distinto en dos
 * lugares del sistema hace dudar del número, no del formato.
 */
const ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `$ 1.250.400,50`. Acepta el string que devuelve Prisma para los Decimal. */
export function money(value: string | number | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (n == null || !Number.isFinite(n)) return '—';
  return ARS.format(n);
}

/** Cantidades: hasta 3 decimales, sin ceros de relleno (`2.866`, `1,5`). */
export function quantity(value: string | number | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('es-AR', { maximumFractionDigits: 3 });
}
