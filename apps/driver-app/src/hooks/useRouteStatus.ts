import { useState, useEffect, useCallback } from 'react';
import { AlertService } from '../services/alert.service';
import { ROUTE_STATUS_POLL_MS } from '../config/constants';

export type RouteStatus = 'normal' | 'delay' | 'emergency';

export const STATUS_COLORS: Record<RouteStatus, string> = {
  normal: '#22c55e',
  delay: '#eab308',
  emergency: '#ef4444',
};

export function useRouteStatus(routeId: string | undefined): {
  status: RouteStatus;
  infoRequestCount: number;
} {
  const [status, setStatus] = useState<RouteStatus>('normal');
  const [infoRequestCount, setInfoRequestCount] = useState(0);

  const poll = useCallback(async () => {
    if (!routeId) return;
    try {
      const alerts = await AlertService.getActiveAlerts(routeId);

      // Derive status from active alerts
      let derived: RouteStatus = 'normal';
      for (const alert of alerts) {
        const type = (alert.eventType ?? '').toUpperCase();
        const alertStatus = (alert.status ?? '').toUpperCase();
        if (alertStatus === 'RESOLVED' || alertStatus === 'FALSE_ALARM') continue;
        if (type.includes('PANIC') || type.includes('EMERGENCY')) {
          derived = 'emergency';
          break;
        }
        if (type.includes('DELAY') || type.includes('DEVIATION') || type.includes('INCIDENT')) {
          derived = 'delay';
        }
      }
      setStatus(derived);

      // Count info requests across all alerts
      let count = 0;
      for (const alert of alerts) {
        const log = await AlertService.getAlertAuditLog(alert.id);
        count += log.filter((e) => e.action === 'INFO_REQUESTED').length;
      }
      setInfoRequestCount(count);
    } catch {
      // Non-critical; keep previous values
    }
  }, [routeId]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, ROUTE_STATUS_POLL_MS);
    return () => clearInterval(interval);
  }, [poll]);

  return { status, infoRequestCount };
}
