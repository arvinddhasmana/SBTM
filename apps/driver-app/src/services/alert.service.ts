import api from './api.service';

export interface ActiveAlert {
  id: string;
  vehicleId: string;
  routeId: string;
  eventType: string;
  status: string;
  description?: string;
  timestamp: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  alertId: string;
  action: string;
  actorUserId?: string;
  actorRole?: string;
  notes?: string;
  timestamp: string;
}

/**
 * Alert service for driver-side alert interactions.
 * Supports the lightweight Request Info MVP:
 *   - Fetch active alerts for the driver's current route
 *   - Fetch audit log entries (contains INFO_REQUESTED messages from admin)
 *   - Post status updates (driver responses to info requests)
 */
export const AlertService = {
  /**
   * Get all active alerts for a given route.
   * The driver sees alerts relevant to their current route.
   */
  getActiveAlerts: async (routeId: string): Promise<ActiveAlert[]> => {
    try {
      const response = await api.get<ActiveAlert[]>('/alerts/active', {
        params: { routeId },
      });
      const data = response.data;
      // Filter to only alerts for this route (in case the API returns broader results)
      if (Array.isArray(data)) {
        return data.filter((a) => a.routeId === routeId);
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch active alerts', error);
      return [];
    }
  },

  /**
   * Get the audit log for a specific alert.
   * INFO_REQUESTED entries indicate admin has asked for more information.
   */
  getAlertAuditLog: async (alertId: string): Promise<AuditLogEntry[]> => {
    try {
      const response = await api.get<AuditLogEntry[]>(`/alerts/${alertId}/audit-trail`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Failed to fetch alert audit log', error);
      return [];
    }
  },

  /**
   * Post a status update / response to an alert.
   * Used by drivers to respond to admin "Request Info" messages.
   */
  addStatusUpdate: async (alertId: string, notes: string, driverId?: string): Promise<void> => {
    try {
      await api.patch(`/alerts/${alertId}/status-update`, {
        notes,
        actorUserId: driverId,
        actorRole: 'DRIVER',
      });
      console.log('Status update sent for alert', alertId);
    } catch (error) {
      console.error('Failed to send status update', error);
      throw error;
    }
  },
};
