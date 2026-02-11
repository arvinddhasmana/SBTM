import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { User, AuthState } from '../types';
import { authApi } from '../services/api/auth.api';

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
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');

        if (storedToken && storedUser) {
            return {
                user: JSON.parse(storedUser),
                token: storedToken,
                isAuthenticated: true,
                isLoading: false,
            };
        }

        return {
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
        };
    });

    const login = useCallback(async (email: string, password: string) => {
        setAuthState(prev => ({ ...prev, isLoading: true }));

        try {
            const response = await authApi.login(email, password);

            localStorage.setItem('auth_token', response.accessToken);
            localStorage.setItem('auth_user', JSON.stringify(response.user));

            setAuthState({
                user: response.user,
                token: response.accessToken,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error) {
            setAuthState(prev => ({ ...prev, isLoading: false }));
            throw error;
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
        });
    }, []);

    return (
        <AuthContext.Provider value={{ ...authState, login, logout }}>
            {children}
        </AuthContext.Provider>
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
