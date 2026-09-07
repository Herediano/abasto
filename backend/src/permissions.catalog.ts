/**
 * Catálogo de permisos del sistema de rangos. Es la única fuente de verdad:
 * el backend la usa para validar y sembrar los rangos de fábrica, el
 * frontend la pide por API para dibujar la pantalla de Rangos.
 *
 * Sumar un permiso nuevo (cuando un módulo existente gane una función) es
 * agregar una fila acá y decorar el endpoint con @RequirePermission — nunca
 * una migración de base. Pero una clave nueva NO aparece sola en ningún
 * rango de una empresa que ya existe, ni siquiera en los "de fábrica": sólo
 * entra en DEFAULT_RANGOS, que es lo que usan los tenants nuevos a partir de
 * ese momento. Los que ya existen se actualizan a mano desde la pantalla de
 * Rangos.
 */

export type PermissionKey = string;

export type PermissionDef = {
  key: PermissionKey;
  area: string;
  label: string;
  dangerous: boolean;
};

export const PERMISSIONS: PermissionDef[] = [
  // Caja
  { key: 'caja.operar', area: 'Caja', label: 'Operar la caja propia', dangerous: false },
  { key: 'caja.ver_todas', area: 'Caja', label: 'Ver todas las cajas de la sucursal', dangerous: false },
  { key: 'caja.autorizar_anulacion', area: 'Caja', label: 'Autorizar anular un ítem del carrito', dangerous: true },
  { key: 'caja.administrar', area: 'Caja', label: 'Crear y editar cajas físicas', dangerous: false },
  // Ventas
  { key: 'ventas.ver', area: 'Ventas', label: 'Ver ventas (propias; todas con "ver todas las cajas")', dangerous: false },
  { key: 'ventas.anular', area: 'Ventas', label: 'Anular una venta ya confirmada', dangerous: true },
  { key: 'ventas.devolver', area: 'Ventas', label: 'Registrar devoluciones y notas de crédito', dangerous: true },
  // Stock
  { key: 'stock.ver', area: 'Stock', label: 'Ver stock e historial de movimientos', dangerous: false },
  { key: 'stock.mover', area: 'Stock', label: 'Ingresos, egresos y ajustes de stock', dangerous: false },
  { key: 'stock.transferir', area: 'Stock', label: 'Transferir stock entre depósitos y sucursales', dangerous: false },
  // Compras
  { key: 'compras.ver', area: 'Compras', label: 'Ver facturas de compra', dangerous: false },
  { key: 'compras.crear', area: 'Compras', label: 'Cargar y confirmar facturas de compra', dangerous: false },
  { key: 'compras.corregir', area: 'Compras', label: 'Corregir una factura de compra confirmada', dangerous: true },
  { key: 'compras.anular', area: 'Compras', label: 'Anular una factura de compra', dangerous: true },
  // Precios
  { key: 'precios.ver', area: 'Precios', label: 'Ver listas, reglas y auditoría de precios', dangerous: false },
  { key: 'precios.editar', area: 'Precios', label: 'Editar precios, listas y reglas', dangerous: true },
  // Productos
  { key: 'productos.ver', area: 'Productos', label: 'Ver productos', dangerous: false },
  { key: 'productos.crear', area: 'Productos', label: 'Crear productos', dangerous: false },
  { key: 'productos.editar', area: 'Productos', label: 'Editar productos (categorías, códigos, escalas, lotes)', dangerous: false },
  { key: 'productos.eliminar', area: 'Productos', label: 'Eliminar o desactivar productos', dangerous: true },
  // Proveedores
  { key: 'proveedores.ver', area: 'Proveedores', label: 'Ver proveedores', dangerous: false },
  { key: 'proveedores.crear', area: 'Proveedores', label: 'Crear proveedores', dangerous: false },
  { key: 'proveedores.editar', area: 'Proveedores', label: 'Editar proveedores', dangerous: false },
  // Clientes
  { key: 'clientes.ver', area: 'Clientes', label: 'Ver clientes', dangerous: false },
  { key: 'clientes.crear', area: 'Clientes', label: 'Crear clientes', dangerous: false },
  { key: 'clientes.editar', area: 'Clientes', label: 'Editar clientes (incluye límite de crédito)', dangerous: false },
  { key: 'clientes.cobrar', area: 'Clientes', label: 'Registrar un cobro de cuenta corriente', dangerous: false },
  { key: 'clientes.ajustar_cuenta', area: 'Clientes', label: 'Ajuste manual de cuenta corriente', dangerous: true },
  // Promociones
  { key: 'promociones.ver', area: 'Promociones', label: 'Ver promociones', dangerous: false },
  { key: 'promociones.crear', area: 'Promociones', label: 'Crear promociones', dangerous: false },
  { key: 'promociones.editar', area: 'Promociones', label: 'Editar promociones', dangerous: false },
  { key: 'promociones.eliminar', area: 'Promociones', label: 'Eliminar promociones', dangerous: false },
  // Depósitos
  { key: 'depositos.ver', area: 'Depósitos', label: 'Ver depósitos', dangerous: false },
  { key: 'depositos.crear', area: 'Depósitos', label: 'Crear depósitos', dangerous: false },
  { key: 'depositos.editar', area: 'Depósitos', label: 'Editar depósitos', dangerous: false },
  // Usuarios
  { key: 'usuarios.ver', area: 'Usuarios', label: 'Ver usuarios', dangerous: false },
  { key: 'usuarios.gestionar', area: 'Usuarios', label: 'Crear, editar y desactivar usuarios', dangerous: true },
  // Rangos
  { key: 'rangos.ver', area: 'Rangos', label: 'Ver rangos', dangerous: false },
  { key: 'rangos.gestionar', area: 'Rangos', label: 'Crear, clonar y editar rangos y sus permisos', dangerous: true },
  // Reportes
  { key: 'reportes.ver', area: 'Reportes', label: 'Ver reportes', dangerous: false },
  { key: 'reportes.ver_plata', area: 'Reportes', label: 'Ver reportes de dinero (márgenes, caja)', dangerous: true },
  // Sucursales
  { key: 'sucursales.navegar', area: 'Sucursales', label: 'Cambiar de sucursal', dangerous: true },
];

