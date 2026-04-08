import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { User, AuthState } from '../types';
import { authApi } from '../services/api';

const ADMIN_ROLES = ['SUPER_ADMIN', 'OSTA_ADMIN', 'BOARD_ADMIN', 'SCHOOL_ADMIN'];

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const storedUser = localStorage.getItem('auth_user');

    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (ADMIN_ROLES.includes(user.role)) {
        return { user, isAuthenticated: true, isLoading: false };
      }
      localStorage.removeItem('auth_user');
    }

    return {
      user: null,
      isAuthenticated: false,
      isLoading: false,
    };
  });

  const login = useCallback(async (email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await authApi.login(email, password);

      if (!ADMIN_ROLES.includes(response.user.role)) {
        setAuthState((prev) => ({ ...prev, isLoading: false }));
        throw new Error('UNAUTHORIZED_ROLE');
      }

      localStorage.setItem('auth_user', JSON.stringify(response.user));

      setAuthState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Clear local state even if server call fails
    }
    localStorage.removeItem('auth_user');
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>{children}</AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
