import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, RefreshCw, ShieldAlert } from 'lucide-react';
import { parentApi, type AlertHistoryRecord } from '../services/api';
import { queryKeys } from '../services/query-keys';

const EVENT_TYPE_LABELS: Record<string, string> = {
  LATE_ARRIVAL: 'Late Arrival',
  ROUTE_DEVIATION: 'Route Deviation',
  PANIC_BUTTON: 'Panic Button',
  INCIDENT: 'Incident',
  ROUTE_DIVERSION: 'Route Diversion',
  PANIC_ALERT: 'Panic Alert',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  LATE_ARRIVAL: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  ROUTE_DEVIATION: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  PANIC_BUTTON: 'bg-red-500/20 text-red-400 border-red-500/30',
  INCIDENT: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

const Notifications: React.FC = () => {
  const {
    data: alerts = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.alerts.history,
    queryFn: () => parentApi.getAlertHistory(),
    refetchInterval: 30_000,
  });

  const error = queryError ? 'Unable to load alert history. Please try again.' : null;

  const formatTimestamp = (ts: string): string => {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  return (
    <div className="px-4 sm:px-0">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold text-white tracking-tight">Alert History</h1>
        <button
          onClick={() => refetch()}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors"
          aria-label="Refresh alerts"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      <p className="text-slate-400 mb-8">Emergency alerts and safety events for your routes.</p>

      {error && (
        <div className="mb-4 rounded-2xl bg-red-500/10 border border-red-500/30 p-4 text-red-300 text-sm backdrop-blur-md">
          {error}
        </div>
      )}

      {loading && alerts.length === 0 && (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      )}

      {!loading && alerts.length === 0 && !error && (
        <div className="text-center py-16">
          <ShieldAlert className="mx-auto h-14 w-14 text-slate-600" />
          <p className="mt-4 text-lg text-slate-400 font-medium">No alerts yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Safety alerts for your children's routes will appear here.
          </p>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="space-y-4">
          {alerts.map((alert: AlertHistoryRecord) => {
            const label = EVENT_TYPE_LABELS[alert.eventType] || alert.eventType;
            const colorClass =
              EVENT_TYPE_COLORS[alert.eventType] ||
              'bg-slate-500/20 text-slate-400 border-slate-500/30';
            const isActive = alert.status === 'ACTIVE';

            return (
              <div
                key={alert.id}
                className={`glass-card overflow-hidden group hover:border-white/20 transition-all duration-300 ${
                  isActive ? 'ring-1 ring-pink-500/40' : ''
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-0.5">
                      {isActive ? (
                        <AlertTriangle className="h-6 w-6 text-pink-500 animate-pulse" />
                      ) : (
                        <CheckCircle className="h-6 w-6 text-emerald-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${colorClass}`}
                        >
                          {label}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                            isActive
                              ? 'bg-pink-500/20 text-pink-400 border-pink-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {alert.status}
                        </span>
                      </div>
                      {alert.description && (
                        <p className="text-slate-200 text-sm mb-2">{alert.description}</p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>
                          Route: <span className="text-slate-300 font-medium">{alert.routeId}</span>
                        </span>
                        <span>
                          Bus: <span className="text-slate-300 font-medium">{alert.vehicleId}</span>
                        </span>
                        <span>{formatTimestamp(alert.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
