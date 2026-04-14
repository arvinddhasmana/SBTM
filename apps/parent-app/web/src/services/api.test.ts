import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: mockGet,
      post: mockPost,
      put: mockPut,
      delete: mockDelete,
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}));

// Import after mock is set up
const { parentApi } = await import('./api');

describe('parentApi', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockPut.mockReset();
    mockDelete.mockReset();
  });

  // --- login ---
  it('should call POST /api/v1/auth/login and return response data', async () => {
    const responseData = {
      accessToken: 'token-123',
      user: { id: '1', email: 'parent@test.com', role: 'PARENT' },
    };
    mockPost.mockResolvedValue({ data: responseData });

    const result = await parentApi.login('parent@test.com', 'password');

    expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/login', {
      email: 'parent@test.com',
      password: 'password',
    });
    expect(result).toEqual(responseData);
  });

  // --- logout ---
  it('should call POST /api/v1/auth/logout', async () => {
    mockPost.mockResolvedValue({});

    await parentApi.logout();

    expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/logout');
  });

  // --- getChildren ---
  it('should call GET /api/v1/parent/children and return children array', async () => {
    const children = [
      {
        id: 'c1',
        name: 'Child One',
        schoolName: 'School A',
        routeId: 'r1',
        vehicleId: 'v1',
        status: 'at_home',
      },
    ];
    mockGet.mockResolvedValue({ data: children });

    const result = await parentApi.getChildren();

    expect(mockGet).toHaveBeenCalledWith('/api/v1/parent/children');
    expect(result).toEqual(children);
  });

  // --- getLiveLocation ---
  it('should fetch live location for a route', async () => {
    const locationData = {
      routeId: 'r1',
      vehicleId: 'bus-1',
      lastUpdate: '2026-01-01T00:00:00Z',
      position: { lat: 45.42, lng: -75.69 },
    };
    mockGet.mockResolvedValue({ data: locationData });

    const result = await parentApi.getLiveLocation('r1');

    expect(mockGet).toHaveBeenCalledWith('/api/v1/routes/r1/live-location');
    expect(result).toEqual(locationData);
  });

  // --- getActiveAlert ---
  it('should return alert when alertActive is true', async () => {
    const alertData = {
      alertActive: true,
      id: 'alert-1',
      routeId: 'r1',
      vehicleId: 'v1',
      eventType: 'PANIC_BUTTON',
      message: 'Emergency!',
      createdAt: '2026-01-01T00:00:00Z',
    };
    mockGet.mockResolvedValue({ data: alertData });

    const result = await parentApi.getActiveAlert('r1');

    expect(mockGet).toHaveBeenCalledWith('/api/v1/alerts/parent-view/r1');
    expect(result).toEqual(alertData);
  });

  it('should return null when alertActive is false', async () => {
    mockGet.mockResolvedValue({ data: { alertActive: false, message: 'No alert' } });

    const result = await parentApi.getActiveAlert('r1');

    expect(result).toBeNull();
  });

  // --- getAlertHistory ---
  it('should fetch alert history', async () => {
    const history = [{ id: 'ah-1', eventType: 'PANIC_BUTTON', status: 'RESOLVED' }];
    mockGet.mockResolvedValue({ data: history });

    const result = await parentApi.getAlertHistory();

    expect(mockGet).toHaveBeenCalledWith('/api/v1/alerts/parent-history');
    expect(result).toEqual(history);
  });

  // --- reportAbsence ---
  it('should post an absence report', async () => {
    const payload = { studentId: 's1', tripDate: '2026-04-14', routeType: 'AM' as const };
    const response = {
      id: 'abs-1',
      ...payload,
      guardianUserId: 'u1',
      schoolId: 'sc1',
      createdAt: '',
    };
    mockPost.mockResolvedValue({ data: response });

    const result = await parentApi.reportAbsence(payload);

    expect(mockPost).toHaveBeenCalledWith('/api/v1/absences', payload);
    expect(result.id).toBe('abs-1');
  });

  // --- cancelAbsence ---
  it('should delete an absence', async () => {
    mockDelete.mockResolvedValue({});

    await parentApi.cancelAbsence('abs-1');

    expect(mockDelete).toHaveBeenCalledWith('/api/v1/absences/abs-1');
  });

  // --- getNotificationPreferences ---
  it('should fetch notification preferences', async () => {
    const prefs = [{ eventType: 'PANIC_BUTTON', channel: 'push', enabled: true }];
    mockGet.mockResolvedValue({ data: prefs });

    const result = await parentApi.getNotificationPreferences();

    expect(mockGet).toHaveBeenCalledWith('/api/v1/notification-preferences');
    expect(result).toEqual(prefs);
  });

  // --- updateNotificationPreferences ---
  it('should update notification preferences', async () => {
    const prefs = [{ eventType: 'PANIC_BUTTON', channel: 'push', enabled: false }];
    mockPut.mockResolvedValue({});

    await parentApi.updateNotificationPreferences(prefs);

    expect(mockPut).toHaveBeenCalledWith('/api/v1/notification-preferences', {
      preferences: prefs,
    });
  });

  // --- getMe ---
  it('should return user data from getMe', async () => {
    const meData = { id: 'u1', email: 'parent@test.com', role: 'PARENT' };
    mockGet.mockResolvedValue({ data: meData });

    const result = await parentApi.getMe();

    expect(mockGet).toHaveBeenCalledWith('/api/v1/auth/me');
    expect(result).toEqual(meData);
  });

  it('should return null when getMe fails', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const result = await parentApi.getMe();

    expect(result).toBeNull();
  });
});
