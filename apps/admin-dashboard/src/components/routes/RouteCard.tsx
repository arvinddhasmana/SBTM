import React from 'react';
import { MapPin, Clock, AlertTriangle, Bus, ChevronRight } from 'lucide-react';
import type { Route, LiveLocation } from '../../types';
import { formatEta } from '../../utils/formatters';

interface RouteCardProps {
    route: Route;
    liveLocation?: LiveLocation;
    onClick?: () => void;
}

const statusColorMap: Record<string, { dot: string; badge: string; text: string }> = {
    active: { dot: '#10b981', badge: 'rgba(16,185,129,0.12)', text: '#34d399' },
    scheduled: { dot: '#f59e0b', badge: 'rgba(245,158,11,0.1)', text: '#fbbf24' },
    completed: { dot: '#6b7280', badge: 'rgba(100,116,139,0.1)', text: '#9ca3af' },
};

const liveStatusMap: Record<string, { dot: string }> = {
    normal: { dot: '#10b981' },
    delay: { dot: '#f59e0b' },
    emergency: { dot: '#f43f5e' },
};

const RouteCard: React.FC<RouteCardProps> = ({ route, liveLocation, onClick }) => {
    const status = route.status ?? 'scheduled';
    const statusColors = statusColorMap[status] ?? statusColorMap.scheduled;

    const liveDot = liveLocation
        ? (liveStatusMap[liveLocation.status] ?? liveStatusMap.normal).dot
        : null;

    return (
        <div
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
            className="group relative p-3 rounded-xl transition-all duration-200 cursor-pointer animate-fade-in"
            style={{
                background: 'rgba(13,27,51,0.5)',
                border: '1px solid rgba(30,58,95,0.4)',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(14,165,233,0.06)';
                e.currentTarget.style.borderColor = 'rgba(14,165,233,0.2)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(13,27,51,0.5)';
                e.currentTarget.style.borderColor = 'rgba(30,58,95,0.4)';
            }}
        >
            {/* Top row */}
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    {/* Status dot */}
                    <div className="flex-shrink-0 relative">
                        <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                                background: liveDot ?? statusColors.dot,
                                boxShadow: `0 0 6px ${liveDot ?? statusColors.dot}80`,
                            }}
                        />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate leading-tight">
                            {route.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{route.direction} Route</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                            background: statusColors.badge,
                            color: statusColors.text,
                        }}
                    >
                        {status}
                    </span>
                    <ChevronRight
                        size={14}
                        className="text-slate-600 group-hover:text-primary-400 transition-colors"
                    />
                </div>
            </div>

            {/* Live location row */}
            {liveLocation && (
                <div
                    className="flex items-center gap-3 mt-2 pt-2 text-xs text-slate-500"
                    style={{ borderTop: '1px solid rgba(30,58,95,0.35)' }}
                >
                    <div className="flex items-center gap-1.5">
                        <Bus size={12} className="text-primary-500 flex-shrink-0" />
                        <span className="truncate">{liveLocation.vehicleId}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-primary-500 flex-shrink-0" />
                        <span>{formatEta(liveLocation.etaToNextStopMinutes)}</span>
                    </div>
                    {liveLocation.deviationFlag && (
                        <div className="flex items-center gap-1 text-amber-400 ml-auto">
                            <AlertTriangle size={11} />
                            <span>Deviation</span>
                        </div>
                    )}
                </div>
            )}

            {/* Stops count */}
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-600">
                <MapPin size={11} />
                <span>{route.stops.length} stop{route.stops.length !== 1 ? 's' : ''}</span>
            </div>
        </div>
    );
};

export default RouteCard;

