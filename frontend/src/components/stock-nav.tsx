import type { ModuleView } from '@/components/module-screen';

/**
 * Las vistas del módulo Stock: cada una es su propia ruta. Reposición y
 * Vencimientos también son vistas de Stock —no módulos del escritorio—; sus
 * alertas salen en la tarjeta de Stock (ver docs/diseno.md). El escritorio
 * tiene una sola tarjeta para todo esto: Stock.
 */
type StockView = ModuleView & { permission: string };

const STOCK_VIEWS: StockView[] = [
  { key: 'actual', label: 'Actual', to: '/stock', end: true, permission: 'stock.ver' },
  { key: 'restock', label: 'Reposición', to: '/stock/restock', permission: 'stock.ver' },
  { key: 'expirations', label: 'Vencimientos', to: '/stock/expirations', permission: 'stock.ver' },
  { key: 'in', label: 'Ingreso', to: '/stock/in', permission: 'stock.mover' },
  { key: 'out', label: 'Egreso', to: '/stock/out', permission: 'stock.mover' },
  { key: 'transfer', label: 'Transferir', to: '/stock/transfer', permission: 'stock.transferir' },
  { key: 'history', label: 'Historial', to: '/stock/history', permission: 'stock.ver' },
];

/** Las vistas de Stock que este rango puede ver, para el `views` de ModuleScreen. */
export function stockViews(can: (permission: string) => boolean): ModuleView[] {
  return STOCK_VIEWS.filter(v => can(v.permission)).map(({ permission: _permission, ...v }) => v);
}
