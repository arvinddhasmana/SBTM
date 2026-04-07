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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  label: string;
  allowedRoles?: UserRole[];
}

const ALL_ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'OSTA_ADMIN', 'BOARD_ADMIN', 'SCHOOL_ADMIN'];

const navItems: NavItem[] = [
  {
    path: '/dashboard',
    icon: <LayoutDashboard size={20} />,
    label: 'Dashboard',
    allowedRoles: ALL_ADMIN_ROLES,
  },
  { path: '/alerts', icon: <Bell size={20} />, label: 'Alerts', allowedRoles: ALL_ADMIN_ROLES },
  {
    path: '/alerts/operational',
    icon: <ClipboardList size={20} />,
    label: 'Operational',
    allowedRoles: ALL_ADMIN_ROLES,
  },
  { path: '/routes', icon: <Route size={20} />, label: 'Routes', allowedRoles: ALL_ADMIN_ROLES },
  {
    path: '/routes/planner',
    icon: <Wand2 size={20} />,
    label: 'Planner',
    allowedRoles: ALL_ADMIN_ROLES,
  },
  {
    path: '/vehicles',
    icon: <Bus size={20} />,
    label: 'Fleet',
    allowedRoles: ['SUPER_ADMIN', 'OSTA_ADMIN'],
  },
  {
    path: '/compliance',
    icon: <Shield size={20} />,
    label: 'Compliance',
    allowedRoles: ALL_ADMIN_ROLES,
  },
  {
    path: '/fleet-assignments',
    icon: <Truck size={20} />,
    label: 'Assignments',
    allowedRoles: ALL_ADMIN_ROLES,
  },
  {
    path: '/students',
    icon: <Users size={20} />,
    label: 'Students',
    allowedRoles: ALL_ADMIN_ROLES,
  },
  {
    path: '/absences',
    icon: <CalendarOff size={20} />,
    label: 'Absences',
    allowedRoles: ALL_ADMIN_ROLES,
  },
  {
    path: '/boards',
    icon: <Building2 size={20} />,
    label: 'Boards',
    allowedRoles: ['SUPER_ADMIN', 'OSTA_ADMIN'],
  },
  {
    path: '/schools',
    icon: <School size={20} />,
    label: 'Schools',
    allowedRoles: ['SUPER_ADMIN', 'OSTA_ADMIN', 'BOARD_ADMIN'],
  },
  { path: '/users', icon: <UserCog size={20} />, label: 'Users', allowedRoles: ['SUPER_ADMIN'] },
  {
    path: '/settings',
    icon: <Settings size={20} />,
    label: 'Settings',
    allowedRoles: ALL_ADMIN_ROLES,
  },
];

interface SidebarProps {
  width: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ width, isCollapsed, onToggleCollapse }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
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
            <h1 className="font-bold text-white text-lg">OSTA Admin</h1>
            <p className="text-xs text-slate-400">Transport Management</p>
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
            title={isCollapsed ? item.label : ''}
          >
            <div className="flex-shrink-0">{item.icon}</div>
            {!isCollapsed && (
              <span className="font-medium whitespace-nowrap animate-in slide-in-from-left-2">
                {item.label}
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
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          <div className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>
            <Shield size={20} className="group-hover:text-blue-400" />
          </div>
          {!isCollapsed && <span className="font-medium">Collapse Menu</span>}
        </button>

        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 ${
            isCollapsed ? 'justify-center p-3' : 'px-4 py-3'
          }`}
          title={isCollapsed ? 'Logout' : ''}
        >
          <LogOut size={20} />
          {!isCollapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
