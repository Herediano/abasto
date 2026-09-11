import { money } from './format';

/** Respuesta de GET /api/escritorio — cada bloque puede faltar (el rango no lo ve). */
export type EscritorioSummary = {
  ventas?: { hoy: number; tickets: number; ayer: number; semanaPasada: number; serie?: { dia: string; total: number; tickets: number }[] };
  caja?: { abierta: boolean; efectivo: number | null; tickets: number | null; desde: string | null; cajero: string | null; registro: string | null };
  turnos?: { abiertos: number };
  stock?: { bajoMinimo: number; ejemplos: string[] };
  reposicion?: { productos: number };
  vencimientos?: { lotes: number; dias: number | null; ejemplos: string[] };
  compras?: { sinCargar: number; proveedores: string[] };
  proveedores?: { activos: number };
  productos?: { activos: number; sinCategoria: number; sinPrecio: number };
  precios?: { pendientes: number };
  clientes?: { total: number };
  cuentacorriente?: { enLaCalle: number; vencidos: number; ejemplos?: { nombre: string; saldo: number; vencido: boolean }[] };
};

/** Fila de detalle de una tarjeta protagonista (nombre + monto de paso). */
export type TileRow = {
  label: string;
  value?: string;
  tone?: 'warn' | 'hot';
};

/** Barra de la minimapa de tendencia de una tarjeta protagonista. */
export type TileBar = {
  label: string;
  value: number;
  hoy?: boolean;
};

export type TileStat = {
  /** El dato clave, grande. Siempre lo mismo: un número (con unidad corta) o
   *  una palabra de estado. Monocromo —el color no describe estado acá, el
   *  puntito lo hace. */
  value: string;
  /** El renglón de contexto: una sola línea corta y en minúscula (la tarjeta
   *  pone la mayúscula inicial). Lleva UN dato útil que el value no cuenta
   *  (ejemplos, tendencia, plazos). Gris, uniforme, sin tintes: la consistencia
   *  está en que todas las tarjetas hablan igual. */
  hint: string;
  /** Puntito de aviso arriba a la derecha. */
  flag?: 'warn' | 'hot';
  /** Encabezado del bloque de filas de la tarjeta protagonista. Reemplaza el
   *  hint cuando hay filas (los nombres van abajo, no repetidos arriba). */
  caption?: string;
  /** Minimapa de tendencia (ej. los últimos 7 días de Ventas). */
  bars?: TileBar[];
  /** Filas de detalle — quiénes/cuáles, con monto de paso. */
  rows?: TileRow[];
};

export const compact = (n: number) => {
  if (n >= 1_000_000) return `$ ${(n / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 2 })} M`;
  if (n >= 10_000) return `$ ${Math.round(n / 1000).toLocaleString('es-AR')} k`;
  return money(n).replace(',00', '');
};
const plural = (n: number, sing: string, plu: string) => `${n} ${n === 1 ? sing : plu}`;
/** Nombres de producto en minúscula para el renglón de contexto (vienen en mayúscula del catálogo). */
const lc = (s: string) => s.toLocaleLowerCase('es-AR');
const ejemplos = (xs: string[], max = 2) => xs.slice(0, max).map(lc).join(', ');

const DIA_INI = ['d', 'l', 'm', 'm', 'j', 'v', 's'] as const;
/** Los últimos 7 días (el último es hoy) como barras de tendencia. Los días sin
 *  ventas entran como cero; la serie del backend solo trae los días con datos. */
function serieBars(serie?: { dia: string; total: number }[]): TileBar[] | undefined {
  if (!serie || serie.length === 0) return undefined;
  const porDia = new Map(serie.map(s => [s.dia.slice(0, 10), s.total]));
  const bars: TileBar[] = [];
  for (let atras = 6; atras >= 0; atras--) {
    const d = new Date();
    d.setDate(d.getDate() - atras);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    bars.push({ label: DIA_INI[d.getDay()], value: porDia.get(iso) ?? 0, hoy: atras === 0 });
  }
  return bars;
}

/** El dato clave y la línea de contexto de una tarjeta, según el módulo.
 *  Regla: `value` = número o estado; `hint` = una línea de dato útil, gris. */
