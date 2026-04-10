import { MOCK_ALERTS, MOCK_AUDIT_LOG } from '../data/alerts.data';

export const mockAlertsApi = {
  getActiveAlerts: async () =>
    MOCK_ALERTS.filter(
      (a) =>
        a.status === 'ACTIVE' ||
        a.status === 'PENDING_CONFIRMATION' ||
        a.status === 'CONFIRMED' ||
        a.status === 'AUTO_ESCALATED',
    ),
  getAllAlerts: async () => MOCK_ALERTS,
  getAlertById: async (id: string) => MOCK_ALERTS.find((a) => a.id === id) || MOCK_ALERTS[0],
  resolveAlert: async (
    id: string,
    _notes?: string,
    _actorUserId?: string,
    _actorRole?: string,
  ) => ({ ...MOCK_ALERTS[0], id, status: 'RESOLVED' as const }),
  confirmAlert: async (id: string, _actorUserId?: string, _actorRole?: string) => ({
    ...MOCK_ALERTS[0],
    id,
    status: 'CONFIRMED' as const,
  }),
  falseAlarmAlert: async (
    id: string,
    _notes?: string,
    _actorUserId?: string,
    _actorRole?: string,
  ) => ({
    ...MOCK_ALERTS[0],
    id,
    status: 'FALSE_ALARM' as const,
  }),
  requestInfoAlert: async (id: string, _actorUserId?: string, _actorRole?: string) => ({
    ...MOCK_ALERTS[0],
    id,
    status: 'ACTIVE' as const,
  }),
  addStatusUpdate: async (
    id: string,
    notes: string,
    _actorUserId?: string,
    _actorRole?: string,
  ) => ({
    id: `audit-${Date.now()}`,
    alertId: id,
    eventType: 'STATUS_UPDATE' as const,
    actorUserId: _actorUserId ?? null,
    actorRole: _actorRole ?? null,
    notes,
    escalationLevel: null,
    eventTimestamp: new Date().toISOString(),
  }),
  getAlertAuditLog: async (id: string) => MOCK_AUDIT_LOG.filter((entry) => entry.alertId === id),
};
