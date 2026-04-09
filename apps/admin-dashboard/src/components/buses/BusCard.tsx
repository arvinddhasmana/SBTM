import React from 'react';
import { Bus, Route as RouteIcon } from 'lucide-react';
import type { LiveLocation, Route } from '../../types';

export interface BusCardProps {
  location: LiveLocation;
  route?: Route;
  onClick?: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  normal: 'bg-emerald-500/10 text-emerald-400',
  delay: 'bg-amber-500/10 text-amber-400',
  emergency: 'bg-rose-500/10 text-rose-400',
};

const BusCard: React.FC<BusCardProps> = ({ location, route, onClick }) => {
  const statusStyle = STATUS_STYLES[location.status] ?? STATUS_STYLES.normal;

  return (
    <button
      onClick={onClick}
      data-testid={`bus-card-${location.vehicleId}`}
      className="w-full text-left p-1.5 glass-item rounded-lg transition-all duration-300 hover:bg-white/5 flex items-center gap-2 group"
    >
      <div className={`w-6 h-6 rounded flex items-center justify-center ${statusStyle}`}>
        <Bus size={12} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black text-white tracking-tighter truncate leading-none">
            {location.vehicleId}
          </p>
          {route && (
            <div className="flex items-center gap-0.5 px-1 bg-blue-500/10 rounded text-[7px] font-black text-blue-400 uppercase ml-2">
              <RouteIcon size={8} />
              <span>{route.name || route.id.split('-').pop()}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <span
            className={`px-1 rounded text-[7px] font-black uppercase tracking-widest ${statusStyle}`}
          >
            {location.status}
          </span>
          {location.deviationFlag && (
            <span className="px-1 rounded text-[7px] font-black uppercase text-amber-400 bg-amber-500/20">
              DEV
            </span>
          )}
          <span className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter tabular-nums">
            ETA {location.etaToNextStopMinutes}m
          </span>
        </div>
      </div>
    </button>
  );
};

export default BusCard;
