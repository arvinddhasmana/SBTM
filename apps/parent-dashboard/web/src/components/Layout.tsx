import React, { useState } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bus, LogOut, User, Bell, Menu, X, ClipboardX, Settings } from 'lucide-react';
import { useAlerts } from '../hooks/useAlerts';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Show a dot on the bell when there is an active emergency alert on any of the parent's routes
  const routeIds =
    user?.children
      ?.flatMap((c) => [c.amRouteId, c.pmRouteId, c.routeId])
      .filter((id): id is string => !!id) ?? [];
  const { alerts } = useAlerts(routeIds);
  const hasUnread = alerts.length > 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass-card border-x-0 border-t-0 rounded-none bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/dashboard" className="flex-shrink-0 flex items-center group">
                <div className="p-2 transition-transform group-hover:scale-110">
                  <Bus className="h-8 w-8 text-indigo-500 transition-colors group-hover:text-indigo-400" />
                </div>
                <span className="ml-2 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                  Parent Portal
                </span>
              </Link>
            </div>

            <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-6">
              <Link
                to="/absence"
                className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors"
              >
                <ClipboardX className="h-5 w-5" />
                <span>Report Absence</span>
              </Link>
              <Link
                to="/notifications"
                className="relative p-2 rounded-xl bg-slate-800/50 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all border border-white/5"
                aria-label="View notifications"
              >
                <Bell className="h-5 w-5" />
                {hasUnread && (
                  <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
                )}
              </Link>
              <Link
                to="/settings"
                className="p-2 rounded-xl bg-slate-800/50 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all border border-white/5"
                aria-label="Notification settings"
              >
                <Settings className="h-5 w-5" />
              </Link>

              <div className="ml-4 pl-4 border-l border-white/10 flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-semibold text-slate-200">{user?.name}</span>
                  <span className="text-[10px] text-slate-500 tracking-wider">PARENT</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-slate-800/50 text-slate-400 hover:text-pink-400 hover:bg-slate-800 transition-all border border-white/5"
                  title="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="-mr-2 flex items-center sm:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                <span className="sr-only">Open main menu</span>
                {isMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              <Link
                to="/dashboard"
                className="bg-blue-50 border-blue-500 text-blue-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/absence"
                className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Report Absence
              </Link>
              <Link
                to="/notifications"
                className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Notifications
                {hasUnread && (
                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Alert
                  </span>
                )}
              </Link>
              <Link
                to="/settings"
                className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Settings
              </Link>
            </div>
            <div className="pt-4 pb-4 border-t border-gray-200">
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">{user?.name}</div>
                  <div className="text-sm font-medium text-gray-500">{user?.email}</div>
                </div>
                <Link
                  to="/notifications"
                  className="ml-auto flex-shrink-0 relative p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  aria-label="View notifications"
                >
                  <Bell className="h-6 w-6" />
                  {hasUnread && (
                    <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                  )}
                </Link>
              </div>
              <div className="mt-3 space-y-1">
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
