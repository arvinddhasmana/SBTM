import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, School, Home, HelpCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import type { Child } from '../types';
import { useAlerts } from '../hooks/useAlerts';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Collect unique route IDs across all children to detect any active alert
    const routeIds = user?.children.map((c) => c.routeId) ?? [];
    const firstRouteId = routeIds[0];
    const { alert } = useAlerts(firstRouteId);

    if (!user) return null;

    const getStatusIcon = (status: Child['status']) => {
        switch (status) {
            case 'on_bus':
                return <MapPin className="h-5 w-5 text-blue-500" />;
            case 'at_school':
                return <School className="h-5 w-5 text-green-500" />;
            case 'at_home':
                return <Home className="h-5 w-5 text-gray-500" />;
            default:
                return <HelpCircle className="h-5 w-5 text-yellow-500" />;
        }
    };

    const getStatusText = (status: Child['status']) => {
        switch (status) {
            case 'on_bus': return 'On the Bus';
            case 'at_school': return 'At School';
            case 'at_home': return 'At Home';
            case 'unknown': return 'Status Unknown';
            default: return status;
        }
    };

    const getStatusColor = (status: Child['status']) => {
        switch (status) {
            case 'on_bus': return 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';
            case 'at_school': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
            case 'at_home': return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
            default: return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
        }
    };

    return (
        <div className="px-4 sm:px-0">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">My Children</h1>
            <p className="text-slate-400 mb-8">Real-time tracking and student presence overview.</p>

            {alert && (
                <div className="mb-8 flex items-start gap-4 rounded-2xl bg-pink-500/10 border border-pink-500/30 p-5 text-pink-100 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <AlertTriangle className="mt-0.5 h-6 w-6 flex-shrink-0 text-pink-500 animate-pulse" />
                    <div className="relative z-10">
                        <p className="font-bold text-lg uppercase tracking-wider text-pink-500">Emergency Alert</p>
                        <p className="mt-1 text-slate-200">{alert.message}</p>
                    </div>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {user.children.map((child) => (
                    <div key={child.id} className="glass-card overflow-hidden group hover:border-white/20 transition-all duration-300 transform hover:-translate-y-1">
                        <div className="p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 relative">
                                    <div className="absolute inset-0 bg-indigo-500/20 blur-lg rounded-full" />
                                    <img className="h-14 w-14 rounded-full border-2 border-white/10 relative z-10" src={child.avatarUrl} alt={child.name} />
                                </div>
                                <div className="ml-5">
                                    <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors">
                                        {child.name}
                                    </h3>
                                    <p className="text-sm text-slate-400 font-medium">{child.schoolName}</p>
                                </div>
                            </div>

                            <div className="mt-6 border-t border-white/5 pt-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <dt className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Route</dt>
                                        <dd className="mt-1 text-sm font-semibold text-slate-200">{child.routeId}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bus</dt>
                                        <dd className="mt-1 text-sm font-semibold text-slate-200">{child.vehicleId}</dd>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-between">
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold leading-none ${getStatusColor(child.status)} shadow-lg`}>
                                    {getStatusIcon(child.status)}
                                    <span className="ml-2 uppercase tracking-wide">{getStatusText(child.status)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/5 px-6 py-4 border-t border-white/5">
                            <button
                                onClick={() => navigate(`/map/${child.id}`)}
                                className="w-full flex justify-center items-center py-2.5 rounded-xl tactical-gradient-active text-white font-bold text-sm shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.5)] transition-all transform hover:scale-[1.02] active:scale-95"
                            >
                                Track Bus Live
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {user.children.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500">No children linked to your account.</p>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
