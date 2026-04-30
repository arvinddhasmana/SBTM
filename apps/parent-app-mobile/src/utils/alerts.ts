import type { Alert, AlertEventType, Child, BusLocationUpdate } from '../types';

/** Stale threshold for live bus location, in ms. */
export const LIVE_LOCATION_STALE_MS = 120_000;

export const ALERT_EVENT_LABELS: Record<string, string> = {
  PANIC_BUTTON: 'Emergency: Panic Button',
  LATE_ARRIVAL: 'Late Arrival',
  ROUTE_DEVIATION: 'Route Deviation',
  INCIDENT: 'Incident Reported',
  OTHER: 'Alert',
};

export function alertEventLabel(eventType: string): string {
  return ALERT_EVENT_LABELS[eventType] ?? eventType.replace(/_/g, ' ');
}

export const AUDIT_EVENT_LABELS: Record<string, string> = {
  CREATED: 'Alert created',
  CONFIRMED: 'Confirmed',
  STATUS_UPDATE: 'Status updated',
  TIER_ESCALATED: 'Escalated',
  AUTO_ESCALATED: 'Auto-escalated',
  RESOLVED: 'Resolved',
  FALSE_ALARM: 'Marked false alarm',
  PARENT_NOTIFIED: 'Parents notified',
  INFO_REQUESTED: 'Info requested',
  COMMENT: 'Comment',
};

export function auditEventLabel(eventType: string): string {
  return AUDIT_EVENT_LABELS[eventType] ?? eventType.replace(/_/g, ' ');
}

export function auditEventColor(eventType: string): string {
  const t = (eventType || '').toUpperCase();
  if (t === 'CONFIRMED' || t === 'STATUS_UPDATE') return '#3b82f6';
  if (t === 'RESOLVED') return '#22c55e';
  if (t.includes('ESCALAT')) return '#f97316';
  if (t === 'FALSE_ALARM') return '#94a3b8';
  if (t === 'PARENT_NOTIFIED') return '#a855f7';
  return '#a5b4fc';
}

/**
 * Whether this alert affects the given child (by route).
 * Mirrors web portal Dashboard.tsx childMatchesAlert().
 */
export function childMatchesAlert(child: Child, alert: Alert): boolean {
  return [child.amRouteId, child.pmRouteId].filter(Boolean).includes(alert.routeId);
}

/** Children affected by an alert. */
export function affectedChildren(alert: Alert, children: Child[]): Child[] {
  return children.filter((c) => childMatchesAlert(c, alert));
}

/**
 * Derive a child's status from live bus locations and alerts.
 * Falls back to backend-provided status when no live signal is available.
 *
 * Logic:
 *   - If a live, non-stale bus is moving on the child's AM/PM route → 'on_bus'
 *   - Else fall back to the backend `status` field
 */
export function deriveChildStatus(
  child: Child,
  liveLocations: Record<string, BusLocationUpdate>,
): Child['status'] {
  const now = Date.now();
  const routeIds = [child.amRouteId, child.pmRouteId].filter(Boolean) as string[];
  for (const id of routeIds) {
    const loc = liveLocations[id];
    if (!loc) continue;
    const ageMs = now - new Date(loc.timestamp).getTime();
    if (ageMs < LIVE_LOCATION_STALE_MS) {
      return 'on_bus';
    }
  }
  return child.status ?? 'unknown';
}

export type AlertSeverityLevel = 'crit' | 'warn' | 'info' | 'ok';

export function alertSeverity(alert: Alert): AlertSeverityLevel {
  if (alert.eventType === 'PANIC_BUTTON' || alert.eventType === 'INCIDENT') return 'crit';
  if (alert.eventType === 'LATE_ARRIVAL' || alert.eventType === 'ROUTE_DEVIATION') return 'warn';
  if (alert.status === 'RESOLVED') return 'ok';
  return 'info';
}

export function alertEventEmoji(eventType: AlertEventType | string): string {
  switch (eventType) {
    case 'PANIC_BUTTON':
      return '🚨';
    case 'INCIDENT':
      return '⚠';
    case 'LATE_ARRIVAL':
      return '⏱';
    case 'ROUTE_DEVIATION':
      return '🛣';
    default:
      return 'ℹ';
  }
}
