import React, { useState } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bus, LogOut, User, Bell, Menu, X, ClipboardX } from 'lucide-react';
import { useAlerts } from '../hooks/useAlerts';

const Layout: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Show a dot on the bell when there is an active emergency alert on the parent's first route
    const firstRouteId = user?.children?.[0]?.routeId;
    const { alert: activeAlert } = useAlerts(firstRouteId);
    const hasUnread = !!activeAlert;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            {/* Navigation */}
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <Link to="/dashboard" className="flex-shrink-0 flex items-center">
                                <Bus className="h-8 w-8 text-blue-600" />
                                <span className="ml-2 text-xl font-bold text-gray-900">Parent Portal</span>
                            </Link>
                        </div>

                        <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
                            <Link
                                to="/absence"
                                className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700"
                                aria-label="Report an absence"
                            >
                                <ClipboardX className="h-5 w-5" />
                                <span>Report Absence</span>
                            </Link>
                            <Link
                                to="/notifications"
                                className="relative p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                aria-label="View notifications"
                            >
                                <Bell className="h-6 w-6" />
                                {hasUnread && (
                                    <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" aria-label="Unread alert" />
                                )}
                            </Link>

                            <div className="ml-3 relative flex items-center">
                                <span className="mr-2 text-sm font-medium text-gray-700">{user?.name}</span>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
                                >
                                    <LogOut className="h-5 w-5 ml-1" />
                                    <span className="ml-1">Sign out</span>
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
