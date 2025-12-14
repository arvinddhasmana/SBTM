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
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
    });

    const login = useCallback(async (email: string, password: string) => {
        setAuthState(prev => ({ ...prev, isLoading: true }));

        try {
            const response = await authApi.login(email, password);

            setAuthState({
                user: response.user,
                token: response.token,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error) {
            setAuthState(prev => ({ ...prev, isLoading: false }));
            throw error;
        }
    }, []);

    const logout = useCallback(() => {
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
