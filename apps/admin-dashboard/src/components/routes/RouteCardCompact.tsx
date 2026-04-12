import React from 'react';
import { Route as RouteIcon, MapPin, Bus, Clock, AlertTriangle, Edit3 } from 'lucide-react';
import type { Route, LiveLocation } from '../../types';
import { formatEta } from '../../utils/formatters';

interface RouteCardCompactProps {
  route: Route;
  liveLocation?: LiveLocation;
  onClick?: () => void;
  onEdit?: (route: Route) => void;
}

const STATUS_DOT: Record<string, string> = {
  normal: 'bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.5)]',
  delay: 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.5)]',
  emergency: 'bg-rose-400 shadow-[0_0_4px_rgba(251,113,133,0.5)]',
};

function addMinutes(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

const RouteCardCompact: React.FC<RouteCardCompactProps> = ({
  route,
  liveLocation,
  onClick,
  onEdit,
}) => {
  const statusDot = liveLocation
    ? (STATUS_DOT[liveLocation.status] ?? STATUS_DOT.normal)
    : 'bg-slate-500';

  const endTime =
    route.startTime && route.estimatedDuration
      ? addMinutes(route.startTime, route.estimatedDuration)
      : null;

  return (
    <div
      data-testid={`route-card-${route.id}`}
      className="w-full text-left p-1.5 glass-item rounded-lg transition-all duration-300 hover:bg-white/5 group"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
        className="flex items-center gap-2 cursor-pointer"
      >
        <div className="w-6 h-6 rounded flex items-center justify-center bg-blue-500/10 text-blue-400 relative shrink-0">
          <RouteIcon size={12} />
          <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${statusDot}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-white tracking-tighter truncate leading-none">
              {route.name}
            </p>
            <span className="text-[7px] font-black text-slate-400 uppercase ml-2 shrink-0">
              {route.direction}
            </span>
          </div>
          {route.schoolName && (
            <p
              className="text-[7px] font-bold text-slate-500 truncate leading-none mt-0.5"
              data-testid="route-school-name"
            >
              {route.schoolName}
            </p>
          )}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2 opacity-90">
              {route.startTime && (
                <div
                  className="flex items-center gap-0.5 text-[7px] font-bold text-slate-400"
                  data-testid="route-start-time"
                >
                  <Clock size={7} />
                  <span>
                    {route.startTime}
                    {endTime ? ` → ${endTime}` : ''}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-0.5 text-[7px] font-bold text-slate-500">
                <MapPin size={7} />
                <span>{route.stops.length}</span>
              </div>
              {liveLocation && (
                <>
                  <div className="flex items-center gap-0.5 text-[7px] font-black text-slate-400">
                    <Bus size={7} />
                    <span>{liveLocation.vehicleId}</span>
                  </div>
                  {liveLocation.deviationFlag && (
                    <AlertTriangle size={8} className="text-amber-400" />
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              {liveLocation && (
                <span className="text-[7px] font-bold text-slate-500 tabular-nums">
                  <Clock size={7} className="inline mr-0.5" />
                  {formatEta(liveLocation.etaToNextStopMinutes)}
                </span>
              )}
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(route);
                  }}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 text-[7px] font-bold text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded transition-colors"
                  data-testid={`edit-route-btn-${route.id}`}
                >
                  <Edit3 size={8} />
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteCardCompact;
