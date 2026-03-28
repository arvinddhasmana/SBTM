import React, { useState, useEffect } from 'react';
import {
    Bus,
    Users,
    Bell,
    Route as RouteIcon,
    TrendingUp,
    AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header, Card, LoadingSpinner } from '../components/common';
import { LiveMap } from '../components/map';
import { AlertList } from '../components/alerts';
import { PresenceList } from '../components/presence';
import { alertsApi, routesApi, presenceApi } from '../services/api';
import type { Alert, LiveLocation, StudentPresence, DashboardStats } from '../types';

const Dashboard: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [locations, setLocations] = useState<LiveLocation[]>([]);
    const [students, setStudents] = useState<StudentPresence[]>([]);
    const [stats, setStats] = useState<DashboardStats>({
        activeRoutes: 0,
        totalStudents: 0,
        activeAlerts: 0,
        busesOnRoute: 0,
    });
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [alertsData, locationsData, routesData] = await Promise.all([
                    alertsApi.getActiveAlerts(),
                    routesApi.getAllLiveLocations(),
                    routesApi.getActiveRoutes(),
                ]);

                const studentsData = await presenceApi.getAllBoardedStudents(
                    routesData.map((route) => route.id),
                );

                setAlerts(alertsData);
                setLocations(locationsData);
                setStudents(studentsData);
                setStats({
                    activeRoutes: routesData.length,
                    totalStudents: studentsData.length,
                    activeAlerts: alertsData.length,
                    busesOnRoute: locationsData.length,
                });
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

        // Refresh data every 10 seconds for responsive map updates
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <LoadingSpinner size="lg" text="Loading dashboard..." />
            </div>
        );
    }

    const statCards = [
        {
            icon: <RouteIcon size={22} />,
            label: 'Active Routes',
            value: stats.activeRoutes,
            gradient: 'from-blue-500 to-blue-700',
            shadow: 'shadow-blue-500/20'
        },
        {
            icon: <Bus size={22} />,
            label: 'Buses On Route',
            value: stats.busesOnRoute,
            gradient: 'from-emerald-500 to-emerald-700',
            shadow: 'shadow-emerald-500/20'
        },
        {
            icon: <Users size={22} />,
            label: 'Students Onboard',
            value: stats.totalStudents,
            gradient: 'from-indigo-500 to-indigo-700',
            shadow: 'shadow-indigo-500/20'
        },
        {
            icon: <Bell size={22} />,
            label: 'Active Alerts',
            value: stats.activeAlerts,
            gradient: 'from-rose-500 to-rose-700',
            shadow: 'shadow-rose-500/20'
        },
    ];

    return (
        <div className="min-h-screen bg-slate-950">
            <Header title="Tactical Overview" subtitle="Real-time fleet intelligence" />

            <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards.map((stat, i) => (
                        <div key={i} className="glass-card inner-glow p-6 group cursor-pointer hover:border-white/20 transition-all duration-300">
                            <div className="flex items-center gap-5">
                                <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.gradient} text-white shadow-xl ${stat.shadow} group-hover:scale-110 transition-transform duration-300`}>
                                    {stat.icon}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-3xl font-black text-white tracking-tighter">{stat.value}</p>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">{stat.label}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Live Map Section */}
                    <Card title="Fleet Status Map" className="lg:col-span-2 overflow-hidden border-blue-500/10 hover:border-blue-500/20">
                        <div className="h-[500px] -mx-6 -mb-6 mt-2">
                            <LiveMap locations={locations} />
                        </div>
                    </Card>

                    {/* Active Alerts Section */}
                    <Card
                        title="Tactical Alerts"
                        action={
                            <button
                                onClick={() => navigate('/alerts')}
                                className="text-xs font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors"
                            >
                                All Alerts
                            </button>
                        }
                        className="bg-rose-500/[0.02] border-rose-500/10"
                    >
                        <div className="custom-scrollbar overflow-y-auto max-h-[440px] pr-2">
                            <AlertList
                                alerts={alerts.slice(0, 8)}
                                onAlertClick={(alert) => navigate(`/alerts?id=${alert.id}`)}
                                emptyMessage="System Clear: No active alerts"
                            />
                        </div>
                        {alerts.length > 0 && (
                            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-white/5 text-[11px] font-bold text-rose-400 uppercase tracking-widest">
                                <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                                <span>{alerts.length} Critical Intervention{alerts.length !== 1 ? 's' : ''} Required</span>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Secondary Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-8">
                    {/* Students Presence Section */}
                    <Card
                        title="Live Passenger Feed"
                        action={
                            <button
                                onClick={() => navigate('/students')}
                                className="text-xs font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors"
                            >
                                Full manifest
                            </button>
                        }
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <PresenceList students={students.slice(0, 6)} emptyMessage="Fleet Empty: No active passengers" />
                        </div>
                    </Card>

                    {/* System Diagnostics Section */}
                    <Card title="Mission Health">
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                { name: 'GPS Tracking Mesh', status: 'Optimal', delay: '12ms' },
                                { name: 'Tactical Alert Hub', status: 'Live', delay: '8ms' },
                                { name: 'Telemetry Streaming', status: 'Synced', delay: '45ms' }
                            ].map((service, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 glass-item rounded-xl group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50 group-hover:scale-150 transition-transform" />
                                        <span className="text-sm font-bold text-slate-300 tracking-tight">{service.name}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{service.delay}</span>
                                        <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">{service.status}</span>
                                    </div>
                                </div>
                            ))}
                            <div className="mt-4 pt-6 border-t border-white/5 flex items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">
                                <TrendingUp size={16} className="text-emerald-500" />
                                <span>All Strategic Systems Operational</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
