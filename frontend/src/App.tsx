import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PermissionRoute } from '@/components/layout/admin-route';
import { FullScreenRoute, ProtectedRoute } from '@/components/layout/protected-route';
import { FullPageLoading } from '@/components/spinner';
import { useBranchVersion } from '@/lib/branch';
import {
  AjustesPage, CategoriesPage, CustomersPage, EscritorioPage, ExpirationsPage, LoginPage,
  PosPage, PricesPage, ProductDetailPage, ProductsPage, PurchasesPage, ReportesPage, RestockPage,
  SalesHistoryPage, ShiftsHistoryPage, SignupPage, StockHistoryPage, StockOutPage,
  StockPage, StockTransferPage, SuppliersPage, WarehousesPage,
} from '@/lib/lazy-pages';

function App() {
  // Cambiar de sucursal remonta las rutas (ver lib/branch.ts): cada pantalla
  // vuelve a pedir sus datos, sin el flash de un reload de navegador.
  const branchVersion = useBranchVersion();
  return (
    <Suspense fallback={<FullPageLoading />}>
      <Routes key={branchVersion}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      {/* La caja va afuera del escritorio: pantalla completa, su propio mundo. */}
      <Route element={<FullScreenRoute />}>
        <Route path="/ventas" element={<PosPage />} />
      </Route>
      {/* Toda ruta de módulo se arma por permiso, igual que las tarjetas del
          escritorio: sin la clave, ni ve la tarjeta ni entra por URL (redirige
          al escritorio). El backend igual valida; esto evita la cáscara + error. */}
      <Route element={<ProtectedRoute />}>
        {/* El escritorio es el índice y la única navegación (ver docs/diseno.md). */}
        <Route path="/" element={<EscritorioPage />} />
        <Route path="/ajustes" element={<AjustesPage />} />

        <Route element={<PermissionRoute permission="stock.ver" />}>
          <Route path="/stock" element={<StockPage />} />
          <Route path="/stock/history" element={<StockHistoryPage />} />
          <Route path="/stock/expirations" element={<ExpirationsPage />} />
          <Route path="/stock/restock" element={<RestockPage />} />
        </Route>
        <Route element={<PermissionRoute permission="stock.mover" />}>
          <Route path="/stock/out" element={<StockOutPage />} />
        </Route>
        <Route element={<PermissionRoute permission="stock.transferir" />}>
          <Route path="/stock/transfer" element={<StockTransferPage />} />
        </Route>

        <Route element={<PermissionRoute permission="compras.ver" />}>
          <Route path="/compras" element={<PurchasesPage />} />
        </Route>

        <Route element={<PermissionRoute permission="productos.ver" />}>
          <Route path="/catalog/products" element={<ProductsPage />} />
          <Route path="/catalog/products/:id" element={<ProductDetailPage />} />
          <Route path="/catalog/categories" element={<CategoriesPage />} />
        </Route>
        <Route element={<PermissionRoute permission="depositos.ver" />}>
          <Route path="/catalog/warehouses" element={<WarehousesPage />} />
        </Route>
        <Route element={<PermissionRoute permission="proveedores.ver" />}>
          <Route path="/catalog/suppliers" element={<SuppliersPage />} />
        </Route>
        <Route element={<PermissionRoute permission="clientes.ver" />}>
          <Route path="/catalog/customers" element={<CustomersPage />} />
        </Route>

        <Route element={<PermissionRoute permission="ventas.ver" />}>
          <Route path="/ventas/historial" element={<SalesHistoryPage />} />
        </Route>
        <Route element={<PermissionRoute permission="caja.ver_todas" />}>
          <Route path="/ventas/turnos" element={<ShiftsHistoryPage />} />
        </Route>
        <Route element={<PermissionRoute permission="precios.ver" />}>
          <Route path="/precios" element={<PricesPage />} />
        </Route>
        <Route element={<PermissionRoute permission="reportes.ver" />}>
          <Route path="/reportes" element={<ReportesPage />} />
        </Route>
        {/* Usuarios y Rangos son pestañas de Ajustes; estas rutas abren Ajustes
            en la pestaña correspondiente (compat con enlaces y `settingsModules`). */}
        <Route element={<PermissionRoute permission="usuarios.ver" />}>
          <Route path="/admin/users" element={<AjustesPage initialView="usuarios" />} />
        </Route>
        <Route element={<PermissionRoute permission="rangos.ver" />}>
          <Route path="/admin/rangos" element={<AjustesPage initialView="rangos" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}

export default App;
