import React from 'react';
import type { Alert } from '../../types';
import AlertCard from './AlertCard';

interface AlertListProps {
  alerts: Alert[];
  onAlertClick?: (alert: Alert) => void;
  onAlertAction?: (alert: Alert) => void;
  emptyMessage?: string;
  compact?: boolean;
  routeNames?: Record<string, string>;
}

const AlertList: React.FC<AlertListProps> = ({
  alerts,
  onAlertClick,
  onAlertAction,
  emptyMessage = 'No alerts',
  compact = true,
  routeNames,
}) => {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onClick={() => onAlertClick?.(alert)}
          onAction={onAlertAction}
          compact={compact}
          routeName={routeNames?.[alert.routeId]}
        />
      ))}
    </div>
  );
};

export default AlertList;