export const PERMISSION_KEYS = new Set(PERMISSIONS.map(p => p.key));

const ALL = PERMISSIONS.map(p => p.key);

/**
 * Los 7 rangos de fábrica y qué traen tildado. Sólo se usa para sembrar
 * tenants NUEVOS (signup, y el backfill de los que ya existían al momento de
 * construir este sistema) — nunca para "completar" un rango existente
 * cuando el catálogo crece.
 */
export const DEFAULT_RANGOS: Record<string, PermissionKey[]> = {
  Cajero: ['caja.operar', 'stock.ver', 'productos.ver', 'clientes.ver', 'clientes.crear', 'clientes.cobrar', 'promociones.ver', 'ventas.ver'],
  Repositor: ['stock.ver', 'precios.ver', 'productos.ver', 'depositos.ver'],
  'Recepción': ['stock.ver', 'stock.mover', 'stock.transferir', 'compras.ver', 'compras.crear', 'compras.corregir', 'productos.ver', 'proveedores.ver', 'depositos.ver'],
  Administrativo: [
    'stock.ver', 'stock.mover', 'stock.transferir', 'compras.ver', 'compras.crear', 'compras.corregir', 'precios.ver', 'precios.editar',
    'productos.ver', 'productos.crear', 'productos.editar', 'proveedores.ver', 'proveedores.crear', 'proveedores.editar',
    'clientes.ver', 'promociones.ver', 'depositos.ver', 'reportes.ver', 'ventas.ver',
  ],
  'Supervisor de caja': [
    'caja.operar', 'caja.ver_todas', 'caja.autorizar_anulacion', 'caja.administrar', 'stock.ver', 'productos.ver',
    'clientes.ver', 'clientes.crear', 'clientes.editar', 'clientes.cobrar', 'clientes.ajustar_cuenta',
    'promociones.ver', 'depositos.ver', 'reportes.ver', 'ventas.ver', 'ventas.anular', 'ventas.devolver',
  ],
  Encargado: [
    'caja.ver_todas', 'caja.autorizar_anulacion', 'stock.ver', 'stock.mover', 'stock.transferir', 'compras.ver', 'compras.crear', 'compras.corregir',
    'precios.ver', 'precios.editar', 'productos.ver', 'productos.crear', 'productos.editar',
    'proveedores.ver', 'proveedores.crear', 'proveedores.editar',
    'clientes.ver', 'clientes.crear', 'clientes.editar', 'clientes.cobrar', 'clientes.ajustar_cuenta',
    'promociones.ver', 'promociones.crear', 'promociones.editar', 'promociones.eliminar',
    'depositos.ver', 'depositos.crear', 'depositos.editar', 'reportes.ver', 'reportes.ver_plata',
    'ventas.ver', 'ventas.anular', 'ventas.devolver',
  ],
  'Dueño': ALL,
};

/** Orden fijo de los 7 rangos de fábrica (el mismo en todos lados: seed, backfill, UI). */
export const SYSTEM_RANGO_NAMES = Object.keys(DEFAULT_RANGOS);
