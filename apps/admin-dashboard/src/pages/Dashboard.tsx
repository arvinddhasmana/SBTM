import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bus, Users, Bell, Route as RouteIcon, ShieldAlert, Info, Zap, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header, LoadingSpinner, FloatingPanel, PanelSearch } from '../components/common';
import { LiveMap } from '../components/map';
import { AlertList, AlertDetail } from '../components/alerts';
import { PresenceList } from '../components/presence';
import { RouteListCompact } from '../components/routes';
import { alertsApi, routesApi, presenceApi, useMock } from '../services/api';
import { queryKeys } from '../services/query-keys';
import { useAuth } from '../context/AuthContext';
import type {
  Alert,
  AlertTier,
  AlertAuditEntry,
  LiveLocation,
  StudentPresence,
  DashboardStats,
  Route,
} from '../types';

/** Alert statuses that require admin action/input */
const ACTIONABLE_STATUSES = new Set([
  'ACTIVE',
  'PENDING_CONFIRMATION',
  'AUTO_ESCALATED',
  'CONFIRMED',
]);

/** Alert statuses that are terminal — should not appear on the Dashboard */
const TERMINAL_STATUSES = new Set(['RESOLVED', 'FALSE_ALARM']);

type DashboardMode = 'info' | 'action';

const Dashboard: React.FC = () => {
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [mode, setMode] = useState<DashboardMode>('info');
  const [routeSearch, setRouteSearch] = useState('');
  const [passengerSearch, setPassengerSearch] = useState('');
  const [alertTierFilter, setAlertTierFilter] = useState<AlertTier | ''>('');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [selectedAlertAudit, setSelectedAlertAudit] = useState<AlertAuditEntry[]>([]);
  const [isResolving, setIsResolving] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const canConfirm =
    user?.role === 'SCHOOL_ADMIN' ||
    user?.role === 'BOARD_ADMIN' ||
    user?.role === 'OSTA_ADMIN' ||
    user?.role === 'ADMIN';

  // --- Separate queries so alert actions don't nuke bus/student data ---

  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: queryKeys.alerts.active(),
    queryFn: () => alertsApi.getActiveAlerts(),
    refetchInterval: 2_000,
  });

  const { data: fleetData, isLoading: fleetLoading } = useQuery({
    queryKey: [...queryKeys.routes.active(), 'fleet'] as const,
    queryFn: async () => {
      const [locationsData, routesData] = await Promise.all([
        routesApi.getAllLiveLocations(),
        routesApi.getActiveRoutes(),
      ]);

      const studentsData = await presenceApi.getAllBoardedStudents(
        routesData.map((route) => route.id),
      );

      return { locations: locationsData, routes: routesData, students: studentsData };
    },
    refetchInterval: 2_000,
  });

  const isLoading = alertsLoading || fleetLoading;

  const allAlerts = alertsData ?? [];
  const allLocations = (fleetData?.locations ?? []).filter(
    (l) => l.position?.lat != null && l.vehicleId,
  );
  const allRoutes = fleetData?.routes ?? [];
  const allStudents = fleetData?.students ?? [];

  // Only show bus markers for routes that are currently active
  const activeRouteIds = useMemo(() => new Set(allRoutes.map((r) => r.id)), [allRoutes]);
  const activeLocations = useMemo(
    () => allLocations.filter((l) => activeRouteIds.has(l.routeId)),
    [allLocations, activeRouteIds],
  );

  // --- Mode-based filtering ---
  const { alerts, locations, routes, students } = useMemo(() => {
    if (mode === 'info') {
      // Filter out terminal alerts — they should not clutter the operational view
      const activeAlerts = allAlerts.filter((a) => !TERMINAL_STATUSES.has(a.status));
      return {
        alerts: activeAlerts,
        locations: activeLocations,
        routes: allRoutes,
        students: allStudents,
      };
    }

    // Action mode: only alerts that require action from the logged-in user's role
    const actionAlerts = allAlerts.filter((a) => ACTIONABLE_STATUSES.has(a.status));

    // Collect routeIds associated with actionable alerts
    const actionRouteIds = new Set(actionAlerts.map((a) => a.routeId));

    // Filter routes, buses, students to only those associated with actionable alerts
    const actionRoutes = allRoutes.filter((r) => actionRouteIds.has(r.id));
    const actionLocations = activeLocations.filter((l) => actionRouteIds.has(l.routeId));
    const actionStudents = allStudents.filter((s) => s.routeId && actionRouteIds.has(s.routeId));

    return {
      alerts: actionAlerts,
      locations: actionLocations,
      routes: actionRoutes,
      students: actionStudents,
    };
  }, [mode, allAlerts, activeLocations, allRoutes, allStudents]);

  // --- Tier filter for alerts ---
  const filteredAlerts = useMemo(() => {
    if (!alertTierFilter) return alerts;
    return alerts.filter((a) => a.tier === alertTierFilter);
  }, [alerts, alertTierFilter]);

  // --- Search filters ---
  const filteredRoutes = useMemo(() => {
    if (!routeSearch) return routes;
    const q = routeSearch.toLowerCase();
    return routes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        (r.schoolName && r.schoolName.toLowerCase().includes(q)) ||
        (r.vehicleId && r.vehicleId.toLowerCase().includes(q)),
    );
  }, [routes, routeSearch]);

  const filteredStudents = useMemo(() => {
    if (!passengerSearch) return students;
    const q = passengerSearch.toLowerCase();
    return students.filter((s) => s.name.toLowerCase().includes(q));
  }, [students, passengerSearch]);

  // --- Stats (based on mode-filtered data) ---
  const stats: DashboardStats = {
    activeRoutes: routes.length,
    busesOnRoute: locations.length,
    totalStudents: students.length,
    activeAlerts: alerts.length,
  };

  // --- Alert detail overlay handlers ---
  useEffect(() => {
    if (selectedAlert) {
      alertsApi
        .getAlertAuditLog(selectedAlert.id)
        .then(setSelectedAlertAudit)
        .catch(() => setSelectedAlertAudit([]));
    } else {
      setSelectedAlertAudit([]);
    }
  }, [selectedAlert]);

  const handleAlertAction = (alert: Alert) => {
    setSelectedAlert(alert);
  };

  const handleResolve = async (id: string, notes?: string) => {
    setIsResolving(true);
    try {
      await alertsApi.resolveAlert(id, notes, user?.id, user?.role);
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
      setSelectedAlert(null);
    } catch (error) {
      console.error('Error resolving alert:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const handleConfirm = async (id: string) => {
    setIsActing(true);
    try {
      await alertsApi.confirmAlert(id, user?.id, user?.role);
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
      setSelectedAlert(null);
    } catch (error) {
      console.error('Error confirming alert:', error);
    } finally {
      setIsActing(false);
    }
  };

  const handleFalseAlarm = async (id: string) => {
    setIsActing(true);
    try {
      await alertsApi.falseAlarmAlert(id, undefined, user?.id, user?.role);
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
      setSelectedAlert(null);
    } catch (error) {
      console.error('Error marking false alarm:', error);
    } finally {
      setIsActing(false);
    }
  };

  const handleRequestInfo = async (id: string) => {
    setIsActing(true);
    try {
      await alertsApi.requestInfoAlert(id, user?.id, user?.role);
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
    } catch (error) {
      console.error('Error requesting info:', error);
    } finally {
      setIsActing(false);
    }
  };

  const handleAddStatusUpdate = async (id: string, notes: string) => {
    await alertsApi.addStatusUpdate(id, notes, user?.id, user?.role);
    queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
    const updatedAudit = await alertsApi.getAlertAuditLog(id);
    setSelectedAlertAudit(updatedAudit);
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <LoadingSpinner size="lg" text="Initialising Tactical Command..." />
      </div>
    );
  }

  const statCards = [
    {
      icon: <RouteIcon size={18} />,
      label: 'Routes',
      value: stats.activeRoutes,
      color: 'text-blue-400',
    },
    {
      icon: <Bus size={18} />,
      label: 'Buses',
      value: stats.busesOnRoute,
      color: 'text-emerald-400',
    },
    {
      icon: <Users size={18} />,
      label: 'Boarded',
      value: stats.totalStudents,
      color: 'text-indigo-400',
    },
    {
      icon: <Bell size={18} />,
      label: 'Alerts',
      value: stats.activeAlerts,
      color: 'text-rose-400',
    },
  ];

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      {/* Background Map Layer */}
      <div className="absolute inset-0 z-0">
        <LiveMap
          locations={locations}
          selectedRoute={selectedRoute}
          onReset={() => setSelectedRoute(null)}
          className="w-full h-full"
        />
      </div>

      {/* Tactical Overlays */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <Header
          title="Tactical Overview"
          subtitle="Real-time fleet intelligence"
          className="pointer-events-auto"
          action={
            <div className="flex items-center gap-2">
              {/* Info/Action Mode Toggle */}
              <div
                className="flex items-center glass-card rounded-lg overflow-hidden"
                data-testid="mode-toggle"
              >
                <button
                  onClick={() => setMode('info')}
                  data-testid="mode-info"
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${
                    mode === 'info'
                      ? 'bg-blue-500/20 text-blue-400 border-b-2 border-blue-400'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Info size={10} />
                  Info
                </button>
                <button
                  onClick={() => setMode('action')}
                  data-testid="mode-action"
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${
                    mode === 'action'
                      ? 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-400'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Zap size={10} />
                  Action
                </button>
              </div>

              {useMock && (
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
                    Mock Data Active
                  </span>
                </div>
              )}
            </div>
          }
        />

        {/* Panel: Routes (left, top) */}
        <FloatingPanel
          id="routes"
          title="Routes"
          icon={<MapPin size={12} />}
          anchor="left"
          defaultPosition={{ x: 30, y: 80 }}
          defaultSize={{ width: '260px', height: '350px' }}
          className="pointer-events-auto"
        >
          <div className="flex flex-col h-full gap-1.5 overflow-hidden">
            <PanelSearch
              value={routeSearch}
              onChange={setRouteSearch}
              placeholder="Search routes, schools, buses..."
            />
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
              <RouteListCompact
                routes={filteredRoutes}
                liveLocations={locations}
                onRouteClick={(route) => handleSelection(route.id)}
                emptyMessage="No active routes"
              />
            </div>
          </div>
        </FloatingPanel>

        {/* Panel: Tactical Alerts (right) */}
        <FloatingPanel
          id="alerts"
          title="Tactical Alerts"
          icon={<ShieldAlert size={12} />}
          anchor="right"
          defaultPosition={{ x: 30, y: 80 }}
          defaultSize={{ width: '280px', height: '400px' }}
          className="pointer-events-auto"
        >
          <div className="flex flex-col h-full gap-1.5 overflow-hidden">
            {/* Tier filter combo */}
            <select
              value={alertTierFilter}
              onChange={(e) => setAlertTierFilter(e.target.value as AlertTier | '')}
              data-testid="tier-filter"
              className="w-full py-1 px-2 glass-item rounded text-[9px] font-black text-white uppercase tracking-widest bg-transparent border-0 outline-none focus:ring-1 focus:ring-blue-500/30 cursor-pointer appearance-none shrink-0"
            >
              <option value="" className="bg-slate-900">
                All Tiers
              </option>
              <option value="TIER_1" className="bg-slate-900">
                Tier 1 — Critical
              </option>
              <option value="TIER_2" className="bg-slate-900">
                Tier 2 — Warning
              </option>
              <option value="TIER_3" className="bg-slate-900">
                Tier 3 — Info
              </option>
            </select>
            <button
              onClick={() => navigate('/alerts')}
              className="w-full py-1.5 glass-item rounded text-[9px] font-black text-blue-400 uppercase tracking-widest hover:bg-white/10 shrink-0"
            >
              Review All
            </button>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
              <AlertList
                alerts={filteredAlerts}
                onAlertClick={(alert) => handleSelection(alert.routeId)}
                onAlertAction={handleAlertAction}
                emptyMessage={mode === 'action' ? 'No actionable alerts' : 'No active alerts'}
              />
            </div>
          </div>
        </FloatingPanel>

        {/* Panel: Passenger Feed (right, below alerts) */}
        <FloatingPanel
          id="passengers"
          title="Passenger Feed"
          icon={<Users size={12} />}
          anchor="right"
          defaultPosition={{ x: 30, y: 510 }}
          defaultSize={{ width: '280px', height: '300px' }}
          className="pointer-events-auto"
        >
          <div className="flex flex-col h-full gap-1.5 overflow-hidden">
            <PanelSearch
              value={passengerSearch}
              onChange={setPassengerSearch}
              placeholder="Search passengers..."
            />
            <button
              onClick={() => navigate('/students')}
              className="w-full py-1.5 glass-item rounded text-[9px] font-black text-blue-400 uppercase tracking-widest hover:bg-white/10 shrink-0"
            >
              Manifest
            </button>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <PresenceList
                students={filteredStudents}
                onStudentClick={(student) => handleSelection(student.routeId)}
                emptyMessage="No occupancy"
              />
            </div>
          </div>
        </FloatingPanel>

        {/* Fixed Bottom Tactical Bar */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end gap-2 pointer-events-none">
          {/* Legend Panel */}
          <div className="glass-card p-2 w-28 pointer-events-auto">
            <div className="text-[8px] font-black text-slate-500 uppercase mb-1 tracking-widest">
              Legend
            </div>
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

          {/* Mission Health Panel */}
          <div className="glass-card p-2 w-28 pointer-events-auto">
            <div className="flex flex-col gap-1">
              {[
                { name: 'GPS', status: 'OK' },
                { name: 'HUB', status: 'OK' },
                { name: 'TELEM', status: 'OK' },
              ].map((service, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 px-1.5 py-0.5 glass-item rounded"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 bg-emerald-400 rounded-full shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
                    <span className="text-[7.5px] font-black text-slate-300 uppercase">
                      {service.name}
                    </span>
                  </div>
                  <span className="text-[7.5px] font-black text-emerald-400 uppercase">
                    {service.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Fleet Metrics Bar */}
          <div
            className="glass-card p-1 flex items-center gap-2 pointer-events-auto overflow-hidden"
            data-testid="fleet-metrics"
          >
            {statCards.map((stat, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 glass-item rounded-lg">
                <div className={`${stat.color} scale-75`}>{stat.icon}</div>
                <div className="flex flex-col -space-y-1">
                  <span
                    className="text-[9px] font-black text-white leading-tight"
                    data-testid={`stat-${stat.label.toLowerCase()}`}
                  >
                    {stat.value}
                  </span>
                  <span className="text-[6.5px] font-black text-slate-500 uppercase tracking-tighter">
                    {stat.label}
                  </span>
                </div>
              </div>
            ))}

            {/* Mode indicator in metrics bar */}
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest ${
                mode === 'info' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'
              }`}
            >
              {mode === 'info' ? <Info size={8} /> : <Zap size={8} />}
              {mode}
            </div>
          </div>
        </div>
      </div>

      {/* Alert Detail Overlay (draggable, floating) */}
      {selectedAlert && (
        <AlertDetail
          alert={selectedAlert}
          variant="overlay"
          onClose={() => setSelectedAlert(null)}
          onResolve={handleResolve}
          onConfirm={canConfirm ? handleConfirm : undefined}
          onFalseAlarm={canConfirm ? handleFalseAlarm : undefined}
          onRequestInfo={canConfirm ? handleRequestInfo : undefined}
          onAddStatusUpdate={canConfirm ? handleAddStatusUpdate : undefined}
          auditTrail={selectedAlertAudit}
          isResolving={isResolving}
          isActing={isActing}
        />
      )}
    </div>
  );
};

export default Dashboard;
