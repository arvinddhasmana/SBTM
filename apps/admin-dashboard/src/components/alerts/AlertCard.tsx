import React from 'react';
import { Siren, AlertTriangle, Navigation, Bus, Route as RouteIcon } from 'lucide-react';
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
  OTHER: 'Alert reported',
};

const AlertCard: React.FC<AlertCardProps> = ({ alert, onClick }) => {
  const display = ALERT_DISPLAY[alert.eventType] ?? ALERT_DISPLAY.OTHER;
  const isPanic = alert.eventType === 'PANIC_BUTTON' || alert.eventType === 'PANIC_ALERT';
  const isResolved = alert.status === 'RESOLVED';
  const labelColor = isPanic
    ? 'text-rose-400'
    : alert.eventType === 'ROUTE_DEVIATION' || alert.eventType === 'ROUTE_DIVERSION'
      ? 'text-amber-400'
      : alert.eventType === 'LATE_ARRIVAL'
        ? 'text-blue-400'
        : 'text-orange-400';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left glass-item p-2 rounded-lg group transition-all duration-300 ${isResolved ? 'opacity-30' : 'hover:bg-white/5'}`}
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
