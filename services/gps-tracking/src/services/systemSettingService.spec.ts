/**
 * Unit tests for SystemSettingService
 *
 * Tests the in-process cache behaviour and DB interaction for the
 * GPS tracking source setting.
 */
import { SystemSettingService } from '../services/systemSettingService';

// ── Mock Prisma ──────────────────────────────────────────────────────────────
jest.mock('../prisma', () => ({
  systemSetting: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
}));

import prisma from '../prisma';

const mockFindUnique = prisma.systemSetting.findUnique as jest.Mock;
const mockUpsert = prisma.systemSetting.upsert as jest.Mock;

// ── Helpers ──────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  SystemSettingService.invalidateCache();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('SystemSettingService.getGpsTrackingSource', () => {
  it('returns DRIVER_APP when no DB record exists', async () => {
    mockFindUnique.mockResolvedValue(null);
    const source = await SystemSettingService.getGpsTrackingSource();
    expect(source).toBe('DRIVER_APP');
  });

  it('returns DEDICATED_GPS when DB record has that value', async () => {
    mockFindUnique.mockResolvedValue({ key: 'GPS_TRACKING_SOURCE', value: 'DEDICATED_GPS' });
    const source = await SystemSettingService.getGpsTrackingSource();
    expect(source).toBe('DEDICATED_GPS');
  });

  it('caches the result — DB is not called a second time within TTL', async () => {
    mockFindUnique.mockResolvedValue({ key: 'GPS_TRACKING_SOURCE', value: 'DRIVER_APP' });

    await SystemSettingService.getGpsTrackingSource();
    await SystemSettingService.getGpsTrackingSource();

    // Only one DB call despite two service calls
    expect(mockFindUnique).toHaveBeenCalledTimes(1);
  });

  it('queries DB again after cache is invalidated', async () => {
    mockFindUnique.mockResolvedValue({ key: 'GPS_TRACKING_SOURCE', value: 'DRIVER_APP' });

    await SystemSettingService.getGpsTrackingSource();
    SystemSettingService.invalidateCache();
    await SystemSettingService.getGpsTrackingSource();

    expect(mockFindUnique).toHaveBeenCalledTimes(2);
  });
});

describe('SystemSettingService.setGpsTrackingSource', () => {
  it('upserts the setting in the DB and updates cache', async () => {
    mockUpsert.mockResolvedValue(undefined);

    await SystemSettingService.setGpsTrackingSource('DEDICATED_GPS', 'user-id-123');

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'GPS_TRACKING_SOURCE' },
        update: expect.objectContaining({ value: 'DEDICATED_GPS', updatedBy: 'user-id-123' }),
        create: expect.objectContaining({ key: 'GPS_TRACKING_SOURCE', value: 'DEDICATED_GPS' }),
      }),
    );

    // Cache should now reflect new value without another DB call
    mockFindUnique.mockClear();
    const source = await SystemSettingService.getGpsTrackingSource();
    expect(source).toBe('DEDICATED_GPS');
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('throws when upsert fails', async () => {
    mockUpsert.mockRejectedValue(new Error('DB error'));
    await expect(
      SystemSettingService.setGpsTrackingSource('DRIVER_APP', 'user-id-456'),
    ).rejects.toThrow('DB error');
  });
});
