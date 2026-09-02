import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from './app-shell';

export function ProtectedRoute() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <AppShell />;
}
