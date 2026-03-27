import React from 'react';
import {
    X,
    MapPin,
    Clock,
    Bus,
    Navigation,
    AlertTriangle,
    CheckCircle,
    Calendar,
    Hash,
} from 'lucide-react';
import type { Route, LiveLocation } from '../../types';
import { formatEta, formatRelativeTime } from '../../utils/formatters';

interface RouteDetailProps {
    route: Route;
    liveLocation?: LiveLocation;
    onClose: () => void;
}

const statusConfig = {
    active: {
        label: 'Active',
        dotColor: '#10b981',
        bg: 'rgba(16,185,129,0.1)',
        border: 'rgba(16,185,129,0.25)',
        text: '#34d399',
    },
    scheduled: {
        label: 'Scheduled',
        dotColor: '#f59e0b',
        bg: 'rgba(245,158,11,0.1)',
        border: 'rgba(245,158,11,0.25)',
        text: '#fbbf24',
    },
    completed: {
        label: 'Completed',
        dotColor: '#6b7280',
        bg: 'rgba(100,116,139,0.1)',
        border: 'rgba(100,116,139,0.2)',
        text: '#9ca3af',
    },
};

const RouteDetail: React.FC<RouteDetailProps> = ({ route, liveLocation, onClose }) => {
    const status = route.status ?? 'scheduled';
    const cfg = statusConfig[status] ?? statusConfig.scheduled;

    return (
        <div
            className="h-full flex flex-col animate-slide-in-right"
            style={{
                background: 'linear-gradient(135deg, rgba(13,27,51,0.95) 0%, rgba(6,13,31,0.98) 100%)',
            }}
        >
            {/* ── Header ─────────────────────────────────────────── */}
            <div
                className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(30,58,95,0.5)' }}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.2)' }}
                    >
                        <Navigation size={16} className="text-primary-400" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{route.name}</p>
                        <p className="text-xs text-slate-500 truncate">
                            {route.direction} · {route.stops.length} stops
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close route detail"
                    className="btn-icon flex-shrink-0"
                >
                    <X size={16} />
                </button>
            </div>

            {/* ── Scrollable body ────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">

                {/* Status + Live data */}
                <div className="grid grid-cols-2 gap-3">
                    <div
                        className="flex flex-col gap-1 p-3 rounded-xl"
                        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                    >
                        <p className="text-xs text-slate-500">Status</p>
                        <div className="flex items-center gap-2">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ background: cfg.dotColor }}
                            />
                            <p className="text-sm font-semibold" style={{ color: cfg.text }}>
                                {cfg.label}
                            </p>
                        </div>
                    </div>

                    <div
                        className="flex flex-col gap-1 p-3 rounded-xl"
                        style={{
                            background: 'rgba(14,165,233,0.06)',
                            border: '1px solid rgba(14,165,233,0.15)',
                        }}
                    >
                        <p className="text-xs text-slate-500">Direction</p>
                        <p className="text-sm font-semibold text-primary-400">{route.direction}</p>
                    </div>
                </div>

                {/* Vehicle & Start Time */}
                <div
                    className="grid grid-cols-2 gap-3"
                >
                    <div
                        className="p-3 rounded-xl"
                        style={{
                            background: 'rgba(13,27,51,0.6)',
                            border: '1px solid rgba(30,58,95,0.4)',
                        }}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <Bus size={12} className="text-slate-500" />
                            <p className="text-xs text-slate-500">Vehicle</p>
                        </div>
                        <p className="text-sm font-semibold text-white">
                            {route.vehicle?.licensePlate ?? route.vehicleId ?? '—'}
                        </p>
                    </div>

                    <div
                        className="p-3 rounded-xl"
                        style={{
                            background: 'rgba(13,27,51,0.6)',
                            border: '1px solid rgba(30,58,95,0.4)',
                        }}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <Clock size={12} className="text-slate-500" />
                            <p className="text-xs text-slate-500">Start</p>
                        </div>
                        <p className="text-sm font-semibold text-white">
                            {route.startTime
                                ? new Date(route.startTime).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                  })
                                : '—'}
                        </p>
                    </div>
                </div>

                {/* Live location block */}
                {liveLocation && (
                    <div
                        className="p-4 rounded-xl space-y-3"
                        style={{
                            background:
                                liveLocation.status === 'emergency'
                                    ? 'rgba(244,63,94,0.08)'
                                    : liveLocation.status === 'delay'
                                    ? 'rgba(245,158,11,0.08)'
                                    : 'rgba(16,185,129,0.06)',
                            border: `1px solid ${
                                liveLocation.status === 'emergency'
                                    ? 'rgba(244,63,94,0.25)'
                                    : liveLocation.status === 'delay'
                                    ? 'rgba(245,158,11,0.2)'
                                    : 'rgba(16,185,129,0.15)'
                            }`,
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Live Tracking
                            </p>
                            <span
                                className="text-xs font-semibold"
                                style={{
                                    color:
                                        liveLocation.status === 'emergency'
                                            ? '#fb7185'
                                            : liveLocation.status === 'delay'
                                            ? '#fbbf24'
                                            : '#34d399',
                                }}
                            >
                                {liveLocation.status === 'emergency' && '🚨 Emergency'}
                                {liveLocation.status === 'delay' && '⚠️ Delayed'}
                                {liveLocation.status === 'normal' && '✓ On Schedule'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <p className="text-slate-500 mb-0.5">ETA to next stop</p>
                                <p className="font-semibold text-white">
                                    {formatEta(liveLocation.etaToNextStopMinutes)}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-500 mb-0.5">Last update</p>
                                <p className="font-semibold text-white">
                                    {formatRelativeTime(liveLocation.lastUpdate)}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-500 mb-0.5">Lat</p>
                                <p className="font-mono text-xs text-slate-300">
                                    {liveLocation.position.lat.toFixed(5)}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-500 mb-0.5">Lng</p>
                                <p className="font-mono text-xs text-slate-300">
                                    {liveLocation.position.lng.toFixed(5)}
                                </p>
                            </div>
                        </div>

                        {liveLocation.deviationFlag && (
                            <div className="flex items-center gap-2 text-xs text-amber-400">
                                <AlertTriangle size={12} />
                                <span>Route deviation detected</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Stops list */}
                <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        Stops ({route.stops.length})
                    </p>
                    {route.stops.length === 0 ? (
                        <p className="text-xs text-slate-600 italic">No stops configured</p>
                    ) : (
                        <ol className="relative space-y-0 ml-2">
                            {/* Vertical line */}
                            <div
                                className="absolute left-1.5 top-2 bottom-2 w-px"
                                style={{ background: 'rgba(30,58,95,0.5)' }}
                            />
                            {route.stops
                                .slice()
                                .sort((a, b) => a.sequence - b.sequence)
                                .map((stop, idx) => (
                                    <li key={stop.id} className="relative flex items-start gap-3 pb-3 last:pb-0">
                                        {/* Dot */}
                                        <div
                                            className="w-3 h-3 rounded-full flex-shrink-0 mt-1 z-10"
                                            style={{
                                                background:
                                                    idx === 0
                                                        ? '#10b981'
                                                        : idx === route.stops.length - 1
                                                        ? '#0ea5e9'
                                                        : 'rgba(30,58,95,0.9)',
                                                border:
                                                    idx === 0
                                                        ? '2px solid rgba(16,185,129,0.5)'
                                                        : idx === route.stops.length - 1
                                                        ? '2px solid rgba(14,165,233,0.4)'
                                                        : '2px solid rgba(30,58,95,0.6)',
                                            }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-xs font-medium text-slate-300 truncate">
                                                    {stop.address}
                                                </p>
                                                <span className="text-xs text-slate-600 flex-shrink-0">
                                                    #{stop.sequence}
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                        </ol>
                    )}
                </div>

                {/* Route metadata */}
                <div
                    className="grid grid-cols-2 gap-2 pt-2"
                    style={{ borderTop: '1px solid rgba(30,58,95,0.35)' }}
                >
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Hash size={11} />
                        <span className="truncate">{route.id}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Calendar size={11} />
                        <span>{route.estimatedDuration ?? '—'} min</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RouteDetail;
