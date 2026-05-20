import React from 'react';
import { Bell, Search, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, action, className }) => {
  const { user } = useAuth();

  return (
    <header
      className={`h-16 glass-header flex items-center justify-between px-6 sticky top-0 z-40 transition-all duration-300 ${className || ''}`}
    >
      {/* Title */}
      <div className="flex items-center gap-6">
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>
        {action && <div className="hidden lg:block h-8 w-[1px] bg-dashboard-border" />}
        {action && <div>{action}</div>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search trackers, routes..."
            className="glass-input pl-10 w-64 text-sm"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl hover:bg-white/5 transition-all group">
          <Bell size={20} className="text-slate-400 group-hover:text-white" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-lg shadow-rose-500/50" />
        </button>

        {/* Language */}
        <LanguageSwitcher />

        {/* User */}
        <div className="flex items-center gap-3 pl-4 border-l border-white/10">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <User size={18} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-white leading-tight">{user?.name || 'Admin'}</p>
            <p className="text-xs text-slate-500 font-medium truncate max-w-[100px]">
              {user?.role || 'Administrator'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
