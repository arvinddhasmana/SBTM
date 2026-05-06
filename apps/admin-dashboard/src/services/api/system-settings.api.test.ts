/**
 * Unit tests for system-settings API client
 *
 * Tests that the correct API endpoints are called with correct parameters.
 * Uses mock apiClient (vi.mock) — no real HTTP calls and no VITE_API_URL required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { systemSettingsApi } from './system-settings.api';
import { apiClient } from './api-client';

vi.mock('./api-client', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  AUTH_TOKEN_KEY: 'auth_token',
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('systemSettingsApi.getGpsSource', () => {
  it('calls correct endpoint and returns data', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { source: 'DRIVER_APP' } });
    const result = await systemSettingsApi.getGpsSource();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/system-settings/gps-source');
    expect(result.source).toBe('DRIVER_APP');
  });
});

describe('systemSettingsApi.setGpsSource', () => {
  it('calls PUT with correct payload', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { source: 'DEDICATED_GPS' } });
    const result = await systemSettingsApi.setGpsSource('DEDICATED_GPS');
    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/system-settings/gps-source', {
      source: 'DEDICATED_GPS',
    });
    expect(result.source).toBe('DEDICATED_GPS');
  });
});

describe('systemSettingsApi.listDeviceTokens', () => {
  it('calls GET with schoolId param', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });
    await systemSettingsApi.listDeviceTokens('sch-abc');
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/system-settings/gps-device-tokens', {
      params: { schoolId: 'sch-abc' },
    });
  });
});

describe('systemSettingsApi.createDeviceToken', () => {
  it('calls POST with correct DTO and returns created token', async () => {
    const createdToken = {
      id: 'tok-1',
      token: 'z'.repeat(64),
      maskedToken: '...zzzzzzzz',
      vehicleId: 'VEH-101',
      schoolId: 'sch-101',
      description: 'Test tracker',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastSeenAt: null,
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: createdToken });

    const result = await systemSettingsApi.createDeviceToken({
      vehicleId: 'VEH-101',
      schoolId: 'sch-101',
      description: 'Test tracker',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/system-settings/gps-device-tokens', {
      vehicleId: 'VEH-101',
      schoolId: 'sch-101',
      description: 'Test tracker',
    });
    expect(result.token).toBe('z'.repeat(64));
  });
});

describe('systemSettingsApi.deleteDeviceToken', () => {
  it('calls DELETE with correct id path', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined });
    await systemSettingsApi.deleteDeviceToken('tok-del-42');
    expect(apiClient.delete).toHaveBeenCalledWith(
      '/api/v1/system-settings/gps-device-tokens/tok-del-42',
    );
  });
});
