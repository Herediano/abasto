import {
  ArrowsClockwise, Barcode, CashRegister, Gear, GearSix, Hourglass, Package, Receipt,
  ShieldCheck, Tag, Truck, UsersThree, Vault, Warehouse,
  type Icon,
} from '@phosphor-icons/react';

/**
 * El registro de módulos: la única fuente de verdad de la navegación. Lo usan
 * el escritorio (para dibujar la caja de tarjetas), la cabecera de cada módulo
 * (chip + rastro + botón "Escritorio") y el buscador de Ctrl+K.
 *
 * Cada tarjeta se arma por `permission` — igual que antes el riel: un rango sin
 * la clave ni ve la tarjeta ni entra a la ruta.
 */
export type ModuleDef = {
  key: string;
  label: string;
  path: string;
  permission?: string;
  Icon: Icon;
  /** Frase corta para la tarjeta hasta que haya dato vivo (ver docs/diseno.md, "Lo que sigue" #2). */
  blurb: string;
  /** Rastro en la cabecera del módulo, p. ej. "Escritorio /" o "Escritorio / Clientes /". */
  crumb: string;
  /** La caja abre a pantalla completa, fuera del escritorio. */
  fullscreen?: boolean;
  /** No es una tarjeta del escritorio: se llega desde Ajustes (Usuarios, Rangos). */
  settings?: boolean;
  /** Paths del motivo de línea de la tarjeta (dentro de un <svg viewBox="0 0 24 24">). */
  motif: string;
};