export function statFor(key: string, s: EscritorioSummary): TileStat | null {
  switch (key) {
    case 'ventas': {
      if (!s.ventas) return null;
      const { hoy, tickets, ayer } = s.ventas;
      const dp = ayer > 0 ? ((hoy - ayer) / ayer) * 100 : null;
      const delta = dp == null ? '' : `${dp >= 0 ? '+' : '−'}${Math.abs(dp).toLocaleString('es-AR', { maximumFractionDigits: 1 })} % que ayer · `;
      return { value: compact(hoy), hint: `${delta}${plural(tickets, 'ticket', 'tickets')} vendidos`, bars: serieBars(s.ventas.serie) };
    }
    case 'caja': {
      if (!s.caja) return null;
      if (!s.caja.abierta) return { value: 'Cerrada', hint: 'sin turno abierto' };
      const efectivo = s.caja.efectivo != null ? `${money(s.caja.efectivo).replace(',00', '')} en efectivo` : '';
      const donde = lc(s.caja.registro ?? 'en mostrador');
      return { value: 'Abierta', hint: [efectivo, donde].filter(Boolean).join(' · ') };
    }
    case 'turnos':
      return s.turnos ? { value: plural(s.turnos.abiertos, 'turno', 'turnos'), hint: 'aperturas, cierres y arqueos del día' } : null;
    case 'stock': {
      // La tarjeta de Stock cubre las dos cosas que hay que atender: lo que
      // está bajo el mínimo (para reponer) y lo que está por vencer. Reposición
      // y Vencimientos son vistas de Stock, no tarjetas propias.
      if (!s.stock) return null;
      const bajo = s.stock.bajoMinimo;
      const vto = s.vencimientos?.lotes ?? 0;
      if (bajo === 0 && vto === 0) {
        return { value: 'Al día', hint: 'por encima del mínimo, nada por vencer' };
      }
      if (bajo > 0) {
        return {
          value: `${bajo}`,
          hint: `bajo el mínimo · ${ejemplos(s.stock.ejemplos)}`,
          caption: vto > 0 ? `bajo el mínimo · ${vto} por vencer` : 'bajo el mínimo',
          rows: s.stock.ejemplos.slice(0, 3).map(n => ({ label: lc(n) })),
          flag: 'hot',
        };
      }
      // Sólo vencimientos.
      const dias = s.vencimientos?.dias ?? 14;
      const ej = ejemplos(s.vencimientos?.ejemplos ?? [], 1);
      return {
        value: `${vto}`,
        hint: `por vencer en ≤ ${dias} día${dias === 1 ? '' : 's'}${ej ? ` · ${ej}` : ''}`,
        caption: 'por vencer',
        rows: (s.vencimientos?.ejemplos ?? []).slice(0, 3).map(n => ({ label: lc(n) })),
        flag: 'warn',
      };
    }
    case 'compras': {
      if (!s.compras) return null;
      if (s.compras.sinCargar === 0) return { value: 'Todo cargado', hint: 'sin facturas pendientes' };
      const prov = ejemplos(s.compras.proveedores);
      return {
        value: `${s.compras.sinCargar}`,
        hint: prov ? `por cargar · ${prov}` : 'facturas por cargar',
        caption: s.compras.sinCargar === 1 ? 'factura por cargar' : 'facturas por cargar',
        rows: s.compras.proveedores.map(n => ({ label: n })),
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
      return { value: `${s.precios.pendientes}`, hint: 'costos nuevos por trasladar', flag: 'warn' };
    }
    case 'clientes': {
      // La cuenta corriente es lo accionable; si no hay saldo en la calle, el
      // conteo de clientes.
      if (s.cuentacorriente && s.cuentacorriente.enLaCalle > 0) {
        const { enLaCalle, vencidos, ejemplos } = s.cuentacorriente;
        return {
          value: compact(enLaCalle),
          hint: 'en la calle',
          caption: vencidos > 0 ? plural(vencidos, 'pasa el límite', 'pasan el límite') : 'en la calle',
          rows: ejemplos?.map(e => ({ label: e.nombre, value: compact(e.saldo), tone: e.vencido ? 'hot' : undefined })),
          flag: vencidos > 0 ? 'hot' : undefined,
        };
      }
      return s.clientes ? { value: s.clientes.total.toLocaleString('es-AR'), hint: 'clientes registrados' } : null;
    }
    default:
      return null;
  }
}

export type Pendiente = { label: string; count: number; path: string; module: string };

/**
 * Lo que hay "para mirar hoy" — alimenta la campana de notificaciones del
 * escritorio. Cada uno lleva el color del módulo al que enlaza (ver `hueFor`),
 * para que se lean como una versión mínima de su tarjeta. `label` es una frase
 * con mayúscula inicial; `count` va como número al lado cuando es más de uno.
 */
export function pendientes(s: EscritorioSummary): Pendiente[] {
  const out: Pendiente[] = [];
  const add = (n: number, sing: string, plu: string, path: string, module: string) => {
    if (n > 0) out.push({ label: n === 1 ? sing : plu, count: n, path, module });
  };
  if (s.stock) add(s.stock.bajoMinimo, 'Producto bajo mínimo', 'Productos bajo mínimo', '/stock/restock', 'stock');
  if (s.vencimientos) add(s.vencimientos.lotes, 'Lote por vencer', 'Lotes por vencer', '/stock/expirations', 'stock');
  if (s.compras) add(s.compras.sinCargar, 'Compra sin cargar', 'Compras sin cargar', '/compras', 'compras');
  if (s.precios) add(s.precios.pendientes, 'Precio sin trasladar', 'Precios sin trasladar', '/precios', 'precios');
  if (s.cuentacorriente) add(s.cuentacorriente.vencidos, 'Cuenta vencida', 'Cuentas vencidas', '/catalog/customers', 'clientes');
  return out;
}
