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
  value: string;
  hint: string;
  tone?: 'up' | 'down' | 'warn' | 'hot';
  /** Puntito de aviso arriba a la derecha. */
  flag?: 'warn' | 'hot';
};

const compact = (n: number) => {
  if (n >= 1_000_000) return `$ ${(n / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 2 })} M`;
  if (n >= 10_000) return `$ ${Math.round(n / 1000).toLocaleString('es-AR')} k`;
  return money(n).replace(',00', '');
};
const plural = (n: number, sing: string, plu: string) => `${n} ${n === 1 ? sing : plu}`;

/** El dato clave y la línea de contexto de una tarjeta, según el módulo. */
export function statFor(key: string, s: EscritorioSummary): TileStat | null {
  switch (key) {
    case 'ventas': {
      if (!s.ventas) return null;
      const { hoy, tickets, ayer } = s.ventas;
      const dp = ayer > 0 ? ((hoy - ayer) / ayer) * 100 : null;
      const delta =
        dp == null ? '' : `${dp >= 0 ? '▲' : '▼'} ${Math.abs(dp).toLocaleString('es-AR', { maximumFractionDigits: 1 })} % vs ayer · `;
      return {
        value: compact(hoy),
        hint: `${delta}${plural(tickets, 'ticket', 'tickets')} hoy`,
        tone: dp == null ? undefined : dp >= 0 ? 'up' : 'down',
      };
    }
    case 'caja': {
      if (!s.caja) return null;
      if (!s.caja.abierta) return { value: 'Cerrada', hint: 'sin turno abierto' };
      return {
        value: 'Abierta',
        hint: `${s.caja.efectivo != null ? money(s.caja.efectivo).replace(',00', '') + ' · ' : ''}${s.caja.registro ?? ''}`,
      };
    }
    case 'turnos':
      return s.turnos ? { value: plural(s.turnos.abiertos, 'turno abierto', 'turnos abiertos'), hint: 'aperturas, cierres y arqueos' } : null;
    case 'stock': {
      if (!s.stock) return null;
      if (s.stock.bajoMinimo === 0) return { value: 'Al día', hint: 'todo sobre el mínimo', tone: 'up' };
      return {
        value: plural(s.stock.bajoMinimo, 'bajo mínimo', 'bajo mínimo'),
        hint: s.stock.ejemplos.join(', '),
        tone: 'hot',
        flag: 'hot',
      };
    }
    case 'reposicion': {
      if (!s.reposicion) return null;
      if (s.reposicion.productos === 0) return { value: 'Nada urgente', hint: 'no hay faltantes que pedir', tone: 'up' };
      return { value: `${s.reposicion.productos}`, hint: 'productos para pedir', tone: 'warn', flag: 'warn' };
    }
    case 'vencimientos': {
      if (!s.vencimientos) return null;
      if (s.vencimientos.lotes === 0) return { value: '0 lotes', hint: 'nada vence en 14 días', tone: 'up' };
      return {
        value: plural(s.vencimientos.lotes, 'lote', 'lotes'),
        hint: `vence${s.vencimientos.lotes === 1 ? '' : 'n'} en ≤ ${s.vencimientos.dias ?? 14} día${s.vencimientos.dias === 1 ? '' : 's'} · ${s.vencimientos.ejemplos[0] ?? ''}`,
        tone: 'warn',
        flag: 'warn',
      };
    }
    case 'compras': {
      if (!s.compras) return null;
      if (s.compras.sinCargar === 0) return { value: 'Todo cargado', hint: 'sin facturas pendientes', tone: 'up' };
      return {
        value: plural(s.compras.sinCargar, 'sin cargar', 'sin cargar'),
        hint: s.compras.proveedores.join(', '),
        tone: 'warn',
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
      if (s.precios.pendientes === 0) return { value: 'Sin pendientes', hint: 'costos trasladados a precio', tone: 'up' };
      return { value: `${s.precios.pendientes}`, hint: 'con costo nuevo sin trasladar', tone: 'warn', flag: 'warn' };
    }
    case 'clientes': {
      // La cuenta corriente es lo accionable; si no hay saldo en la calle, el
      // conteo de clientes.
      if (s.cuentacorriente && s.cuentacorriente.enLaCalle > 0) {
        const { enLaCalle, vencidos } = s.cuentacorriente;
        return {
          value: compact(enLaCalle),
          hint: `en la calle · ${vencidos === 0 ? 'nadie vencido' : plural(vencidos, 'cliente vencido', 'clientes vencidos')}`,
          tone: vencidos > 0 ? 'hot' : undefined,
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
