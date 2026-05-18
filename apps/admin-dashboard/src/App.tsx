import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PageVisibilityProvider, usePageVisibility } from './context/PageVisibilityContext';
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
  NotificationRoutingConfigPage,
  WorkflowConfigPage,
  ChangeRequestsPage,
  ConfigAuditLogPage,
  GpsSourceSettingsPage,
  PageVisibilityManagement,
  StaImport,
} from './pages';
import './index.css';

const ALL_ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'STA_ADMIN', 'BOARD_ADMIN', 'SCHOOL_ADMIN'];

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

// Visibility guard — redirects to /dashboard if the page has been hidden by Super Admin.
// Super Admin bypasses this check and always has access.
const VisibilityGuard: React.FC<{ pageKey: string; children: React.ReactNode }> = ({
  pageKey,
  children,
}) => {
  const { user } = useAuth();
  const { isPageVisible } = usePageVisibility();
  if (user?.role !== 'SUPER_ADMIN' && !isPageVisible(pageKey)) {
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
        <Route
          path="/dashboard"
          element={
            <VisibilityGuard pageKey="dashboard">
              <Dashboard />
            </VisibilityGuard>
          }
        />
        <Route
          path="/alerts"
          element={
            <VisibilityGuard pageKey="alerts">
              <Alerts />
            </VisibilityGuard>
          }
        />
        <Route
          path="/alerts/operational"
          element={
            <VisibilityGuard pageKey="alerts/operational">
              <OperationalAlerts />
            </VisibilityGuard>
          }
        />
        <Route
          path="/routes"
          element={
            <VisibilityGuard pageKey="routes">
              <RoutesPage />
            </VisibilityGuard>
          }
        />
        <Route
          path="/routes/planner"
          element={
            <VisibilityGuard pageKey="routes/planner">
              <RoutePlanner />
            </VisibilityGuard>
          }
        />
        <Route
          path="/students"
          element={
            <VisibilityGuard pageKey="students">
              <Students />
            </VisibilityGuard>
          }
        />
        <Route
          path="/videos"
          element={
            <VisibilityGuard pageKey="videos">
              <Videos />
            </VisibilityGuard>
          }
        />
        <Route path="/settings" element={<Settings />} />
        <Route
          path="/vehicles"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN', 'STA_ADMIN']}>
              <VisibilityGuard pageKey="vehicles">
                <Vehicles />
              </VisibilityGuard>
            </RoleGuard>
          }
        />
        <Route
          path="/compliance"
          element={
            <VisibilityGuard pageKey="compliance">
              <Compliance />
            </VisibilityGuard>
          }
        />
        <Route
          path="/boards"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN', 'STA_ADMIN']}>
              <VisibilityGuard pageKey="boards">
                <BoardsList />
              </VisibilityGuard>
            </RoleGuard>
          }
        />
        <Route
          path="/schools"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN', 'STA_ADMIN', 'BOARD_ADMIN']}>
              <VisibilityGuard pageKey="schools">
                <SchoolsList />
              </VisibilityGuard>
            </RoleGuard>
          }
        />
        <Route
          path="/users"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN']}>
              <VisibilityGuard pageKey="users">
                <UserManagement />
              </VisibilityGuard>
            </RoleGuard>
          }
        />
        <Route
          path="/tenant-overview"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN', 'STA_ADMIN', 'BOARD_ADMIN']}>
              <VisibilityGuard pageKey="tenant-overview">
                <TenantDashboard />
              </VisibilityGuard>
            </RoleGuard>
          }
        />
        <Route
          path="/absences"
          element={
            <VisibilityGuard pageKey="absences">
              <AbsenceManagement />
            </VisibilityGuard>
          }
        />
        <Route
          path="/fleet-assignments"
          element={
            <VisibilityGuard pageKey="fleet-assignments">
              <FleetAssignments />
            </VisibilityGuard>
          }
        />
        <Route
          path="/alert-config"
          element={
            <VisibilityGuard pageKey="alert-config">
              <AlertConfigDashboard />
            </VisibilityGuard>
          }
        />
        <Route path="/alert-config/event-types" element={<EventTypeConfigPage />} />
        <Route path="/alert-config/escalation-timing" element={<EscalationTimingConfigPage />} />
        <Route
          path="/alert-config/notification-routing"
          element={<NotificationRoutingConfigPage />}
        />
        <Route path="/alert-config/workflow" element={<WorkflowConfigPage />} />
        <Route path="/alert-config/change-requests" element={<ChangeRequestsPage />} />
        <Route path="/alert-config/audit" element={<ConfigAuditLogPage />} />
        <Route
          path="/settings/gps-source"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN']}>
              <VisibilityGuard pageKey="settings/gps-source">
                <GpsSourceSettingsPage />
              </VisibilityGuard>
            </RoleGuard>
          }
        />
        <Route
          path="/page-visibility"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN']}>
              <PageVisibilityManagement />
            </RoleGuard>
          }
        />
        <Route
          path="/import"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN', 'STA_ADMIN', 'BOARD_ADMIN']}>
              <VisibilityGuard pageKey="import">
                <StaImport />
              </VisibilityGuard>
            </RoleGuard>
          }
        />
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
          <PageVisibilityProvider>
            <AppRoutes />
          </PageVisibilityProvider>
        </AuthProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default App;
