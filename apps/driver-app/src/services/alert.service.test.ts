import { AlertService } from './alert.service';
import api from './api.service';

jest.mock('./api.service', () => ({
  get: jest.fn(),
  patch: jest.fn(),
  create: jest.fn(() => ({
    interceptors: { request: { use: jest.fn() } },
  })),
}));

describe('AlertService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- getActiveAlerts ---

  it('should fetch and filter active alerts for a given routeId', async () => {
    const alerts = [
      {
        id: 'a1',
        routeId: 'route-1',
        vehicleId: 'v1',
        eventType: 'PANIC_BUTTON',
        status: 'ACTIVE',
        timestamp: '',
        createdAt: '',
      },
      {
        id: 'a2',
        routeId: 'route-2',
        vehicleId: 'v2',
        eventType: 'INCIDENT',
        status: 'ACTIVE',
        timestamp: '',
        createdAt: '',
      },
    ];
    (api.get as jest.Mock).mockResolvedValue({ data: alerts });

    const result = await AlertService.getActiveAlerts('route-1');

    expect(api.get).toHaveBeenCalledWith('/alerts/active', { params: { routeId: 'route-1' } });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a1');
  });

  it('should return empty array when API returns non-array data', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: null });

    const result = await AlertService.getActiveAlerts('route-1');

    expect(result).toEqual([]);
  });

  it('should return empty array when API call fails', async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await AlertService.getActiveAlerts('route-1');

    expect(result).toEqual([]);
  });

  // --- getAlertAuditLog ---

  it('should fetch audit log entries for a given alertId', async () => {
    const auditLog = [
      { id: 'log1', alertId: 'a1', action: 'INFO_REQUESTED', timestamp: '2026-01-01T00:00:00Z' },
      {
        id: 'log2',
        alertId: 'a1',
        action: 'STATUS_UPDATE',
        notes: 'All clear',
        timestamp: '2026-01-01T00:01:00Z',
      },
    ];
    (api.get as jest.Mock).mockResolvedValue({ data: auditLog });

    const result = await AlertService.getAlertAuditLog('a1');

    expect(api.get).toHaveBeenCalledWith('/alerts/a1/audit-trail');
    expect(result).toHaveLength(2);
    expect(result[0].action).toBe('INFO_REQUESTED');
  });

  it('should return empty array when audit log fetch fails', async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error('Server error'));

    const result = await AlertService.getAlertAuditLog('a1');

    expect(result).toEqual([]);
  });

  // --- addStatusUpdate ---

  it('should send a status update for an alert', async () => {
    (api.patch as jest.Mock).mockResolvedValue({});

    await AlertService.addStatusUpdate('a1', 'Everything is fine', 'driver-1');

    expect(api.patch).toHaveBeenCalledWith('/alerts/a1/status-update', {
      notes: 'Everything is fine',
      actorUserId: 'driver-1',
      actorRole: 'DRIVER',
    });
  });

  it('should throw error when status update fails', async () => {
    (api.patch as jest.Mock).mockRejectedValue(new Error('Update failed'));

    await expect(AlertService.addStatusUpdate('a1', 'test')).rejects.toThrow('Update failed');
  });

  it('should send status update without driverId when not provided', async () => {
    (api.patch as jest.Mock).mockResolvedValue({});

    await AlertService.addStatusUpdate('a1', 'No driver id');

    expect(api.patch).toHaveBeenCalledWith('/alerts/a1/status-update', {
      notes: 'No driver id',
      actorUserId: undefined,
      actorRole: 'DRIVER',
    });
  });
});
