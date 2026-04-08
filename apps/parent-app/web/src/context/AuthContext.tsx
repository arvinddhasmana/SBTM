import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { parentApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('parent_user');

    if (!storedUser) {
      setIsLoading(false);
      return;
    }

    // Validate the server-side session before trusting localStorage.
    // This catches the case where the cookie belongs to a different role
    // (e.g., an admin session from the admin dashboard) or has expired.
    parentApi.getMe().then((me) => {
      if (me && me.role === 'PARENT') {
        setUser(JSON.parse(storedUser));
      } else {
        // Session invalid or wrong role — clear stale state and force login.
        localStorage.removeItem('parent_user');
      }
      setIsLoading(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    const response = await parentApi.login(email, password);

    const children = await parentApi.getChildren();
    const nameParts = [response.user.firstName, response.user.lastName].filter(Boolean);

    const nextUser: User = {
      id: response.user.id,
      email: response.user.email,
      name: nameParts.length ? nameParts.join(' ') : response.user.email,
      children,
    };

    setUser(nextUser);
    localStorage.setItem('parent_user', JSON.stringify(nextUser));
  };

  const logout = async () => {
    try {
      await parentApi.logout();
    } catch {
      // Clear local state even if server call fails
    }
    setUser(null);
    localStorage.removeItem('parent_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
