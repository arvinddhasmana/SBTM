import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user data
const MOCK_USER: User = {
    id: 'parent-123',
    name: 'Jane Doe',
    email: 'jane@example.com',
    children: [
        {
            id: 'child-1',
            name: 'Alice Doe',
            schoolName: 'Springfield Elementary',
            routeId: 'route-456',
            vehicleId: 'bus-123',
            status: 'on_bus',
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
        },
        {
            id: 'child-2',
            name: 'Bob Doe',
            schoolName: 'Springfield High',
            routeId: 'route-789',
            vehicleId: 'bus-456',
            status: 'at_school',
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
        },
    ],
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check local storage for persisted session
        const storedUser = localStorage.getItem('parent_app_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        // Simulate API call
        return new Promise<void>((resolve, reject) => {
            setTimeout(() => {
                if (email && password) {
                    setUser(MOCK_USER);
                    localStorage.setItem('parent_app_user', JSON.stringify(MOCK_USER));
                    resolve();
                } else {
                    reject(new Error('Invalid credentials'));
                }
            }, 1000);
        });
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('parent_app_user');
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
