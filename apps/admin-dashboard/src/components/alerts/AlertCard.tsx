import React from 'react';
import {
  Siren,
  AlertTriangle,
  Navigation,
  Bus,
  Route as RouteIcon,
  Stethoscope,
  Clock,
  ShieldCheck,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Alert, AlertAuditEntry } from '../../types';
import { formatTimestamp } from '../../utils/formatters';

interface AlertCardProps {
  alert: Alert;
  onClick?: () => void;
  onAction?: (alert: Alert) => void;
  /** compact=true (default): mini card for dashboard panels. compact=false: full-width list row for Alerts page. */
  compact?: boolean;
  /** Human-readable route name to display in expanded mode. Falls back to routeId. */
  routeName?: string;
  /** Audit trail entries for inline timeline (expanded mode only). */
  auditTrail?: AlertAuditEntry[];
  /** Whether to show the inline timeline (expanded mode only). */
  showTimeline?: boolean;
  /** Callback to toggle timeline visibility. */
  onToggleTimeline?: () => void;
}

const ALERT_DISPLAY: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PANIC_BUTTON: {
    label: 'PANIC',
    color: 'bg-rose-500/20 border-rose-500/30 text-rose-500 shadow-rose-500/10',
    icon: <Siren size={14} className="animate-pulse" />,
  },
  ROUTE_DEVIATION: {
    label: 'ROUTE DEVIATION',
    color: 'bg-amber-500/20 border-amber-500/30 text-amber-500 shadow-amber-500/10',
    icon: <Navigation size={14} />,
  },
  INCIDENT: {
    label: 'INCIDENT',
    color: 'bg-orange-500/20 border-orange-500/30 text-orange-500 shadow-orange-500/10',
    icon: <AlertTriangle size={14} />,
  },
  LATE_ARRIVAL: {
    label: 'LATE ARRIVAL',
    color: 'bg-blue-500/20 border-blue-500/30 text-blue-500 shadow-blue-500/10',
    icon: <Bus size={14} className="animate-pulse" />,
  },
  ROUTE_DIVERSION: {
    label: 'ROUTE DIVERSION',
    color: 'bg-amber-500/20 border-amber-500/30 text-amber-500 shadow-amber-500/10',
    icon: <Navigation size={14} className="animate-bounce" />,
  },
  PANIC_ALERT: {
    label: 'PANIC ALERT',
    color: 'bg-rose-500/20 border-rose-500/30 text-rose-500 shadow-rose-500/10',
    icon: <Siren size={14} className="animate-pulse" />,
  },
  MEDICAL: {
    label: 'MEDICAL',
    color: 'bg-rose-500/20 border-rose-500/30 text-rose-500 shadow-rose-500/10',
    icon: <Stethoscope size={14} className="animate-pulse" />,
  },
  LATE_DEPARTURE: {
    label: 'LATE DEPARTURE',
    color: 'bg-amber-500/20 border-amber-500/30 text-amber-500 shadow-amber-500/10',
    icon: <Clock size={14} />,
  },
  COMPLIANCE: {
    label: 'COMPLIANCE',
    color: 'bg-purple-500/20 border-purple-500/30 text-purple-400 shadow-purple-500/10',
    icon: <ShieldCheck size={14} />,
  },
  OTHER: {
    label: 'ALERT',
    color: 'bg-slate-500/20 border-slate-500/30 text-slate-400 shadow-slate-500/10',
    icon: <AlertTriangle size={14} />,
  },
};

const DEFAULT_DESCRIPTIONS: Record<string, string> = {
  PANIC_BUTTON: 'Panic button triggered',
  ROUTE_DEVIATION: 'Bus deviated from route',
  INCIDENT: 'Incident reported',
  LATE_ARRIVAL: 'Bus is arriving late',
  ROUTE_DIVERSION: 'Unplanned route diversion detected',
  PANIC_ALERT: 'Emergency panic alert triggered',
  MEDICAL: 'Medical emergency reported',
  LATE_DEPARTURE: 'Late departure from schedule',
  COMPLIANCE: 'Compliance issue detected',
  OTHER: 'Alert reported',
};

