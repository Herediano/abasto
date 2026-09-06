import { Navigate, Route, Routes } from 'react-router-dom';
import { PermissionRoute } from '@/components/layout/admin-route';
import { FullScreenRoute, ProtectedRoute } from '@/components/layout/protected-route';
import { EscritorioPage } from '@/pages/escritorio-page';
import { AjustesPage } from '@/pages/ajustes-page';
import { UsersPage } from '@/pages/admin/users-page';
import { LoginPage } from '@/pages/auth/login-page';
import { SignupPage } from '@/pages/auth/signup-page';
import { StockPage } from '@/pages/stock/stock-page';
import { StockInPage } from '@/pages/stock/stock-in-page';
import { StockOutPage } from '@/pages/stock/stock-out-page';
import { StockHistoryPage } from '@/pages/stock/stock-history-page';
import { ExpirationsPage } from '@/pages/stock/expirations-page';
import { RestockPage } from '@/pages/stock/restock-page';
import { ProductsPage } from '@/pages/catalog/products-page';
import { ProductDetailPage } from '@/pages/catalog/product-detail-page';
import { CategoriesPage } from '@/pages/catalog/categories-page';
import { WarehousesPage } from '@/pages/catalog/warehouses-page';
import { SuppliersPage } from '@/pages/catalog/suppliers-page';
import { CustomersPage } from '@/pages/catalog/customers-page';
import { PosPage } from '@/pages/sales/pos-page';
import { SalesHistoryPage } from '@/pages/sales/sales-history-page';
import { ShiftsHistoryPage } from '@/pages/sales/shifts-history-page';
import { PricesPage } from '@/pages/prices/prices-page';
import { RangosPage } from '@/pages/admin/rangos-page';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      {/* La caja va afuera del escritorio: pantalla completa, su propio mundo. */}
      <Route element={<FullScreenRoute />}>
        <Route path="/ventas" element={<PosPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        {/* El escritorio es el índice y la única navegación (ver docs/diseno.md). */}
        <Route path="/" element={<EscritorioPage />} />
        <Route path="/ajustes" element={<AjustesPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/stock/in" element={<StockInPage />} />
        <Route path="/stock/out" element={<StockOutPage />} />
        <Route path="/stock/history" element={<StockHistoryPage />} />
        <Route path="/stock/expirations" element={<ExpirationsPage />} />
        <Route path="/stock/restock" element={<RestockPage />} />
        <Route path="/catalog/products" element={<ProductsPage />} />
        <Route path="/catalog/products/:id" element={<ProductDetailPage />} />
        <Route path="/catalog/categories" element={<CategoriesPage />} />
        <Route path="/catalog/warehouses" element={<WarehousesPage />} />
        <Route path="/catalog/suppliers" element={<SuppliersPage />} />
        <Route path="/catalog/customers" element={<CustomersPage />} />
        <Route path="/ventas/historial" element={<SalesHistoryPage />} />
        <Route element={<PermissionRoute permission="precios.ver" />}>
          <Route path="/precios" element={<PricesPage />} />
        </Route>
        <Route element={<PermissionRoute permission="usuarios.ver" />}>
          <Route path="/admin/users" element={<UsersPage />} />
        </Route>
        <Route element={<PermissionRoute permission="rangos.ver" />}>
          <Route path="/admin/rangos" element={<RangosPage />} />
        </Route>
        <Route element={<PermissionRoute permission="caja.ver_todas" />}>
          <Route path="/ventas/turnos" element={<ShiftsHistoryPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
