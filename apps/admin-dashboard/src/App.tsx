import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './components/common';
import type { UserRole } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
import {
  Login,
  Dashboard,
  Alerts,
  OperationalAlerts,
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
  FleetAssignments,
  AlertConfigDashboard,
  EventTypeConfigPage,
  EscalationTimingConfigPage,
  ConfigAuditLogPage,
} from './pages';
import './index.css';

const ALL_ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'OSTA_ADMIN', 'BOARD_ADMIN', 'SCHOOL_ADMIN'];

// Protected Route wrapper
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dashboard-bg flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user?.role || !ALL_ADMIN_ROLES.includes(user.role as UserRole)) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardLayout />;
};

// Public Route wrapper (redirects to dashboard if already logged in as admin)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user?.role && ALL_ADMIN_ROLES.includes(user.role as UserRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Role-based route guard — redirects to /dashboard if user lacks the required role
const RoleGuard: React.FC<{ allowedRoles: UserRole[]; children: React.ReactNode }> = ({
  allowedRoles,
  children,
}) => {
  const { user } = useAuth();
  if (!user?.role || !allowedRoles.includes(user.role as UserRole)) {
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

      {/* Protected routes — all require admin role */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/alerts/operational" element={<OperationalAlerts />} />
        <Route path="/routes" element={<RoutesPage />} />
        <Route path="/routes/planner" element={<RoutePlanner />} />
        <Route path="/students" element={<Students />} />
        <Route path="/videos" element={<Videos />} />
        <Route path="/settings" element={<Settings />} />
        <Route
          path="/vehicles"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN', 'OSTA_ADMIN']}>
              <Vehicles />
            </RoleGuard>
          }
        />
        <Route path="/compliance" element={<Compliance />} />
        <Route
          path="/boards"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN', 'OSTA_ADMIN']}>
              <BoardsList />
            </RoleGuard>
          }
        />
        <Route
          path="/schools"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN', 'OSTA_ADMIN', 'BOARD_ADMIN']}>
              <SchoolsList />
            </RoleGuard>
          }
        />
        <Route
          path="/users"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN']}>
              <UserManagement />
            </RoleGuard>
          }
        />
        <Route
          path="/tenant-overview"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN', 'OSTA_ADMIN', 'BOARD_ADMIN']}>
              <TenantDashboard />
            </RoleGuard>
          }
        />
        <Route path="/absences" element={<AbsenceManagement />} />
        <Route path="/fleet-assignments" element={<FleetAssignments />} />
        <Route path="/alert-config" element={<AlertConfigDashboard />} />
        <Route path="/alert-config/event-types" element={<EventTypeConfigPage />} />
        <Route path="/alert-config/escalation-timing" element={<EscalationTimingConfigPage />} />
        <Route path="/alert-config/audit" element={<ConfigAuditLogPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default App;
