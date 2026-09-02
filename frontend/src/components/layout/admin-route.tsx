import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';

export function AdminRoute() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}
