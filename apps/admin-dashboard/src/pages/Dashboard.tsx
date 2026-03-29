import React, { useState, useEffect } from 'react';
import {
    Bus,
    Users,
    Bell,
    Route as RouteIcon,
    TrendingUp,
    LayoutDashboard,
    Activity,
    ShieldAlert,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header, LoadingSpinner, FloatingPanel } from '../components/common';
import { LiveMap } from '../components/map';
import { AlertList } from '../components/alerts';
import { PresenceList } from '../components/presence';
import { alertsApi, routesApi, presenceApi } from '../services/api';
import type { Alert, LiveLocation, StudentPresence, DashboardStats, Route } from '../types';

const Dashboard: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [locations, setLocations] = useState<LiveLocation[]>([]);
    const [students, setStudents] = useState<StudentPresence[]>([]);
    const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
    const [stats, setStats] = useState<DashboardStats>({
        activeRoutes: 0,
        totalStudents: 0,
        activeAlerts: 0,
        busesOnRoute: 0,
    });
    const navigate = useNavigate();

    const handleSelection = async (routeId?: string) => {
        if (!routeId) {
            setSelectedRoute(null);
            return;
        }

        try {
            const routeData = await routesApi.getRouteById(routeId);
            setSelectedRoute(routeData);
        } catch (error) {
            console.error('Error selecting route:', error);
            setSelectedRoute(null);
        }
    };

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

        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950">
                <LoadingSpinner size="lg" text="Initialising Tactical Command..." />
            </div>
        );
    }

    const statCards = [
        { icon: <RouteIcon size={18} />, label: 'Routes', value: stats.activeRoutes, color: 'text-blue-400' },
        { icon: <Bus size={18} />, label: 'Buses', value: stats.busesOnRoute, color: 'text-emerald-400' },
        { icon: <Users size={18} />, label: 'Boarded', value: stats.totalStudents, color: 'text-indigo-400' },
        { icon: <Bell size={18} />, label: 'Alerts', value: stats.activeAlerts, color: 'text-rose-400' },
    ];

    return (
        <div className="relative h-full w-full overflow-hidden bg-slate-950">
            {/* Background Map Layer */}
            <div className="absolute inset-0 z-0">
                <LiveMap
                    locations={locations}
                    selectedRoute={selectedRoute}
                    className="w-full h-full"
                />
            </div>

            {/* Tactical Overlays */}
            <div className="absolute inset-0 z-10 pointer-events-none">
                <Header title="Tactical Overview" subtitle="Real-time fleet intelligence" className="pointer-events-auto" />

                {/* Panel #3: Tactical Alerts */}
                <FloatingPanel
                    id="alerts"
                    title="Tactical Alerts"
                    icon={<ShieldAlert size={12} />}
                    anchor="right"
                    defaultPosition={{ x: 30, y: 80 }}
                    defaultSize={{ width: '280px', height: 'auto' }}
                    className="pointer-events-auto"
                >
                    <div className="space-y-2">
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                            <AlertList
                                alerts={alerts.slice(0, 8)}
                                onAlertClick={(alert) => handleSelection(alert.routeId)}
                                emptyMessage="No active alerts"
                            />
                        </div>
                        <button
                            onClick={() => navigate('/alerts')}
                            className="w-full py-1.5 glass-item rounded text-[9px] font-black text-blue-400 uppercase tracking-widest hover:bg-white/10"
                        >
                            Review All
                        </button>
                    </div>
                </FloatingPanel>

                {/* Panel #4: Live Passenger Feed */}
                <FloatingPanel
                    id="passengers"
                    title="Passenger Feed"
                    icon={<Users size={12} />}
                    anchor="left"
                    defaultPosition={{ x: 30, y: 80 }}
                    defaultSize={{ width: '280px', height: 'auto' }}
                    className="pointer-events-auto"
                >
                    <div className="space-y-2">
                        <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                            <PresenceList
                                students={students.slice(0, 5)}
                                onStudentClick={(student) => handleSelection(student.routeId)}
                                emptyMessage="No occupancy"
                            />
                        </div>
                        <button
                            onClick={() => navigate('/students')}
                            className="w-full py-1.5 glass-item rounded text-[9px] font-black text-blue-400 uppercase tracking-widest hover:bg-white/10"
                        >
                            Manifest
                        </button>
                    </div>
                </FloatingPanel>

                {/* Fixed Bottom Tactical Bar */}
                <div className="absolute bottom-4 left-4 right-4 flex items-end gap-2 pointer-events-none">
                    {/* Legend Panel (Mock for reference if not in LiveMap) */}
                    <div className="glass-card p-2 w-28 pointer-events-auto">
                        <div className="text-[8px] font-black text-slate-500 uppercase mb-1 tracking-widest">Legend</div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-[8px] font-bold text-slate-300">
                                <div className="w-2 h-2 rounded-full bg-green-500" /> Normal
                            </div>
                            <div className="flex items-center gap-2 text-[8px] font-bold text-slate-300">
                                <div className="w-2 h-2 rounded-full bg-yellow-500" /> Delayed
                            </div>
                            <div className="flex items-center gap-2 text-[8px] font-bold text-slate-300">
                                <div className="w-2 h-2 rounded-full bg-red-500" /> Emergency
                            </div>
                        </div>
                    </div>

                    {/* Panel #5: Mission Health (Fixed) */}
                    <div className="glass-card p-2 w-28 pointer-events-auto">
                        <div className="flex flex-col gap-1">
                            {[
                                { name: 'GPS', status: 'OK' },
                                { name: 'HUB', status: 'OK' },
                                { name: 'TELEM', status: 'OK' }
                            ].map((service, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-2 px-1.5 py-0.5 glass-item rounded">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1 h-1 bg-emerald-400 rounded-full shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
                                        <span className="text-[7.5px] font-black text-slate-300 uppercase">{service.name}</span>
                                    </div>
                                    <span className="text-[7.5px] font-black text-emerald-400 uppercase">{service.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Panel #2: Fleet Metrics (Fixed Row) */}
                    <div className="glass-card p-1 flex items-center gap-2 pointer-events-auto overflow-hidden">
                        {statCards.map((stat, i) => (
                            <div key={i} className="flex items-center gap-2 px-2 py-1 glass-item rounded-lg">
                                <div className={`${stat.color} scale-75`}>{stat.icon}</div>
                                <div className="flex flex-col -space-y-1">
                                    <span className="text-[9px] font-black text-white leading-tight">{stat.value}</span>
                                    <span className="text-[6.5px] font-black text-slate-500 uppercase tracking-tighter">{stat.label}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
