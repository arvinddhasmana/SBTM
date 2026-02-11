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
        const storedToken = localStorage.getItem('parent_auth_token');

        if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        const response = await parentApi.login(email, password);
        localStorage.setItem('parent_auth_token', response.accessToken);

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

    const logout = () => {
        setUser(null);
        localStorage.removeItem('parent_user');
        localStorage.removeItem('parent_auth_token');
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            login,
            logout,
            isLoading
        }}>
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
