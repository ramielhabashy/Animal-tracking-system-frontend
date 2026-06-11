import React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { getAuthUser, setAuthUser, setAuthToken, setUserRole, clearAuth, getAuthToken } from '../utils/cookies';
import { apiFetch } from '../utils/api';

const AuthContext = createContext({ user: null, isAuthenticated: false, login: async () => false, logout: () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getAuthUser());
  const [isAuthenticated, setIsAuthenticated] = useState(() => getAuthUser() !== null);

  useEffect(() => {
    if (user) {
      setAuthUser(user);
    } else {
      clearAuth();
    }
  }, [user]);

  const login = async (email, password) => {
    try {
       const response = await apiFetch('/api/auth/login', {
         method: 'POST',
         headers: { 
           'Content-Type': 'application/json', 
           'Accept': 'application/json' 
         },
         body: JSON.stringify({ email, password }),
       });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Login failed response:', response.status, errorData);
        const retryAfter = response.headers.get('Retry-After');
        return {
          error: errorData.error || 'unauthorized',
          message: errorData.message || 'Login failed',
          status: response.status,
          retryAfter: retryAfter ? parseInt(retryAfter) : undefined,
        };
      }
      
      const data = await response.json();

      // Handle OTP/2FA flow
      if (data.requires_otp) {
        sessionStorage.setItem('login_temp_token', data.temp_token);
        sessionStorage.setItem('login_email', email);
        sessionStorage.setItem('login_password', password);
        return { requires_otp: true, temp_token: data.temp_token };
      }

      if (data.user) {
        const userRole = data.user.role || 'Owner';
        const userWithRole = { ...data.user, role: userRole };
        
        setUser(userWithRole);
        setAuthUser(userWithRole);
        setUserRole(userRole);
      } else {
        const defaultUser = { id: 0, email, name: 'User', role: 'Admin', phone: null };
        setUser(defaultUser);
        setAuthUser(defaultUser);
        setUserRole('Admin');
      }
      if (data.token) {
        setAuthToken(data.token);
      }
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  /**
   * Refresh auth state by re-reading cookies.
   * Used by OtpVerificationPage after successful OTP verification
   * to sync AuthContext with the newly set cookies.
   */
  const refreshAuth = () => {
    const storedUser = getAuthUser();
    if (storedUser) {
      setUser(storedUser);
      setIsAuthenticated(true);
    }
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    setIsAuthenticated(false);
    clearAuth();
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);