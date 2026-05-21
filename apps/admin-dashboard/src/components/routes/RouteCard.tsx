import React from 'react';
import { MapPin, Clock, AlertTriangle, Bus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Route, LiveLocation } from '../../types';
import { formatEta } from '../../utils/formatters';

interface RouteCardProps {
  route: Route;
  liveLocation?: LiveLocation;
  onClick?: () => void;
}

const RouteCard: React.FC<RouteCardProps> = ({ route, liveLocation, onClick }) => {
  const { t } = useTranslation(['routes']);
  const getStatusColor = () => {
    if (route.status !== 'active') return 'bg-slate-500';
    if (liveLocation?.status === 'emergency') return 'bg-red-500';
    if (liveLocation?.status === 'delay' || liveLocation?.deviationFlag) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className="p-4 bg-dashboard-card border border-dashboard-border rounded-xl hover:bg-slate-800 transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <div>
            <h4 className="font-semibold text-white">{route.name}</h4>
            <p className="text-xs text-slate-400">
              {t('routes:routeCard.directionLabel', { direction: route.direction })}
            </p>
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            route.status === 'active'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-slate-500/20 text-slate-400'
          }`}
        >
          {route.status}
        </span>
      </div>

      {liveLocation && (
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-dashboard-border">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Bus size={14} className="text-primary-500" />
            <span>{liveLocation.vehicleId}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Clock size={14} className="text-primary-500" />
            <span>
              {t('routes:routeCard.eta', { eta: formatEta(liveLocation.etaToNextStopMinutes) })}
            </span>
          </div>
          {liveLocation.deviationFlag && (
            <div className="col-span-2 flex items-center gap-2 text-sm text-yellow-400">
              <AlertTriangle size={14} />
              <span>{t('routes:routeCard.routeDeviation')}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
        <MapPin size={12} />
        <span>{t('routes:routeCard.stops', { count: route.stops?.length ?? 0 })}</span>
      </div>
    </div>
  );
};

export default RouteCard;
