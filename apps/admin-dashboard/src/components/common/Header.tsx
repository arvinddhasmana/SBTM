import React from 'react';
import { Bell, Search, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
    title: string;
    subtitle?: string;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
    const { user } = useAuth();

    return (
        <header className="h-16 bg-dashboard-card/50 backdrop-blur-xl border-b border-dashboard-border flex items-center justify-between px-6 sticky top-0 z-40">
            {/* Title */}
            <div>
                <h2 className="text-xl font-bold text-white">{title}</h2>
                {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative hidden md:block">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="pl-10 pr-4 py-2 bg-dashboard-bg border border-dashboard-border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 w-64"
                    />
                </div>

                {/* Notifications */}
                <button className="relative p-2 rounded-xl hover:bg-slate-800 transition-colors">
                    <Bell size={20} className="text-slate-400" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                </button>

                {/* User */}
                <div className="flex items-center gap-3 pl-4 border-l border-dashboard-border">
                    <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center">
                        <User size={18} className="text-white" />
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-sm font-medium text-white">{user?.name || 'Admin'}</p>
                        <p className="text-xs text-slate-400">{user?.role || 'Administrator'}</p>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
