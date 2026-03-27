import React from 'react';
import { Bell, Search, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, action }) => {
    const { user } = useAuth();

    return (
        <header
            className="h-16 flex items-center justify-between px-6 sticky top-0 z-40"
            style={{
                background:
                    'linear-gradient(135deg, rgba(6,10,24,0.95) 0%, rgba(8,15,32,0.97) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(30, 58, 95, 0.4)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
        >
            {/* Title */}
            <div className="flex items-center gap-5 min-w-0">
                <div className="min-w-0">
                    <h2 className="text-lg font-bold text-white truncate">{title}</h2>
                    {subtitle && (
                        <p className="text-xs text-slate-500 truncate">{subtitle}</p>
                    )}
                </div>
                {action && (
                    <>
                        <div
                            className="hidden lg:block h-8 w-px"
                            style={{ background: 'rgba(30, 58, 95, 0.6)' }}
                        />
                        <div className="hidden lg:block">{action}</div>
                    </>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 ml-4">
                {/* Search */}
                <div className="relative hidden md:block">
                    <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                        type="text"
                        placeholder="Search…"
                        className="pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 rounded-xl w-52 transition-all duration-200"
                        style={{
                            background: 'rgba(6, 13, 31, 0.7)',
                            border: '1px solid rgba(30, 58, 95, 0.5)',
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(14, 165, 233, 0.4)';
                            e.currentTarget.style.boxShadow =
                                '0 0 0 3px rgba(14, 165, 233, 0.08)';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(30, 58, 95, 0.5)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    />
                </div>

                {/* Notifications */}
                <button
                    type="button"
                    aria-label="Notifications"
                    className="relative p-2 rounded-xl transition-colors btn-icon"
                >
                    <Bell size={18} />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                </button>

                {/* User Avatar */}
                <div
                    className="flex items-center gap-3 pl-3"
                    style={{ borderLeft: '1px solid rgba(30, 58, 95, 0.5)' }}
                >
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md">
                        {user?.name?.[0]?.toUpperCase() ?? <User size={14} />}
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-xs font-semibold text-white leading-tight">
                            {user?.name ?? 'Admin'}
                        </p>
                        <p className="text-xs text-slate-500 leading-tight">{user?.role}</p>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;

