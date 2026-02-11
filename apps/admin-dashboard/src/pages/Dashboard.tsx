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

        // Refresh data every 30 seconds
        const interval = setInterval(fetchData, 30000);
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
        { icon: <RouteIcon size={20} />, label: 'Active Routes', value: stats.activeRoutes, color: 'text-primary-500' },
        { icon: <Bus size={20} />, label: 'Buses On Route', value: stats.busesOnRoute, color: 'text-green-500' },
        { icon: <Users size={20} />, label: 'Students Onboard', value: stats.totalStudents, color: 'text-blue-500' },
        { icon: <Bell size={20} />, label: 'Active Alerts', value: stats.activeAlerts, color: 'text-red-500' },
    ];

    return (
        <>
            <Header title="Dashboard" subtitle="Real-time fleet overview" />

            <div className="p-6 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {statCards.map((stat, i) => (
                        <Card key={i} className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl bg-dashboard-bg ${stat.color}`}>
                                {stat.icon}
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{stat.value}</p>
                                <p className="text-sm text-slate-400">{stat.label}</p>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Map */}
                    <Card title="Live Fleet Map" className="lg:col-span-2">
                        <div className="h-[400px]">
                            <LiveMap locations={locations} />
                        </div>
                    </Card>

                    {/* Alerts */}
                    <Card
                        title="Active Alerts"
                        action={
                            <button
                                onClick={() => navigate('/alerts')}
                                className="text-sm text-primary-400 hover:text-primary-300"
                            >
                                View All
                            </button>
                        }
                    >
                        <AlertList
                            alerts={alerts.slice(0, 5)}
                            onAlertClick={(alert) => navigate(`/alerts?id=${alert.id}`)}
                            emptyMessage="No active alerts"
                        />
                        {alerts.length > 0 && (
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-dashboard-border text-sm text-yellow-400">
                                <AlertTriangle size={16} />
                                <span>{alerts.length} alert{alerts.length !== 1 ? 's' : ''} require attention</span>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Secondary Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Students */}
                    <Card
                        title="Students Onboard"
                        action={
                            <button
                                onClick={() => navigate('/students')}
                                className="text-sm text-primary-400 hover:text-primary-300"
                            >
                                View All
                            </button>
                        }
                    >
                        <PresenceList students={students.slice(0, 5)} emptyMessage="No students currently onboard" />
                    </Card>

                    {/* Quick Stats */}
                    <Card title="System Health">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-dashboard-bg rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-slate-300">GPS Tracking Service</span>
                                </div>
                                <span className="text-sm text-green-400">Online</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-dashboard-bg rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-slate-300">Alerts Service</span>
                                </div>
                                <span className="text-sm text-green-400">Online</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-dashboard-bg rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-slate-300">Video Service</span>
                                </div>
                                <span className="text-sm text-green-400">Online</span>
                            </div>
                            <div className="mt-4 pt-4 border-t border-dashboard-border flex items-center gap-2 text-sm text-slate-400">
                                <TrendingUp size={16} className="text-green-500" />
                                <span>All systems operational</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </>
    );
};

export default Dashboard;
