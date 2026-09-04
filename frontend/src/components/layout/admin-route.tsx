import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';

/** Ruta que exige un permiso puntual del catálogo — reemplaza al viejo "sólo admin". */
export function PermissionRoute({ permission }: { permission: string }) {
  const { can } = useAuth();
  if (!can(permission)) return <Navigate to="/" replace />;
  return <Outlet />;
}
