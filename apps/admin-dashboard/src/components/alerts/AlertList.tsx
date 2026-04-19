import React from 'react';
import type { Alert, AlertAuditEntry } from '../../types';
import AlertCard from './AlertCard';

interface AlertListProps {
  alerts: Alert[];
  onAlertClick?: (alert: Alert) => void;
  onAlertAction?: (alert: Alert) => void;
  emptyMessage?: string;
  compact?: boolean;
  routeNames?: Record<string, string>;
  /** ID of the alert whose timeline is currently expanded (expanded mode only). */
  expandedTimelineAlertId?: string | null;
  /** Audit trail entries for the currently expanded timeline. */
  expandedTimelineAudit?: AlertAuditEntry[];
  /** Callback to toggle timeline visibility for a given alert ID. */
  onToggleTimeline?: (alertId: string) => void;
}

const AlertList: React.FC<AlertListProps> = ({
  alerts,
  onAlertClick,
  onAlertAction,
  emptyMessage = 'No alerts',
  compact = true,
  routeNames,
  expandedTimelineAlertId,
  expandedTimelineAudit,
  onToggleTimeline,
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
          auditTrail={expandedTimelineAlertId === alert.id ? expandedTimelineAudit : undefined}
          showTimeline={expandedTimelineAlertId === alert.id}
          onToggleTimeline={
            !compact && onToggleTimeline ? () => onToggleTimeline(alert.id) : undefined
          }
        />
      ))}
    </div>
  );
};

export default AlertList;
