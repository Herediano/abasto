import { lazyPage, type Preloadable } from '@/lib/lazy-page';

/**
 * El registro único de páginas con carga diferida. Lo consumen las rutas
 * (`App.tsx`) y el prefetch por intención (`prefetchRoute`, que llaman el
 * escritorio y la fila de vistas de cada módulo). Vive en su propio archivo —y
 * no en `App.tsx`— para que el escritorio pueda pedir `preload()` sin importar
 * el árbol de rutas entero.
 */

export const EscritorioPage = lazyPage(() => import('@/pages/escritorio-page'), 'EscritorioPage');
export const AjustesPage = lazyPage(() => import('@/pages/ajustes-page'), 'AjustesPage');
export const LoginPage = lazyPage(() => import('@/pages/auth/login-page'), 'LoginPage');
export const SignupPage = lazyPage(() => import('@/pages/auth/signup-page'), 'SignupPage');
export const StockPage = lazyPage(() => import('@/pages/stock/stock-page'), 'StockPage');
export const StockInPage = lazyPage(() => import('@/pages/stock/stock-in-page'), 'StockInPage');
export const StockOutPage = lazyPage(() => import('@/pages/stock/stock-out-page'), 'StockOutPage');
export const StockTransferPage = lazyPage(() => import('@/pages/stock/stock-transfer-page'), 'StockTransferPage');
export const StockHistoryPage = lazyPage(() => import('@/pages/stock/stock-history-page'), 'StockHistoryPage');
export const ExpirationsPage = lazyPage(() => import('@/pages/stock/expirations-page'), 'ExpirationsPage');
export const RestockPage = lazyPage(() => import('@/pages/stock/restock-page'), 'RestockPage');
export const ProductsPage = lazyPage(() => import('@/pages/catalog/products-page'), 'ProductsPage');
export const ProductDetailPage = lazyPage(() => import('@/pages/catalog/product-detail-page'), 'ProductDetailPage');
export const CategoriesPage = lazyPage(() => import('@/pages/catalog/categories-page'), 'CategoriesPage');
export const WarehousesPage = lazyPage(() => import('@/pages/catalog/warehouses-page'), 'WarehousesPage');
export const SuppliersPage = lazyPage(() => import('@/pages/catalog/suppliers-page'), 'SuppliersPage');
export const CustomersPage = lazyPage(() => import('@/pages/catalog/customers-page'), 'CustomersPage');
export const PosPage = lazyPage(() => import('@/pages/sales/pos-page'), 'PosPage');
export const SalesHistoryPage = lazyPage(() => import('@/pages/sales/sales-history-page'), 'SalesHistoryPage');
export const ShiftsHistoryPage = lazyPage(() => import('@/pages/sales/shifts-history-page'), 'ShiftsHistoryPage');
export const PricesPage = lazyPage(() => import('@/pages/prices/prices-page'), 'PricesPage');
export const ReportesPage = lazyPage(() => import('@/pages/reportes-page'), 'ReportesPage');

/**
 * Ruta concreta → página cuyo chunk hay que tener bajado para abrirla sin
 * espera. Claves = los `to`/`path` que se navegan de verdad (tarjetas del
 * escritorio y pestañas de módulo); Usuarios y Rangos abren `AjustesPage`.
 * El detalle de producto (`/catalog/products/:id`) no está: se llega desde
 * adentro de Productos, con el chunk de catálogo ya cargado.
 */
const ROUTE_PAGE: Record<string, Preloadable> = {
  '/': EscritorioPage,
  '/ajustes': AjustesPage,
  '/admin/users': AjustesPage,
  '/admin/rangos': AjustesPage,
  '/stock': StockPage,
  '/stock/restock': RestockPage,
  '/stock/expirations': ExpirationsPage,
  '/stock/in': StockInPage,
  '/stock/out': StockOutPage,
  '/stock/transfer': StockTransferPage,
  '/stock/history': StockHistoryPage,
  '/catalog/products': ProductsPage,
  '/catalog/categories': CategoriesPage,
  '/catalog/warehouses': WarehousesPage,
  '/catalog/suppliers': SuppliersPage,
  '/catalog/customers': CustomersPage,
  '/precios': PricesPage,
  '/reportes': ReportesPage,
  '/ventas': PosPage,
  '/ventas/historial': SalesHistoryPage,
  '/ventas/turnos': ShiftsHistoryPage,
};

/** Baja por adelantado el chunk de una ruta. No-op si la ruta no está mapeada
 *  o si el chunk ya está en memoria (el `import()` queda cacheado). */
export function prefetchRoute(path: string): void {
  void ROUTE_PAGE[path]?.preload();
}
