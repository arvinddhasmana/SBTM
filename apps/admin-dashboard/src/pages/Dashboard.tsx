import React, { useState, useEffect } from 'react';
import {
    Bus,
    Users,
    Bell,
    Route as RouteIcon,
    TrendingUp,
    AlertTriangle,
    Activity,
    Wifi,
    WifiOff,
    ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header, Card, LoadingSpinner, CollapsibleSection } from '../components/common';
import { LiveMap } from '../components/map';
import { AlertList } from '../components/alerts';
import { PresenceList } from '../components/presence';
import { alertsApi, routesApi, presenceApi } from '../services/api';
import type { Alert, LiveLocation, StudentPresence, DashboardStats } from '../types';

const SERVICE_STATUSES = [
    { label: 'GPS Tracking', key: 'gps' },
    { label: 'Alerts Service', key: 'alerts' },
    { label: 'Presence Service', key: 'presence' },
    { label: 'Video Service', key: 'video' },
] as const;

const Dashboard: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [locations, setLocations] = useState<LiveLocation[]>([]);
    const [students, setStudents] = useState<StudentPresence[]>([]);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
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
                setLastRefreshed(new Date());
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
            <div className="flex items-center justify-center h-screen">
                <LoadingSpinner size="lg" text="Loading dashboard…" />
            </div>
        );
    }

    const statCards = [
        {
            icon: <RouteIcon size={22} />,
            label: 'Active Routes',
            value: stats.activeRoutes,
            color: 'text-primary-400',
            iconBg: 'rgba(14,165,233,0.12)',
            iconBorder: 'rgba(14,165,233,0.2)',
            glowColor: 'rgba(14,165,233,0.15)',
            onClick: () => navigate('/routes'),
        },
        {
            icon: <Bus size={22} />,
            label: 'Buses On Route',
            value: stats.busesOnRoute,
            color: 'text-cyan-400',
            iconBg: 'rgba(6,182,212,0.12)',
            iconBorder: 'rgba(6,182,212,0.2)',
            glowColor: 'rgba(6,182,212,0.12)',
            onClick: () => navigate('/vehicles'),
        },
        {
            icon: <Users size={22} />,
            label: 'Students Onboard',
            value: stats.totalStudents,
            color: 'text-emerald-400',
            iconBg: 'rgba(16,185,129,0.12)',
            iconBorder: 'rgba(16,185,129,0.2)',
            glowColor: 'rgba(16,185,129,0.12)',
            onClick: () => navigate('/students'),
        },
        {
            icon: <Bell size={22} />,
            label: 'Active Alerts',
            value: stats.activeAlerts,
            color: stats.activeAlerts > 0 ? 'text-rose-400' : 'text-slate-400',
            iconBg:
                stats.activeAlerts > 0
                    ? 'rgba(244,63,94,0.12)'
                    : 'rgba(100,116,139,0.1)',
            iconBorder:
                stats.activeAlerts > 0
                    ? 'rgba(244,63,94,0.25)'
                    : 'rgba(100,116,139,0.15)',
            glowColor:
                stats.activeAlerts > 0 ? 'rgba(244,63,94,0.1)' : 'transparent',
            onClick: () => navigate('/alerts'),
        },
    ];

    return (
        <>
            <Header
                title="Dashboard"
                subtitle="Real-time fleet overview"
                action={
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Activity size={12} className="text-emerald-400" />
                        <span>
                            Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                }
            />

            <div className="p-5 space-y-5 bg-mesh min-h-[calc(100vh-64px)]">
                {/* ── Emergency Alert Banner ────────────────────────── */}
                {alerts.some((a) => a.eventType === 'PANIC_BUTTON' && a.status === 'ACTIVE') && (
                    <div
                        className="flex items-center gap-4 px-5 py-4 rounded-xl animate-fade-in"
                        style={{
                            background: 'rgba(244,63,94,0.08)',
                            border: '1px solid rgba(244,63,94,0.35)',
                            boxShadow: '0 0 24px rgba(244,63,94,0.15)',
                        }}
                    >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse"
                            style={{ background: 'rgba(244,63,94,0.2)' }}>
                            <AlertTriangle size={16} className="text-rose-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-rose-400 text-sm">
                                Emergency Alert Active
                            </p>
                            <p className="text-xs text-rose-400/70">
                                {alerts.filter((a) => a.eventType === 'PANIC_BUTTON' && a.status === 'ACTIVE').length}{' '}
                                panic alert(s) require immediate attention
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/alerts')}
                            className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 flex-shrink-0"
                        >
                            View <ChevronRight size={14} />
                        </button>
                    </div>
                )}

                {/* ── Stats Row ─────────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {statCards.map((stat, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={stat.onClick}
                            className="stat-card text-left group"
                            style={
                                stat.glowColor !== 'transparent'
                                    ? { '--glow': stat.glowColor } as React.CSSProperties
                                    : undefined
                            }
                        >
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                                style={{
                                    background: stat.iconBg,
                                    border: `1px solid ${stat.iconBorder}`,
                                }}
                            >
                                <span className={stat.color}>{stat.icon}</span>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white leading-tight">
                                    {stat.value}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* ── Map + Alerts Row ──────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Live Map */}
                    <Card
                        title="Live Fleet Map"
                        className="lg:col-span-2"
                        collapsible
                        noPadding
                        accent="cyan"
                        action={
                            <span className="badge badge-primary text-xs">
                                {locations.length} active
                            </span>
                        }
                    >
                        <div className="h-[420px] px-5 pb-5">
                            <LiveMap locations={locations} />
                        </div>
                    </Card>

                    {/* Alerts */}
                    <Card
                        title="Active Alerts"
                        accent={alerts.length > 0 ? 'rose' : 'none'}
                        action={
                            <button
                                type="button"
                                onClick={() => navigate('/alerts')}
                                className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                            >
                                View all <ChevronRight size={12} />
                            </button>
                        }
                    >
                        <AlertList
                            alerts={alerts.slice(0, 5)}
                            onAlertClick={(alert) => navigate(`/alerts?id=${alert.id}`)}
                            emptyMessage="No active alerts"
                        />
                        {alerts.length > 0 && (
                            <div
                                className="flex items-center gap-2 mt-4 pt-4 text-xs text-amber-400"
                                style={{ borderTop: '1px solid rgba(30,58,95,0.4)' }}
                            >
                                <AlertTriangle size={14} />
                                <span>
                                    {alerts.length} alert{alerts.length !== 1 ? 's' : ''} require attention
                                </span>
                            </div>
                        )}
                    </Card>
                </div>

                {/* ── Students + System Health Row ─────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Students Onboard */}
                    <Card
                        title="Students Onboard"
                        collapsible
                        accent="green"
                        action={
                            <button
                                type="button"
                                onClick={() => navigate('/students')}
                                className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                            >
                                View all <ChevronRight size={12} />
                            </button>
                        }
                    >
                        <PresenceList
                            students={students.slice(0, 5)}
                            emptyMessage="No students currently onboard"
                        />
                    </Card>

                    {/* System Health */}
                    <Card title="System Health" accent="cyan" collapsible>
                        <div className="space-y-2">
                            {SERVICE_STATUSES.map((svc) => (
                                <CollapsibleSection
                                    key={svc.key}
                                    title={svc.label}
                                    compact
                                    defaultExpanded={false}
                                    icon={<Wifi size={14} />}
                                    badge={
                                        <span className="badge badge-active text-xs">Online</span>
                                    }
                                >
                                    <div
                                        className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm"
                                        style={{
                                            background: 'rgba(16,185,129,0.06)',
                                            border: '1px solid rgba(16,185,129,0.15)',
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />
                                            <span className="text-slate-300 text-xs">
                                                Service operational
                                            </span>
                                        </div>
                                        <span className="text-xs text-emerald-400 font-medium">
                                            ✓ Healthy
                                        </span>
                                    </div>
                                </CollapsibleSection>
                            ))}

                            <div
                                className="mt-3 pt-3 flex items-center gap-2 text-xs text-slate-500"
                                style={{ borderTop: '1px solid rgba(30,58,95,0.35)' }}
                            >
                                <TrendingUp size={14} className="text-emerald-400" />
                                <span>All systems operational</span>
                                <span className="ml-auto flex items-center gap-1">
                                    <Wifi size={12} className="text-emerald-400" />
                                    Connected
                                </span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </>
    );
};

export default Dashboard;

