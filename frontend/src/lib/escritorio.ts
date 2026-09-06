import { money } from './format';

/** Respuesta de GET /api/escritorio — cada bloque puede faltar (el rango no lo ve). */
export type EscritorioSummary = {
  ventas?: { hoy: number; tickets: number; ayer: number; semanaPasada: number };
  caja?: { abierta: boolean; efectivo: number | null; desde: string | null; cajero: string | null; registro: string | null };
  turnos?: { abiertos: number };
  stock?: { bajoMinimo: number; ejemplos: string[] };
  reposicion?: { productos: number };
  vencimientos?: { lotes: number; dias: number | null; ejemplos: string[] };
  compras?: { sinCargar: number; proveedores: string[] };
  proveedores?: { activos: number };
  productos?: { activos: number; sinCategoria: number; sinPrecio: number };
  precios?: { pendientes: number };
  clientes?: { total: number };
  cuentacorriente?: { enLaCalle: number; vencidos: number };
};

export type TileStat = {
  /** El dato clave, grande. */
  value: string;
  /** El renglón de contexto: una sola línea, en minúscula (el escritorio le pone
   *  la mayúscula inicial). Todas las tarjetas lo muestran con la misma fuente,
   *  tamaño y lugar. */
  hint: string;
  /** Puntito de aviso arriba a la derecha. */
  flag?: 'warn' | 'hot';
};

const compact = (n: number) => {
  if (n >= 1_000_000) return `$ ${(n / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 2 })} M`;
  if (n >= 10_000) return `$ ${Math.round(n / 1000).toLocaleString('es-AR')} k`;
  return money(n).replace(',00', '');
};
const plural = (n: number, sing: string, plu: string) => `${n} ${n === 1 ? sing : plu}`;
/** Nombres de producto en minúscula para el renglón de contexto (vienen en mayúscula del catálogo). */
const lc = (s: string) => s.toLocaleLowerCase('es-AR');
const ejemplos = (xs: string[], max = 2) => xs.slice(0, max).map(lc).join(', ');

/** El dato clave y la línea de contexto de una tarjeta, según el módulo. */
export function statFor(key: string, s: EscritorioSummary): TileStat | null {
  switch (key) {
    case 'ventas': {
      if (!s.ventas) return null;
      const { hoy, tickets, ayer } = s.ventas;
      const dp = ayer > 0 ? ((hoy - ayer) / ayer) * 100 : null;
      const delta = dp == null ? '' : `${dp >= 0 ? '+' : '−'}${Math.abs(dp).toLocaleString('es-AR', { maximumFractionDigits: 1 })} % vs ayer · `;
      return { value: compact(hoy), hint: `${delta}${plural(tickets, 'ticket', 'tickets')} hoy` };
    }
    case 'caja': {
      if (!s.caja) return null;
      if (!s.caja.abierta) return { value: 'Cerrada', hint: 'sin turno abierto' };
      return {
        value: 'Abierta',
        hint: `${s.caja.efectivo != null ? money(s.caja.efectivo).replace(',00', '') + ' · ' : ''}${lc(s.caja.registro ?? 'en mostrador')}`,
      };
    }
    case 'turnos':
      return s.turnos ? { value: plural(s.turnos.abiertos, 'turno abierto', 'turnos abiertos'), hint: 'aperturas, cierres y arqueos' } : null;
    case 'stock': {
      if (!s.stock) return null;
      if (s.stock.bajoMinimo === 0) return { value: 'Al día', hint: 'todo por encima del mínimo' };
      return {
        value: plural(s.stock.bajoMinimo, 'bajo mínimo', 'bajo mínimo'),
        hint: ejemplos(s.stock.ejemplos) || 'productos por reponer',
        flag: 'hot',
      };
    }
    case 'reposicion': {
      if (!s.reposicion) return null;
      if (s.reposicion.productos === 0) return { value: 'Nada urgente', hint: 'no hay faltantes que pedir' };
      return { value: `${s.reposicion.productos}`, hint: 'productos para pedir', flag: 'warn' };
    }
    case 'vencimientos': {
      if (!s.vencimientos) return null;
      if (s.vencimientos.lotes === 0) return { value: '0 lotes', hint: 'nada vence en 14 días' };
      const dias = s.vencimientos.dias ?? 14;
      const ej = ejemplos(s.vencimientos.ejemplos, 1);
      return {
        value: plural(s.vencimientos.lotes, 'lote', 'lotes'),
        hint: `${s.vencimientos.lotes === 1 ? 'vence' : 'vencen'} en ≤ ${dias} día${dias === 1 ? '' : 's'}${ej ? ` · ${ej}` : ''}`,
        flag: 'warn',
      };
    }
    case 'compras': {
      if (!s.compras) return null;
      if (s.compras.sinCargar === 0) return { value: 'Todo cargado', hint: 'sin facturas pendientes' };
      return {
        value: plural(s.compras.sinCargar, 'sin cargar', 'sin cargar'),
        hint: ejemplos(s.compras.proveedores) || 'facturas por cargar',
        flag: 'warn',
      };
    }
    case 'proveedores':
      return s.proveedores ? { value: `${s.proveedores.activos}`, hint: 'proveedores activos' } : null;
    case 'productos':
      return s.productos
        ? {
            value: s.productos.activos.toLocaleString('es-AR'),
            hint: `activos · ${s.productos.sinCategoria} sin categoría · ${s.productos.sinPrecio} sin precio`,
          }
        : null;
    case 'precios': {
      if (!s.precios) return null;
      if (s.precios.pendientes === 0) return { value: 'Sin pendientes', hint: 'costos trasladados a precio' };
      return { value: `${s.precios.pendientes}`, hint: 'con costo nuevo sin trasladar', flag: 'warn' };
    }
    case 'clientes': {
      // La cuenta corriente es lo accionable; si no hay saldo en la calle, el
      // conteo de clientes.
      if (s.cuentacorriente && s.cuentacorriente.enLaCalle > 0) {
        const { enLaCalle, vencidos } = s.cuentacorriente;
        return {
          value: compact(enLaCalle),
          hint: `en la calle · ${vencidos === 0 ? 'nadie vencido' : plural(vencidos, 'cliente vencido', 'clientes vencidos')}`,
          flag: vencidos > 0 ? 'hot' : undefined,
        };
      }
      return s.clientes ? { value: s.clientes.total.toLocaleString('es-AR'), hint: 'clientes registrados' } : null;
    }
    default:
      return null;
  }
}

/** Cuántas cosas hay "para mirar" — alimenta el resumen de arriba del escritorio. */
export function pendientes(s: EscritorioSummary): string[] {
  const out: string[] = [];
  if (s.stock && s.stock.bajoMinimo > 0) out.push(`${plural(s.stock.bajoMinimo, 'producto bajo mínimo', 'productos bajo mínimo')}`);
  if (s.vencimientos && s.vencimientos.lotes > 0) out.push(`${plural(s.vencimientos.lotes, 'lote por vencer', 'lotes por vencer')}`);
  if (s.compras && s.compras.sinCargar > 0) out.push(`${plural(s.compras.sinCargar, 'factura sin cargar', 'facturas sin cargar')}`);
  if (s.precios && s.precios.pendientes > 0) out.push(`${s.precios.pendientes} precios pendientes`);
  if (s.cuentacorriente && s.cuentacorriente.vencidos > 0)
    out.push(`${plural(s.cuentacorriente.vencidos, 'cuenta vencida', 'cuentas vencidas')}`);
  return out;
}
