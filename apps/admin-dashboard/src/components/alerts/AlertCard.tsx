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
} from 'lucide-react';
import type { Alert } from '../../types';

interface AlertCardProps {
  alert: Alert;
  onClick?: () => void;
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

/** Tier badge: colour-coded with T1/T2/T3 label */
const TIER_BADGE: Record<string, { label: string; className: string }> = {
  TIER_1: { label: 'T1', className: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  TIER_2: { label: 'T2', className: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  TIER_3: { label: 'T3', className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
};

const STATUS_BADGE: Record<string, string> = {
  PENDING_CONFIRMATION:
    'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 animate-pulse',
  AUTO_ESCALATED: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  CONFIRMED: 'bg-green-500/20 text-green-400 border border-green-500/30',
  FALSE_ALARM: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
};

const AlertCard: React.FC<AlertCardProps> = ({ alert, onClick }) => {
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
  const statusBadge = STATUS_BADGE[alert.status];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left glass-item p-2 rounded-lg group transition-all duration-300 ${
        isResolved ? 'opacity-30' : 'hover:bg-white/5'
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
              {/* Tier badge */}
              {tierBadge && (
                <span
                  className={`px-1 py-0.5 rounded text-[7px] font-black uppercase ${tierBadge.className}`}
                >
                  {tierBadge.label}
                </span>
              )}
              {/* Status badge for non-standard statuses */}
              {statusBadge && (
                <span
                  className={`px-1 py-0.5 rounded text-[7px] font-black uppercase ${statusBadge}`}
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
            <span className="text-slate-500 tabular-nums">
              {new Date(alert.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

export default AlertCard;
