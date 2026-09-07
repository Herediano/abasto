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

/**
 * Fechas, en un solo lugar. En Argentina se lee `dd/mm/aaaa`. El backend manda
 * dos cosas distintas y hay que tratarlas distinto:
 *  - un **timestamp** con hora (`2026-09-15T18:30:00.000Z`) → se pasa a hora local.
 *  - una **fecha sola** (`2026-09-15`, vencimiento, vigencia) → se muestra tal
 *    cual. `new Date('2026-09-15')` la interpreta como UTC y en AR (-3) se corre
 *    al día anterior; por eso se arma a mano en hora local.
 */
function toDate(value: string | number | Date): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = value.trim();
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (soloFecha) return new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const esD: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
const esT: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

/** `15/09/2026`. Para una fecha sola o para la parte de fecha de un timestamp. */
export function fecha(value: string | number | Date | null | undefined): string {
  if (value == null || value === '') return '—';
  const d = toDate(value);
  return d ? d.toLocaleDateString('es-AR', esD) : '—';
}

/**
 * `15/09/2026 18:30`. Para timestamps (ventas, movimientos, arqueos). Si lo que
 * llega es una fecha sola, sale sin hora — no había hora que mostrar.
 */
export function fechaHora(value: string | number | Date | null | undefined): string {
  if (value == null || value === '') return '—';
  const soloFecha = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
  const d = toDate(value);
  if (!d) return '—';
  if (soloFecha) return d.toLocaleDateString('es-AR', esD);
  return `${d.toLocaleDateString('es-AR', esD)} ${d.toLocaleTimeString('es-AR', esT)}`;
}

/** `18:30`. Solo la hora local de un timestamp. */
export function hora(value: string | number | Date | null | undefined): string {
  if (value == null || value === '') return '—';
  const d = toDate(value);
  return d ? d.toLocaleTimeString('es-AR', esT) : '—';
}

/** `2026-09-15` en hora local, para el `value` de un `<input type="date">`. */
export function inputDate(value: string | number | Date | null | undefined = new Date()): string {
  const d = value == null || value === '' ? new Date() : toDate(value);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
