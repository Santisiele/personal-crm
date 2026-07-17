import { Navigate, Outlet } from 'react-router-dom';
import { Center, Loader } from '@mantine/core';
import { useAuth } from '@/auth/AuthContext';
import { isPrivileged } from '@/api/types';

/** Gates a route subtree behind an authenticated session. */
export function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

/** Gates a route subtree behind a privileged role (ADMIN/CREATOR). */
export function RequirePrivileged() {
  const { user } = useAuth();
  if (!user || !isPrivileged(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
