import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from './app-shell';

/** Rutas de la aplicación: exigen sesión y viven adentro del riel. */
export function ProtectedRoute() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <AppShell />;
}

/**
 * Rutas a pantalla completa: exigen sesión pero no llevan el riel ni el
 * encabezado. La caja es su propio mundo — el cajero no ve nada del resto del
 * sistema mientras cobra, y tiene ahí adentro todo lo que necesita.
 */
export function FullScreenRoute() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}
