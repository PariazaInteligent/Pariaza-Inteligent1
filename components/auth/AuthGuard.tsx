
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types';
import Spinner from '../ui/Spinner';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, allowedRoles }) => {
  const { user, loadingAuth } = useAuth();
  const location = useLocation();

  if (loadingAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // User is authenticated but does not have the required role
    // Redirect to a generic "access denied" page or their respective dashboard
    const fallbackPath = user.role === Role.ADMIN ? '/admin/dashboard' : '/user/dashboard';
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
    