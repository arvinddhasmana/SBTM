import React from 'react';
import type { Alert } from '../../types';
import AlertCard from './AlertCard';

interface AlertListProps {
    alerts: Alert[];
    onAlertClick?: (alert: Alert) => void;
    emptyMessage?: string;
}

const AlertList: React.FC<AlertListProps> = ({ alerts, onAlertClick, emptyMessage = 'No alerts' }) => {
    if (alerts.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500">
                <p>{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {alerts.map((alert) => (
                <AlertCard
                    key={alert.id}
                    alert={alert}
                    onClick={() => onAlertClick?.(alert)}
                />
            ))}
        </div>
    );
};

export default AlertList;
