import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminRoute } from '@/components/layout/admin-route';
import { ProtectedRoute } from '@/components/layout/protected-route';
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
import { PricesPage } from '@/pages/prices/prices-page';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<StockPage />} />
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
        <Route element={<AdminRoute />}>
          <Route path="/precios" element={<PricesPage />} />
          <Route path="/admin/users" element={<UsersPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
