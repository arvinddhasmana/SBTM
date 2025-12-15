import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import type { Alert } from '../../types';
import { formatRelativeTime, formatEventType } from '../../utils/formatters';

interface AlertCardProps {
    alert: Alert;
    onClick?: () => void;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert, onClick }) => {
    const getAlertIcon = () => {
        switch (alert.eventType) {
            case 'PANIC_BUTTON':
                return <AlertTriangle className="text-red-500" size={20} />;
            case 'INCIDENT':
                return <AlertCircle className="text-yellow-500" size={20} />;
            default:
                return <Info className="text-blue-500" size={20} />;
        }
    };

    const getStatusBadge = () => {
        if (alert.status === 'RESOLVED') {
            return (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                    <CheckCircle size={12} />
                    Resolved
                </span>
            );
        }
        return (
            <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium animate-pulse-slow">
                Active
            </span>
        );
    };

    return (
        <div
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
            className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${alert.status === 'ACTIVE'
                    ? 'bg-red-500/5 border-red-500/30 hover:bg-red-500/10'
                    : 'bg-dashboard-card border-dashboard-border hover:bg-slate-800'
                }`}
        >
            <div className="flex items-start gap-3">
                <div className="mt-0.5">{getAlertIcon()}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-white truncate">
                            {formatEventType(alert.eventType)}
                        </span>
                        {getStatusBadge()}
                    </div>
                    <p className="text-sm text-slate-400 mb-2 line-clamp-2">
                        {alert.description || `Alert on ${alert.routeId}`}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>Vehicle: {alert.vehicleId}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(alert.timestamp)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AlertCard;
