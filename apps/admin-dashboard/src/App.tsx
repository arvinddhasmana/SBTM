import React, { useState } from 'react';
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
    BoardsList,
    SchoolsList,
    Vehicles,
    RoutePlanner,
    Compliance,
    UserManagement,
    TenantDashboard,
    AbsenceManagement,
} from './pages';
import './index.css';

// Protected Route wrapper
const ProtectedRoute: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dashboard-bg flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <div className="text-slate-400 text-sm">Loading…</div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const mainMargin = sidebarCollapsed ? 'ml-16' : 'ml-60';

    return (
        <div className="min-h-screen bg-dashboard-bg flex">
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
            />
            <main className={`flex-1 ${mainMargin} transition-all duration-300 min-w-0`}>
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
                <Route path="/routes/planner" element={<RoutePlanner />} />
                <Route path="/students" element={<Students />} />
                <Route path="/videos" element={<Videos />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/vehicles" element={<Vehicles />} />
                <Route path="/compliance" element={<Compliance />} />
                <Route path="/boards" element={<BoardsList />} />
                <Route path="/schools" element={<SchoolsList />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/tenant-overview" element={<TenantDashboard />} />
                <Route path="/absences" element={<AbsenceManagement />} />
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

