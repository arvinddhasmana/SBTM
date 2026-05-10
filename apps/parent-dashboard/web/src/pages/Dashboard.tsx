import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { MapPin, School, Home, HelpCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import type { Child } from '../types';
import { useAlerts } from '../hooks/useAlerts';
import { parentApi, type ActiveAlert } from '../services/api';
import { queryKeys } from '../services/query-keys';

/** Check whether a child is affected by a given alert */
function childMatchesAlert(child: Child, alert: ActiveAlert): boolean {
  const childRoutes = [child.amRouteId, child.pmRouteId, child.routeId].filter(Boolean);
  return childRoutes.includes(alert.routeId);
}

/** Find names of children affected by an alert */
function affectedChildNames(children: Child[], alert: ActiveAlert): string[] {
  return children.filter((c) => childMatchesAlert(c, alert)).map((c) => c.name);
}

const Dashboard: React.FC = () => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const navigate = useNavigate();

  // Poll children status every 15s for fresh presence-based status
  const { data: freshChildren } = useQuery({
    queryKey: queryKeys.children.all,
    queryFn: () => parentApi.getChildren(),
    refetchInterval: 15_000,
    enabled: !!user,
  });

  const children = freshChildren ?? user?.children ?? [];

  // Collect unique route names across all children (AM + PM) to detect any active alert
  const routeIds = [
    ...new Set(
      children
        .flatMap((c) => [c.amRouteId, c.pmRouteId, c.routeId])
        .filter((id): id is string => !!id),
    ),
  ];
  const { alerts } = useAlerts(routeIds);

  // Build a route name lookup from children's known route names
  const routeNames: Record<string, string> = {};
  for (const c of children) {
    if (c.amRouteId && c.amRouteName) routeNames[c.amRouteId] = c.amRouteName;
    if (c.pmRouteId && c.pmRouteName) routeNames[c.pmRouteId] = c.pmRouteName;
    if (c.routeId && (c.amRouteName || c.pmRouteName))
      routeNames[c.routeId] = c.amRouteName || c.pmRouteName || 'Unknown Route';
  }

  if (!user) return null;

  /** Check if a child has any active alert */
  const childHasAlert = (child: Child): boolean => alerts.some((a) => childMatchesAlert(child, a));

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
      case 'on_bus':
        return t('children.status.onBus');
      case 'at_school':
        return t('children.status.atSchool');
      case 'at_home':
        return t('children.status.atHome');
      case 'unknown':
        return t('children.status.unknown');
      default:
        return status;
    }
  };

  const getStatusColor = (status: Child['status']) => {
    switch (status) {
      case 'on_bus':
        return 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';
      case 'at_school':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'at_home':
        return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
      default:
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    }
  };

  return (
    <div className="px-4 sm:px-0">
      <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">{t('children.title')}</h1>
      <p className="text-slate-400 mb-8">{t('children.subtitle')}</p>

      {alerts.length > 0 && (
        <div className="mb-8 space-y-3">
          {alerts.map((alert) => {
            const names = affectedChildNames(children, alert);
            const label = t(`tracking.alerts.eventTypes.${alert.eventType}`, {
              defaultValue: alert.eventType,
            });
            return (
              <div
                key={alert.id}
                className="flex items-start gap-4 rounded-2xl bg-pink-500/10 border border-pink-500/30 p-5 text-pink-100 backdrop-blur-md relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <AlertTriangle className="mt-0.5 h-6 w-6 flex-shrink-0 text-pink-500 animate-pulse" />
                <div className="relative z-10 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="font-bold text-lg uppercase tracking-wider text-pink-500">
                      {label}
                    </p>
                    {alert.vehicleId && (
                      <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full">
                        {alert.vehicleId}
                      </span>
                    )}
                    {(routeNames[alert.routeId] || alert.routeName) && (
                      <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full">
                        {routeNames[alert.routeId] || alert.routeName}
                      </span>
                    )}
                  </div>
                  {names.length > 0 && (
                    <p className="mt-1 text-sm text-pink-300">
                      {t('tracking.alerts.affected')}:{' '}
                      <span className="font-semibold text-white">{names.join(', ')}</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {children.map((child) => {
          const hasAlert = childHasAlert(child);
          return (
            <div
              key={child.id}
              className={`glass-card overflow-hidden group hover:border-white/20 transition-all duration-300 transform hover:-translate-y-1 ${
                hasAlert
                  ? 'ring-2 ring-pink-500/60 animate-[alert-pulse_2s_ease-in-out_infinite]'
                  : ''
              }`}
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 relative">
                    <div
                      className={`absolute inset-0 blur-lg rounded-full ${hasAlert ? 'bg-pink-500/30' : 'bg-indigo-500/20'}`}
                    />
                    <img
                      className="h-14 w-14 rounded-full border-2 border-white/10 relative z-10"
                      src={child.avatarUrl}
                      alt={child.name}
                    />
                  </div>
                  <div className="ml-5">
                    <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors">
                      {child.name}
                    </h3>
                    <p className="text-sm text-slate-400 font-medium">{child.schoolName}</p>
                  </div>
                  {hasAlert && (
                    <AlertTriangle className="ml-auto h-5 w-5 text-pink-500 animate-pulse" />
                  )}
                </div>

                <div className="mt-6 border-t border-white/5 pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {t('children.details.amRoute')}
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-emerald-400">
                        {child.amRouteName || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {t('children.details.pmRoute')}
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-blue-400">
                        {child.pmRouteName || '—'}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {t('children.details.bus')}
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-200">
                        {child.vehicleId || '—'}
                      </dd>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold leading-none ${getStatusColor(child.status)} shadow-lg`}
                  >
                    {getStatusIcon(child.status)}
                    <span className="ml-2 uppercase tracking-wide">
                      {getStatusText(child.status)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 px-6 py-4 border-t border-white/5">
                <button
                  onClick={() => navigate('/map', { state: { childId: child.id } })}
                  className="w-full flex justify-center items-center py-2.5 rounded-xl tactical-gradient-active text-white font-bold text-sm shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.5)] transition-all transform hover:scale-[1.02] active:scale-95"
                >
                  {t('children.trackBusLive')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {children.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">{t('children.noChildrenLinked')}</p>
        </div>
      )}

      <style>{`
                @keyframes alert-pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(236, 72, 153, 0.4); }
                    50% { box-shadow: 0 0 20px 4px rgba(236, 72, 153, 0.3); }
                }
            `}</style>
    </div>
  );
};

export default Dashboard;
