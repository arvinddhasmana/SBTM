import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Bell,
  ClipboardList,
  Route,
  Users,
  Video,
  Settings,
  LogOut,
  Bus,
  Building2,
  School,
  Wand2,
  Shield,
  UserCog,
  CalendarOff,
  Truck,
  Sliders,
  Cpu,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  labelKey: string;
  allowedRoles?: UserRole[];
}

const ALL_ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'OSTA_ADMIN', 'BOARD_ADMIN', 'SCHOOL_ADMIN'];

const navItems: NavItem[] = [
  {
    path: '/dashboard',
    icon: <LayoutDashboard size={20} />,
    labelKey: 'nav.dashboard',
    allowedRoles: ALL_ADMIN_ROLES,
  },
  {
    path: '/alerts',
    icon: <Bell size={20} />,
    labelKey: 'nav.alerts',
    allowedRoles: ALL_ADMIN_ROLES,
  },
  {
    path: '/alerts/operational',
    icon: <ClipboardList size={20} />,
    labelKey: 'nav.operational',
    allowedRoles: ALL_ADMIN_ROLES,
  },
  {
    path: '/routes',
    icon: <Route size={20} />,
    labelKey: 'nav.routes',
    allowedRoles: ALL_ADMIN_ROLES,
  },
  {
    path: '/routes/planner',
    icon: <Wand2 size={20} />,
    labelKey: 'nav.planner',
    allowedRoles: ALL_ADMIN_ROLES,
  },
  {
    path: '/vehicles',
    icon: <Bus size={20} />,
    labelKey: 'nav.fleet',
    allowedRoles: ['SUPER_ADMIN', 'OSTA_ADMIN'],
  },
  {
    path: '/compliance',
    icon: <Shield size={20} />,
    labelKey: 'nav.compliance',
    allowedRoles: ALL_ADMIN_ROLES,
  },
  {
    path: '/fleet-assignments',
    icon: <Truck size={20} />,
    labelKey: 'nav.assignments',
    allowedRoles: ALL_ADMIN_ROLES,
  },
  {
    path: '/students',
    icon: <Users size={20} />,
    labelKey: 'nav.students',
    allowedRoles: ALL_ADMIN_ROLES,
  },
  {
    path: '/absences',
    icon: <CalendarOff size={20} />,
    labelKey: 'nav.absences',
    allowedRoles: ALL_ADMIN_ROLES,
  },
  {
    path: '/boards',
    icon: <Building2 size={20} />,
    labelKey: 'nav.boards',
    allowedRoles: ['SUPER_ADMIN', 'OSTA_ADMIN'],
  },
  {
    path: '/schools',
    icon: <School size={20} />,
    labelKey: 'nav.schools',
    allowedRoles: ['SUPER_ADMIN', 'OSTA_ADMIN', 'BOARD_ADMIN'],
  },
  {
    path: '/users',
    icon: <UserCog size={20} />,
    labelKey: 'nav.users',
    allowedRoles: ['SUPER_ADMIN'],
  },
  {
    path: '/alert-config',
    icon: <Sliders size={20} />,
    labelKey: 'nav.alertConfig',
    allowedRoles: ALL_ADMIN_ROLES,
  },
  {
    path: '/settings/gps-source',
    icon: <Cpu size={20} />,
    labelKey: 'nav.gpsSource',
    allowedRoles: ['SUPER_ADMIN'],
  },
  {
    path: '/settings',
    icon: <Settings size={20} />,
    labelKey: 'nav.settings',
    allowedRoles: ALL_ADMIN_ROLES,
  },
];

interface SidebarProps {
  width: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ width, isCollapsed, onToggleCollapse }) => {
  const { t } = useTranslation('common');
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const visibleItems = navItems.filter(
    (item) =>
      !item.allowedRoles || (user?.role && item.allowedRoles.includes(user.role as UserRole)),
  );

  return (
    <aside
      style={{ width }}
      className={`fixed left-0 top-0 h-screen bg-dashboard-card border-r border-dashboard-border flex flex-col z-50 transition-all duration-300 ease-in-out ${isCollapsed ? 'items-center' : ''}`}
    >
      {/* Logo */}
      <div
        className={`p-6 border-b border-dashboard-border w-full flex items-center ${isCollapsed ? 'justify-center p-4' : 'gap-3'}`}
      >
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg shadow-blue-500/25">
          <Bus size={24} className="text-white" />
        </div>
        {!isCollapsed && (
          <div className="animate-in fade-in duration-300 group">
            <h1 className="font-bold text-white text-lg">{t('app.title')}</h1>
            <p className="text-xs text-slate-400">{t('app.subtitle')}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav
        className={`flex-1 p-4 space-y-1 w-full overflow-y-auto custom-scrollbar ${isCollapsed ? 'px-2' : ''}`}
      >
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl transition-all duration-200 group ${
                isCollapsed ? 'justify-center p-3' : 'px-4 py-3'
              } ${
                isActive
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
              }`
            }
            title={isCollapsed ? t(item.labelKey) : ''}
          >
            <div className="flex-shrink-0">{item.icon}</div>
            {!isCollapsed && (
              <span className="font-medium whitespace-nowrap animate-in slide-in-from-left-2">
                {t(item.labelKey)}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User & Logout */}
      <div
        className={`p-4 border-t border-dashboard-border w-full space-y-2 ${isCollapsed ? 'px-2' : ''}`}
      >
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-200 group"
          title={isCollapsed ? t('nav.expandMenu') : t('nav.collapseMenu')}
        >
          <div className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>
            <Shield size={20} className="group-hover:text-blue-400" />
          </div>
          {!isCollapsed && <span className="font-medium">{t('nav.collapseMenu')}</span>}
        </button>

        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 ${
            isCollapsed ? 'justify-center p-3' : 'px-4 py-3'
          }`}
          title={isCollapsed ? t('nav.logout') : ''}
        >
          <LogOut size={20} />
          {!isCollapsed && <span className="font-medium">{t('nav.logout')}</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