const TIER_BADGE: Record<string, { label: string; className: string }> = {
  TIER_1: { label: 'T1', className: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  TIER_2: { label: 'T2', className: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  TIER_3: { label: 'T3', className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
};

// Compact mode: only non-default statuses get a badge
const COMPACT_STATUS_BADGE: Record<string, string> = {
  PENDING_CONFIRMATION:
    'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 animate-pulse',
  AUTO_ESCALATED: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  CONFIRMED: 'bg-green-500/20 text-green-400 border border-green-500/30',
  FALSE_ALARM: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
};

// Expanded mode: every status has a badge
const EXPANDED_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'Active', className: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  PENDING_CONFIRMATION: {
    label: 'Awaiting Confirm',
    className: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 animate-pulse',
  },
  CONFIRMED: {
    label: 'Confirmed',
    className: 'bg-green-500/20 text-green-400 border border-green-500/30',
  },
  AUTO_ESCALATED: {
    label: 'Escalated',
    className: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  },
  RESOLVED: {
    label: 'Resolved',
    className: 'bg-green-500/20 text-green-400 border border-green-500/30',
  },
  FALSE_ALARM: {
    label: 'False Alarm',
    className: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
  },
};

const CARD_AUDIT_LABELS: Record<string, string> = {
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

function getCardAuditDotColor(eventType: string): string {
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
    case 'CREATED':
      return 'bg-indigo-400';
    case 'INFO_REQUESTED':
      return 'bg-yellow-400';
    default:
      return 'bg-slate-500';
  }
}

function getCardAuditLabelColor(eventType: string): string {
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
    case 'CREATED':
      return 'text-indigo-400';
    case 'INFO_REQUESTED':
      return 'text-yellow-400';
    default:
      return 'text-slate-400';
  }
}

const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  onClick,
  onAction,
  compact = true,
  routeName,
  auditTrail,
  showTimeline,
  onToggleTimeline,
}) => {
  const display = ALERT_DISPLAY[alert.eventType] ?? ALERT_DISPLAY.OTHER;
  const isPanic = alert.eventType === 'PANIC_BUTTON' || alert.eventType === 'PANIC_ALERT';
  const isResolved = alert.status === 'RESOLVED' || alert.status === 'FALSE_ALARM';
  const isPendingConfirmation = alert.status === 'PENDING_CONFIRMATION';

  const labelColor =
    isPanic || alert.eventType === 'MEDICAL'
      ? 'text-rose-400'
      : alert.eventType === 'ROUTE_DEVIATION' ||
          alert.eventType === 'ROUTE_DIVERSION' ||
          alert.eventType === 'LATE_DEPARTURE'
        ? 'text-amber-400'
        : alert.eventType === 'LATE_ARRIVAL'
          ? 'text-blue-400'
          : alert.eventType === 'COMPLIANCE'
            ? 'text-purple-400'
            : 'text-orange-400';

  const tierBadge = alert.tier ? TIER_BADGE[alert.tier] : null;

  if (!compact) {
    // ── Expanded row (Alerts page) ──────────────────────────────────────────
    const statusBadge = EXPANDED_STATUS_BADGE[alert.status];
    const ts = new Date(alert.timestamp);
    const dateStr = ts.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = ts.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const displayRoute = routeName || alert.routeId;

    return (
      <button
        onClick={onClick}
        className={`w-full text-left p-3 rounded-xl border transition-all duration-200 group ${
          isResolved
            ? 'bg-dashboard-bg border-dashboard-border opacity-50 hover:opacity-70'
            : 'bg-dashboard-bg border-dashboard-border hover:border-white/20 hover:bg-white/5'
        } ${isPendingConfirmation ? 'ring-1 ring-yellow-500/40' : ''}`}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`p-2 rounded-xl border shrink-0 shadow-lg ${display.color}`}>
            {display.icon}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Row 1: type label + badges */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-black uppercase tracking-widest ${labelColor}`}>
                {display.label}
              </span>
              {tierBadge && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${tierBadge.className}`}
                >
                  {tierBadge.label}
                </span>
              )}
              {statusBadge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusBadge.className}`}
                >
                  {statusBadge.label}
                </span>
              )}
            </div>

            {/* Row 2: description */}
            <p className="text-sm text-white font-medium line-clamp-2 leading-snug mb-2">
              {alert.description || DEFAULT_DESCRIPTIONS[alert.eventType] || 'Alert'}
            </p>

            {/* Row 3: route / vehicle / time */}
            <div className="flex items-center gap-4 flex-wrap text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <RouteIcon size={11} className="text-slate-500 shrink-0" />
                <span className="font-medium text-slate-300 truncate max-w-[160px]">
                  {displayRoute}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <Bus size={11} className="text-slate-500 shrink-0" />
                <span>{alert.vehicleId}</span>
              </span>
              <span className="flex items-center gap-1.5 ml-auto">
                <Clock size={11} className="text-slate-500 shrink-0" />
                <span className="tabular-nums text-slate-400">
                  {dateStr} · {timeStr}
                </span>
              </span>
            </div>

            {/* View/Hide timeline toggle */}
            {onToggleTimeline && (
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTimeline();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    onToggleTimeline();
                  }
                }}
                className="flex items-center gap-1 mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
              >
                {showTimeline ? (
                  <>
                    <ChevronUp size={14} />
                    Hide timeline
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} />
                    View timeline
                  </>
                )}
              </div>
            )}

            {/* Inline timeline */}
            {showTimeline && auditTrail && auditTrail.length > 0 && (
              <div className="mt-3 pt-2 border-t border-dashboard-border">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">
                  Timeline
                </p>
                <div className="space-y-0">
                  {[...auditTrail]
                    .sort(
                      (a, b) =>
                        new Date(b.eventTimestamp).getTime() - new Date(a.eventTimestamp).getTime(),
                    )
                    .map((entry) => (
                      <div key={entry.id} className="flex gap-2.5 pb-2">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getCardAuditDotColor(entry.eventType)}`}
                          />
                          <div className="w-px flex-1 bg-slate-700/50 mt-0.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-xs font-semibold ${getCardAuditLabelColor(entry.eventType)}`}
                            >
                              {CARD_AUDIT_LABELS[entry.eventType] ||
                                entry.eventType.replace(/_/g, ' ')}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-slate-500">
                              <Clock size={9} />
                              {formatTimestamp(entry.eventTimestamp)}
                            </span>
                          </div>
                          {entry.notes && (
                            <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">
                              {entry.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Action button */}
          {onAction && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction(alert);
              }}
              title="View details"
              className="p-1.5 rounded-lg hover:bg-white/10 text-blue-400 hover:text-blue-300 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
            >
              <Eye size={14} />
            </button>
          )}
        </div>
      </button>
    );
  }

  // ── Compact row (Dashboard floating panel) ──────────────────────────────
  const compactStatusBadge = COMPACT_STATUS_BADGE[alert.status];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left glass-item p-2 rounded-lg group transition-all duration-300 ${
        isResolved ? 'opacity-50' : 'hover:bg-white/5'
      } ${isPendingConfirmation ? 'ring-1 ring-yellow-500/40' : ''}`}
    >
      <div className="flex items-start gap-2.5">
        <div className={`p-1.5 rounded-lg border shrink-0 shadow-lg ${display.color}`}>
          {display.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className={`text-[8px] font-black uppercase tracking-widest ${labelColor}`}>
              {display.label}
            </span>
            <div className="flex items-center gap-1">
              {tierBadge && (
                <span
                  className={`px-1 py-0.5 rounded text-[7px] font-black uppercase ${tierBadge.className}`}
                >
                  {tierBadge.label}
                </span>
              )}
              {compactStatusBadge && (
                <span
                  className={`px-1 py-0.5 rounded text-[7px] font-black uppercase ${compactStatusBadge}`}
                >
                  {alert.status.replace(/_/g, ' ')}
                </span>
              )}
              <div className="flex items-center gap-0.5 px-1 bg-white/10 rounded text-[7px] font-black text-slate-300 uppercase">
                <RouteIcon size={7} />
                <span>{alert.routeId.split('-').pop()}</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-white font-black line-clamp-1 leading-none mb-1.5">
            {alert.description || DEFAULT_DESCRIPTIONS[alert.eventType] || 'Alert'}
          </p>

          <div className="flex items-center justify-between text-[8px] font-bold text-slate-500 uppercase tracking-tighter">
            <div className="flex items-center gap-1">
              <Bus size={8} />
              <span className="text-slate-400">{alert.vehicleId}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {onAction && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction(alert);
                  }}
                  title="View details"
                  className="p-0.5 rounded hover:bg-white/10 text-blue-400 hover:text-blue-300 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Eye size={10} />
                </button>
              )}
              <span className="text-slate-500 tabular-nums">
                {new Date(alert.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};

export default AlertCard;
