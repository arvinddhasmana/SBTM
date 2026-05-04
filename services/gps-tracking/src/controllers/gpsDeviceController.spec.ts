/**
 * Unit tests for gpsDeviceController.ingestDeviceLocation
 *
 * Tests GPS source enforcement, device token validation, route resolution,
 * and location ingestion delegation.
 * Uses synthetic data — no real tokens or vehicle IDs.
 */
import { Request, Response } from 'express';
import * as gpsDeviceController from '../controllers/gpsDeviceController';
import { SystemSettingService } from '../services/systemSettingService';
import { GpsDeviceTokenService } from '../services/gpsDeviceTokenService';

jest.mock('../services/systemSettingService', () => ({
  SystemSettingService: {
    getGpsTrackingSource: jest.fn(),
    setGpsTrackingSource: jest.fn(),
    invalidateCache: jest.fn(),
  },
}));

jest.mock('../services/gpsDeviceTokenService', () => ({
  GpsDeviceTokenService: {
    validateToken: jest.fn(),
    resolveActiveRouteId: jest.fn(),
    createToken: jest.fn(),
    listTokensBySchool: jest.fn(),
    deleteToken: jest.fn(),
  },
}));

jest.mock('../services/locationService', () => ({
  LocationService: jest.fn().mockImplementation(() => ({
    ingestLocation: jest.fn().mockResolvedValue({}),
  })),
}));

const mockGetSource = SystemSettingService.getGpsTrackingSource as jest.Mock;
const mockValidateToken = GpsDeviceTokenService.validateToken as jest.Mock;
const mockResolveRoute = GpsDeviceTokenService.resolveActiveRouteId as jest.Mock;

const SYNTHETIC_TOKEN = 'a'.repeat(64);
const VALID_PAYLOAD = {
  timestamp: '2026-05-04T14:00:00.000Z',
  lat: 43.651,
  lng: -79.347,
  speedKph: 40,
};

function mockRes() {
  const res: Partial<Response> = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as Response;
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: { authorization: `Bearer ${SYNTHETIC_TOKEN}` },
    body: VALID_PAYLOAD,
    ...overrides,
  } as unknown as Request;
}

describe('gpsDeviceController.ingestDeviceLocation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 422 when GPS source is DRIVER_APP', async () => {
    mockGetSource.mockResolvedValue('DRIVER_APP');
    const res = mockRes();
    await gpsDeviceController.ingestDeviceLocation(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('returns 401 when Authorization header is missing', async () => {
    mockGetSource.mockResolvedValue('DEDICATED_GPS');
    const res = mockRes();
    const req = makeReq({ headers: {} });
    await gpsDeviceController.ingestDeviceLocation(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockValidateToken).not.toHaveBeenCalled();
  });

  it('returns 401 when device token is invalid', async () => {
    mockGetSource.mockResolvedValue('DEDICATED_GPS');
    mockValidateToken.mockResolvedValue(null);
    const res = mockRes();
    await gpsDeviceController.ingestDeviceLocation(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockResolveRoute).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid payload (lat out of range)', async () => {
    mockGetSource.mockResolvedValue('DEDICATED_GPS');
    mockValidateToken.mockResolvedValue({
      tokenId: 'tok-1',
      vehicleId: 'VEH-001',
      schoolId: 'sch-001',
    });
    const res = mockRes();
    const req = makeReq({ body: { ...VALID_PAYLOAD, lat: 999 } });
    await gpsDeviceController.ingestDeviceLocation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 422 when no active route is found', async () => {
    mockGetSource.mockResolvedValue('DEDICATED_GPS');
    mockValidateToken.mockResolvedValue({
      tokenId: 'tok-2',
      vehicleId: 'VEH-002',
      schoolId: 'sch-002',
    });
    mockResolveRoute.mockResolvedValue(null);
    const res = mockRes();
    await gpsDeviceController.ingestDeviceLocation(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(422);
    const responseArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(responseArg.error).toContain('No active route');
  });

  it('ingests location and returns 200 on happy path', async () => {
    mockGetSource.mockResolvedValue('DEDICATED_GPS');
    mockValidateToken.mockResolvedValue({
      tokenId: 'tok-3',
      vehicleId: 'VEH-003',
      schoolId: 'sch-003',
    });
    mockResolveRoute.mockResolvedValue('route-abc');
    const res = mockRes();
    await gpsDeviceController.ingestDeviceLocation(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'ok' });
  });
});
