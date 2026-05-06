import { useCallback, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAuthToken, getAuthUser, setAuthUser, setAuthToken, setUserRole, getUserRole, clearAuth, CookieService } from '../utils/cookies';
import { apiFetch } from '../utils/api';
import { routeConfig, canAccessRoute } from '../config/routes';

export function useAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = getAuthUser();
    const token = getAuthToken();
    
    if (storedUser && token) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    try {
       const response = await apiFetch('/api/auth/login', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email, password }),
       });

      if (response.ok) {
        const data = await response.json();
        const userRole = data.user?.role || 'Owner';
        const userWithRole = { ...data.user, role: userRole };
        
        setUser(userWithRole);
        setAuthToken(data.token);
        setAuthUser(userWithRole);
        setUserRole(userRole);
        
        return { ok: true, user: userWithRole };
      }
      
      const error = await response.json();
      return { ok: false, error: error.message };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    clearAuth();
    navigate('/login');
  }, [navigate]);

  const checkPermission = useCallback((path) => {
    if (!user?.role) return false;
    return canAccessRoute(path, user.role);
  }, [user]);

  return {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    checkPermission,
    userRole: user?.role,
  };
}

export function useRequireAuth() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { state: { from: location } });
    }
  }, [isAuthenticated, loading, navigate]);
  
  return { isAuthenticated, loading };
}

export function useRequireRole(roles) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const hasRole = user?.role && roles.includes(user.role);
  
  useEffect(() => {
    if (!loading && user && !hasRole) {
      navigate('/403');
    }
  }, [user, loading, hasRole, navigate]);
  
  return { hasRole, loading, userRole: user?.role };
}

export default useAuth;