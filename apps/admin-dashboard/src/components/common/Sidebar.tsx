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
    { path: '/students', icon: <Users size={20} />, label: 'Students' },
    { path: '/videos', icon: <Video size={20} />, label: 'Videos' },
    { path: '/settings', icon: <Settings size={20} />, label: 'Settings' },
];

const Sidebar: React.FC = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-dashboard-card border-r border-dashboard-border flex flex-col z-50">
            {/* Logo */}
            <div className="p-6 border-b border-dashboard-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                        <Bus size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-white text-lg">OSTA Admin</h1>
                        <p className="text-xs text-slate-400">Transport Management</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`
                        }
                    >
                        {item.icon}
                        <span className="font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* User & Logout */}
            <div className="p-4 border-t border-dashboard-border">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
                >
                    <LogOut size={20} />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
