import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Bell,
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
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
    path: string;
    icon: React.ReactNode;
    label: string;
}

const navItems: NavItem[] = [
    { path: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/alerts', icon: <Bell size={20} />, label: 'Alerts' },
    { path: '/routes', icon: <Route size={20} />, label: 'Routes' },
    { path: '/routes/planner', icon: <Wand2 size={20} />, label: 'Planner' },
    { path: '/vehicles', icon: <Bus size={20} />, label: 'Fleet' },
    { path: '/compliance', icon: <Shield size={20} />, label: 'Compliance' },
    { path: '/students', icon: <Users size={20} />, label: 'Students' },
    { path: '/videos', icon: <Video size={20} />, label: 'Videos' },
    { path: '/boards', icon: <Building2 size={20} />, label: 'Boards' },
    { path: '/schools', icon: <School size={20} />, label: 'Schools' },
    { path: '/settings', icon: <Settings size={20} />, label: 'Settings' },
];

interface SidebarProps {
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onToggleCollapse }) => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const sidebarWidth = collapsed ? 'w-16' : 'w-60';

    return (
        <aside
            className={`fixed left-0 top-0 h-screen ${sidebarWidth} glass-sidebar flex flex-col z-50 transition-all duration-300 ease-in-out`}
        >
            {/* ── Logo ─────────────────────────────────────────────── */}
            <div
                className={`flex items-center h-16 border-b shrink-0 transition-all duration-300 ${
                    collapsed ? 'justify-center px-2' : 'gap-3 px-4'
                }`}
                style={{ borderColor: 'rgba(30, 58, 95, 0.5)' }}
            >
                <div className="w-9 h-9 flex-shrink-0 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                    <Bus size={20} className="text-white" />
                </div>
                {!collapsed && (
                    <div className="overflow-hidden">
                        <h1 className="font-bold text-white text-sm leading-tight">OSTA Admin</h1>
                        <p className="text-xs text-slate-500 leading-tight">Transport Management</p>
                    </div>
                )}
            </div>

            {/* ── Collapse toggle button ────────────────────────────── */}
            {onToggleCollapse && (
                <button
                    type="button"
                    onClick={onToggleCollapse}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    className="absolute -right-3 top-12 w-6 h-6 rounded-full flex items-center justify-center z-20 shadow-md border"
                    style={{
                        background: 'rgba(13, 27, 51, 0.95)',
                        borderColor: 'rgba(30, 58, 95, 0.7)',
                    }}
                >
                    {collapsed ? (
                        <ChevronRight size={12} className="text-primary-400" />
                    ) : (
                        <ChevronLeft size={12} className="text-primary-400" />
                    )}
                </button>
            )}

            {/* ── Navigation ───────────────────────────────────────── */}
            <nav
                className={`flex-1 py-3 space-y-0.5 overflow-y-auto custom-scrollbar ${
                    collapsed ? 'px-2' : 'px-3'
                }`}
            >
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                            `nav-item ${isActive ? 'nav-item-active' : ''} ${
                                collapsed ? 'justify-center px-2' : ''
                            }`
                        }
                    >
                        <span className="flex-shrink-0">{item.icon}</span>
                        {!collapsed && (
                            <span className="truncate">{item.label}</span>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* ── User Info + Logout ────────────────────────────────── */}
            <div
                className={`shrink-0 border-t py-3 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}
                style={{ borderColor: 'rgba(30, 58, 95, 0.5)' }}
            >
                {!collapsed && user && (
                    <div className="flex items-center gap-3 px-3 py-2 mb-1">
                        <div className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-primary-600 to-cyan-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                            {(user.name ?? user.email)?.[0]?.toUpperCase() ?? 'A'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-semibold text-white truncate">
                                {user.name ?? user.email}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{user.role}</p>
                        </div>
                    </div>
                )}
                <button
                    type="button"
                    onClick={handleLogout}
                    title={collapsed ? 'Logout' : undefined}
                    className={`nav-item w-full hover:text-rose-400 hover:border-rose-500/20 ${
                        collapsed ? 'justify-center px-2' : ''
                    }`}
                    style={{
                        background: 'transparent',
                        border: '1px solid transparent',
                    }}
                >
                    <LogOut size={18} className="flex-shrink-0" />
                    {!collapsed && <span>Logout</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;

