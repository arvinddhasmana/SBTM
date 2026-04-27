import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import { parentApi, type AlertHistoryRecord, type AlertAuditEntry } from '../services/api';
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

const AUDIT_EVENT_LABELS: Record<string, string> = {
  CREATED: 'Created',
  PENDING_CONFIRMATION: 'Pending confirmation',
  CONFIRMED: 'Confirmed by school',
  AUTO_ESCALATED: 'Auto-escalated',
  FALSE_ALARM: 'False alarm',
  PARENT_NOTIFIED: 'Parents notified',
  BOARD_ESCALATED: 'Escalated to board',
  OSTA_ESCALATED: 'Escalated to OSTA',
  RESOLVED: 'Resolved',
  INFO_REQUESTED: 'Info requested',
  STATUS_UPDATE: 'Update',
};

function getAuditDotColor(eventType: string): string {
  switch (eventType) {
    case 'CONFIRMED':
      return 'bg-blue-400';
    case 'STATUS_UPDATE':
      return 'bg-blue-400';
    case 'RESOLVED':
      return 'bg-green-400';
    case 'AUTO_ESCALATED':
    case 'BOARD_ESCALATED':
    case 'OSTA_ESCALATED':
      return 'bg-orange-400';
    case 'FALSE_ALARM':
      return 'bg-slate-400';
    case 'PARENT_NOTIFIED':
      return 'bg-purple-400';
    default:
      return 'bg-slate-500';
  }
}

function getAuditLabelColor(eventType: string): string {
  switch (eventType) {
    case 'CONFIRMED':
      return 'text-blue-400';
    case 'STATUS_UPDATE':
      return 'text-blue-400';
    case 'RESOLVED':
      return 'text-green-400';
    case 'AUTO_ESCALATED':
    case 'BOARD_ESCALATED':
    case 'OSTA_ESCALATED':
      return 'text-orange-400';
    case 'FALSE_ALARM':
      return 'text-slate-400';
    case 'PARENT_NOTIFIED':
      return 'text-purple-400';
    default:
      return 'text-slate-400';
  }
}

const AlertTimeline: React.FC<{ alertId: string }> = ({ alertId }) => {
  const { data: auditTrail = [], isLoading } = useQuery({
    queryKey: queryKeys.alerts.auditTrail(alertId),
    queryFn: () => parentApi.getAlertAuditTrail(alertId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-slate-500 text-sm">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        Loading timeline...
      </div>
    );
  }

  if (auditTrail.length === 0) {
    return <p className="text-slate-500 text-sm py-2">No timeline entries.</p>;
  }

  const sortedTrail = [...auditTrail].sort(
    (a, b) => new Date(b.eventTimestamp).getTime() - new Date(a.eventTimestamp).getTime(),
  );

  return (
    <div className="pt-2">
      <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-3">
        Timeline
      </p>
      <div className="space-y-0">
        {sortedTrail.map((entry: AlertAuditEntry) => (
          <div key={entry.id} className="flex gap-3 pb-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${getAuditDotColor(entry.eventType)}`}
              />
              <div className="w-px flex-1 bg-slate-700/50 mt-1" />
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-semibold ${getAuditLabelColor(entry.eventType)}`}>
                  {AUDIT_EVENT_LABELS[entry.eventType] || entry.eventType.replace(/_/g, ' ')}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  {new Date(entry.eventTimestamp).toLocaleString()}
                </span>
              </div>
              {entry.notes && (
                <p className="text-slate-400 text-sm mt-1 leading-relaxed">{entry.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Notifications: React.FC = () => {
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

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

  const toggleTimeline = (alertId: string) => {
    setExpandedAlertId((prev) => (prev === alertId ? null : alertId));
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
            const isExpanded = expandedAlertId === alert.id;

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

                      {/* View/Hide timeline toggle */}
                      <button
                        onClick={() => toggleTimeline(alert.id)}
                        className="flex items-center gap-1 mt-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Hide timeline
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            View timeline
                          </>
                        )}
                      </button>

                      {/* Expandable timeline */}
                      {isExpanded && <AlertTimeline alertId={alert.id} />}
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
