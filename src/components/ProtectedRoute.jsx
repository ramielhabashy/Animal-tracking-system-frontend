import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessRoute } from '../config/routes';

export function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export function RoleRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  if (!allowedRoles || allowedRoles.length === 0) return children;
  if (!user || !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}