import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/common';
import {
    Login,
    Dashboard,
    Alerts,
    Routes as RoutesPage,
    Students,
    Videos,
    Settings,
} from './pages';
import './index.css';

// Protected Route wrapper
const ProtectedRoute: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dashboard-bg flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen bg-dashboard-bg flex">
            <Sidebar />
            <main className="flex-1 ml-64">
                <Outlet />
            </main>
        </div>
    );
};

// Public Route wrapper (redirects to dashboard if already logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuth();

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

const AppRoutes: React.FC = () => {
    return (
        <Routes>
            {/* Public routes */}
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                }
            />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/routes" element={<RoutesPage />} />
                <Route path="/students" element={<Students />} />
                <Route path="/videos" element={<Videos />} />
                <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
};

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;
