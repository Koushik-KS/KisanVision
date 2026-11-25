import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FiLoader } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../utils/constants';

const AuthLoadingScreen = () => (
  <div className="kv-auth-loading">
    <FiLoader size={28} className="kv-spin" color="var(--kv-primary)" />
    <span>Verifying your KisanVision AI session...</span>
  </div>
);

export const ProtectedRoute = () => {
  const { isAuthenticated, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export const PublicOnlyRoute = () => {
  const { isAuthenticated, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    const target = location.state?.from?.pathname || ROUTES.HOME;
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
};
