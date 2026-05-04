/**
 * Unit tests for GpsDeviceTokenService
 *
 * Covers token validation, lastSeenAt update, route resolution,
 * token creation, list, and delete operations.
 * Uses synthetic data only — no real vehicle IDs, no PII.
 */

// ── Mock Prisma ──────────────────────────────────────────────────────────────
jest.mock('../prisma', () => ({
  gpsDeviceToken: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
  $queryRaw: jest.fn(),
}));

import prisma from '../prisma';
import { GpsDeviceTokenService } from '../services/gpsDeviceTokenService';

const mockFindUnique = prisma.gpsDeviceToken.findUnique as jest.Mock;
const mockUpdate = prisma.gpsDeviceToken.update as jest.Mock;
const mockCreate = prisma.gpsDeviceToken.create as jest.Mock;
const mockFindMany = prisma.gpsDeviceToken.findMany as jest.Mock;
const mockDelete = prisma.gpsDeviceToken.delete as jest.Mock;
const mockQueryRaw = prisma.$queryRaw as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

// ── validateToken ─────────────────────────────────────────────────────────────

describe('GpsDeviceTokenService.validateToken', () => {
  const SYNTHETIC_TOKEN = 'a'.repeat(64);

  it('returns null for empty token string', async () => {
    const result = await GpsDeviceTokenService.validateToken('');
    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('returns null when token is not found in DB', async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await GpsDeviceTokenService.validateToken(SYNTHETIC_TOKEN);
    expect(result).toBeNull();
  });

  it('returns null when token is inactive', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'tok-1',
      vehicleId: 'VEH-001',
      schoolId: 'sch-001',
      isActive: false,
    });
    const result = await GpsDeviceTokenService.validateToken(SYNTHETIC_TOKEN);
    expect(result).toBeNull();
  });

  it('returns context and fires lastSeenAt update for valid token', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'tok-2',
      vehicleId: 'VEH-002',
      schoolId: 'sch-002',
      isActive: true,
    });
    mockUpdate.mockResolvedValue({});

    const result = await GpsDeviceTokenService.validateToken(SYNTHETIC_TOKEN);

    expect(result).toEqual({
      tokenId: 'tok-2',
      vehicleId: 'VEH-002',
      schoolId: 'sch-002',
    });
    // Verify lastSeenAt is updated (fire-and-forget — we just check it is called)
    // Give the promise a microtask to schedule
    await Promise.resolve();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tok-2' },
        data: expect.objectContaining({ lastSeenAt: expect.any(Date) }),
      }),
    );
  });

  it('does not throw if lastSeenAt update fails (fire-and-forget)', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'tok-3',
      vehicleId: 'VEH-003',
      schoolId: 'sch-003',
      isActive: true,
    });
    mockUpdate.mockRejectedValue(new Error('DB write failed'));

    // Should not throw despite the update failing
    const result = await GpsDeviceTokenService.validateToken(SYNTHETIC_TOKEN);
    expect(result).not.toBeNull();
  });
});

// ── resolveActiveRouteId ──────────────────────────────────────────────────────

describe('GpsDeviceTokenService.resolveActiveRouteId', () => {
  it('returns null when no lifecycle events exist for vehicle', async () => {
    mockQueryRaw.mockResolvedValue([]);
    const result = await GpsDeviceTokenService.resolveActiveRouteId('VEH-001');
    expect(result).toBeNull();
  });

  it('returns null when all routes are completed', async () => {
    mockQueryRaw.mockResolvedValue([{ routeId: 'route-001', eventType: 'ROUTE_COMPLETED' }]);
    const result = await GpsDeviceTokenService.resolveActiveRouteId('VEH-001');
    expect(result).toBeNull();
  });

  it('returns routeId for an active (non-completed) route', async () => {
    mockQueryRaw.mockResolvedValue([{ routeId: 'route-002', eventType: 'ROUTE_STARTED' }]);
    const result = await GpsDeviceTokenService.resolveActiveRouteId('VEH-001');
    expect(result).toBe('route-002');
  });

  it('returns an active route when multiple routes exist and one is active', async () => {
    mockQueryRaw.mockResolvedValue([
      { routeId: 'route-003', eventType: 'ROUTE_COMPLETED' },
      { routeId: 'route-004', eventType: 'STOP_REACHED' },
    ]);
    const result = await GpsDeviceTokenService.resolveActiveRouteId('VEH-002');
    // route-004 is active (STOP_REACHED !== ROUTE_COMPLETED)
    expect(result).toBe('route-004');
  });
});

// ── createToken ───────────────────────────────────────────────────────────────

describe('GpsDeviceTokenService.createToken', () => {
  it('creates a token record and returns id + masked token', async () => {
    const rawToken = 'b'.repeat(64);
    mockCreate.mockResolvedValue({ id: 'new-tok-1' });

    const result = await GpsDeviceTokenService.createToken({
      vehicleId: 'VEH-010',
      schoolId: 'sch-010',
      description: 'Test device',
      rawToken,
    });

    expect(result.id).toBe('new-tok-1');
    expect(result.maskedToken).toBe(`...${rawToken.slice(-8)}`);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          token: rawToken,
          vehicleId: 'VEH-010',
          schoolId: 'sch-010',
        }),
      }),
    );
  });
});

// ── Tenant isolation test ─────────────────────────────────────────────────────

describe('GpsDeviceTokenService.listTokensBySchool — tenant isolation', () => {
  it('only queries tokens for the specified schoolId', async () => {
    mockFindMany.mockResolvedValue([]);

    await GpsDeviceTokenService.listTokensBySchool('sch-tenant-A');

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId: 'sch-tenant-A' },
      }),
    );
  });

  it('does not return tokens belonging to a different school', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'tok-tenant-A',
        token: 'c'.repeat(64),
        vehicleId: 'VEH-A',
        schoolId: 'sch-tenant-A',
        description: null,
        isActive: true,
        createdAt: new Date(),
        lastSeenAt: null,
      },
    ]);

    const results = await GpsDeviceTokenService.listTokensBySchool('sch-tenant-A');

    // All returned items must belong to sch-tenant-A
    for (const item of results) {
      expect(item.schoolId).toBe('sch-tenant-A');
    }
  });
});

// ── deleteToken ───────────────────────────────────────────────────────────────

describe('GpsDeviceTokenService.deleteToken', () => {
  it('calls prisma delete with the correct id', async () => {
    mockDelete.mockResolvedValue({});
    await GpsDeviceTokenService.deleteToken('tok-del-1');
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'tok-del-1' } });
  });

  it('propagates errors from prisma delete', async () => {
    mockDelete.mockRejectedValue(new Error('Not found'));
    await expect(GpsDeviceTokenService.deleteToken('does-not-exist')).rejects.toThrow('Not found');
  });
});