export const MODULES: ModuleDef[] = [
  {
    key: 'ventas', label: 'Ventas', path: '/ventas/historial', permission: 'ventas.ver', Icon: Receipt,
    blurb: 'Comprobantes emitidos, por día y medio de pago.', crumb: 'Escritorio /',
    motif: '<path d="M3 21V13M9 21V7M15 21v-6M21 21V4"/>',
  },
  {
    key: 'caja', label: 'Caja', path: '/ventas', permission: 'caja.operar', Icon: CashRegister, fullscreen: true,
    blurb: 'Cobrar en mostrador. Pantalla completa.', crumb: 'Escritorio /',
    motif: '<rect x="2" y="8" width="20" height="12" rx="1.5"/><path d="M2 13h20M6 8V4h9l3 4"/><circle cx="16.5" cy="16" r="1.5"/>',
  },
  {
    key: 'turnos', label: 'Turnos de caja', path: '/ventas/turnos', permission: 'caja.ver_todas', Icon: Vault,
    blurb: 'Aperturas, cierres y arqueos con diferencia.', crumb: 'Escritorio /',
    motif: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2.5"/>',
  },
  {
    key: 'stock', label: 'Stock', path: '/stock', permission: 'stock.ver', Icon: Package,
    blurb: 'Existencias por producto, depósito y lote.', crumb: 'Escritorio /',
    motif: '<path d="M3 8l9-4 9 4-9 4-9-4z"/><path d="M3 8v8l9 4 9-4V8M12 12v8"/>',
  },
  {
    key: 'vencimientos', label: 'Vencimientos', path: '/stock/expirations', permission: 'stock.ver', Icon: Hourglass,
    blurb: 'Lotes por vencer y mermas a registrar.', crumb: 'Escritorio /',
    motif: '<rect x="4" y="4" width="16" height="17" rx="1.5"/><path d="M4 9h16M9 3v4M15 3v4M14 14l4 4M18 14l-4 4"/>',
  },
  {
    key: 'reposicion', label: 'Reposición', path: '/stock/restock', permission: 'stock.ver', Icon: ArrowsClockwise,
    blurb: 'Qué está bajo el mínimo y qué pedir.', crumb: 'Escritorio /',
    motif: '<path d="M4 12a8 8 0 018-8c3 0 5.6 1.7 7 4M20 4v4h-4"/><path d="M20 12a8 8 0 01-8 8c-3 0-5.6-1.7-7-4M4 20v-4h4"/>',
  },
  {
    key: 'productos', label: 'Productos', path: '/catalog/products', permission: 'productos.ver', Icon: Barcode,
    blurb: 'El catálogo de la empresa, con costo y precio.', crumb: 'Escritorio /',
    motif: '<rect x="3" y="3" width="18" height="18" rx="1.5"/><path d="M7 3v18M11 3v18M15 7h6M15 12h6M15 16h6"/>',
  },
  {
    key: 'precios', label: 'Precios', path: '/precios', permission: 'precios.ver', Icon: Tag,
    blurb: 'Listas, reglas y ajustes por costo o inflación.', crumb: 'Escritorio /',
    motif: '<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="8" cy="9" r="1.8"/>',
  },
  {
    key: 'proveedores', label: 'Proveedores', path: '/catalog/suppliers', permission: 'proveedores.ver', Icon: Truck,
    blurb: 'A quién le comprás y qué días entrega.', crumb: 'Escritorio /',
    motif: '<path d="M2 7h12v10H2zM14 10h4l4 4v3h-8z"/><circle cx="6" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
  },
  {
    key: 'clientes', label: 'Clientes', path: '/catalog/customers', permission: 'clientes.ver', Icon: UsersThree,
    blurb: 'Cuentas, límites de crédito y estado de cuenta.', crumb: 'Escritorio /',
    motif: '<circle cx="8" cy="8" r="3.4"/><path d="M2 21c.8-4.4 3.6-6.6 6-6.6S13.2 16.6 14 21"/><circle cx="17" cy="9" r="2.6"/><path d="M15 21c.4-2.6 1.4-4.4 3-5.2"/>',
  },
  {
    key: 'depositos', label: 'Depósitos', path: '/catalog/warehouses', permission: 'depositos.ver', Icon: Warehouse,
    blurb: 'Dónde se guarda el stock de la sucursal.', crumb: 'Escritorio /',
    motif: '<path d="M3 21V9l9-5 9 5v12M3 21h18M9 21v-6h6v6"/>',
  },
  {
    key: 'ajustes', label: 'Ajustes', path: '/ajustes', Icon: GearSix, settings: true,
    blurb: 'Tu perfil, tus preferencias y la empresa.', crumb: 'Escritorio /',
    motif: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M16.9 16.9l2.1 2.1M19.1 4.9l-2.1 2.1M7 16.9l-2.1 2.1"/>',
  },
  {
    key: 'usuarios', label: 'Usuarios', path: '/admin/users', permission: 'usuarios.ver', Icon: Gear, settings: true,
    blurb: 'Quién entra al sistema y con qué rango.', crumb: 'Escritorio / Ajustes /',
    motif: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.7-3.8 3.2-5.8 6-5.8S14.3 16.2 15 20"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 20c.4-2.4 1.3-4 2.7-4.8"/>',
  },
  {
    key: 'rangos', label: 'Rangos', path: '/admin/rangos', permission: 'rangos.ver', Icon: ShieldCheck, settings: true,
    blurb: 'Qué puede tocar cada rango de la empresa.', crumb: 'Escritorio / Ajustes /',
    motif: '<path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  },
];

const BY_KEY = new Map(MODULES.map(m => [m.key, m]));
export const moduleByKey = (key: string) => BY_KEY.get(key);

/**
 * Un matiz propio por módulo. No dice estado —es identidad—: se aplica en grande
 * (pastilla del ícono, franja al costado, borde, lavado del fondo) para
 * reconocer el módulo por color sin leer.
 *
 * Receta (ver docs/diseno.md, "Color por módulo"): OKLCH con luz y croma fijos,
 * se rota solo el matiz. El arco esquiva el verde (~150°, acción) y el
 * naranja/ámbar (~40–110°, aviso); se usa de 195° a 360° y de 0° a 25°, con ≥
 * ~21° de separación entre módulos —repartidos por toda la rueda para que ningún
 * par sea confundible. Los que viven adentro de Ajustes comparten un pizarra de
 * croma bajo —son sistema, no operación.
 */
const OP = (h: number) => `oklch(0.62 0.15 ${h})`;
const HUES: Record<string, string> = {
  caja: OP(195),
  vencimientos: OP(216),
  proveedores: OP(237),
  ventas: OP(258),
  turnos: OP(279),
  productos: OP(300),
  precios: OP(321),
  clientes: OP(342),
  stock: OP(3),
  reposicion: OP(24),
  depositos: 'oklch(0.55 0.03 255)', // pizarra: estructura, no operación
  ajustes: 'oklch(0.55 0.03 255)', // pizarra: vive en el menú de la cuenta
  usuarios: 'oklch(0.55 0.04 216)', // sistema, vive en Ajustes
  rangos: 'oklch(0.50 0.06 3)', // sistema, vive en Ajustes
};
export const hueFor = (key: string) => HUES[key] ?? 'var(--color-primary)';

/** El módulo de una ruta: match exacto y si no, el prefijo más largo (rutas de detalle como /catalog/products/:id). */
export function moduleForPath(pathname: string): ModuleDef | undefined {
  const exact = MODULES.find(m => m.path === pathname);
  if (exact) return exact;
  return MODULES
    .filter(m => pathname.startsWith(m.path + '/'))
    .sort((a, b) => b.path.length - a.path.length)[0];
}

/** Los módulos navegables que este rango puede ver (para el buscador de Ctrl+K). */
export function visibleModules(can: (permission: string) => boolean): ModuleDef[] {
  return MODULES.filter(m => !m.settings && (!m.permission || can(m.permission)));
}

/** Las tarjetas de la grilla del escritorio: como `visibleModules` pero sin la Caja,
 *  que va aparte por ser un modo de trabajo, no un módulo más. */
export function gridModules(can: (permission: string) => boolean): ModuleDef[] {
  return visibleModules(can).filter(m => !m.fullscreen);
}

/** Los módulos que viven dentro de Ajustes (Usuarios, Rangos), filtrados por permiso. */
export function settingsModules(can: (permission: string) => boolean): ModuleDef[] {
  return MODULES.filter(m => m.settings && m.key !== 'ajustes' && (!m.permission || can(m.permission)));
}

/** El motivo de línea de una tarjeta: SVG grande y tenue que le da identidad sin gastar color. */
export function ModuleMotif({ motif, className }: { motif: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      dangerouslySetInnerHTML={{ __html: motif }}
    />
  );
}
