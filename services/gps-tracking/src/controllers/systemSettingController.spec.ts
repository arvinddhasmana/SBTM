/**
 * Unit tests for systemSettingController
 *
 * Tests GET and PUT endpoints for the GPS tracking source setting.
 * Uses synthetic request/response objects — no real DB.
 */
import { Request, Response } from 'express';
import * as systemSettingController from '../controllers/systemSettingController';
import { SystemSettingService } from '../services/systemSettingService';

jest.mock('../services/systemSettingService', () => ({
  SystemSettingService: {
    getGpsTrackingSource: jest.fn(),
    setGpsTrackingSource: jest.fn(),
    invalidateCache: jest.fn(),
  },
}));

const mockGetSource = SystemSettingService.getGpsTrackingSource as jest.Mock;
const mockSetSource = SystemSettingService.setGpsTrackingSource as jest.Mock;

function mockRes() {
  const res: Partial<Response> = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res as Response;
}

function mockReq(body: unknown = {}) {
  return { body } as Request;
}

describe('systemSettingController.getGpsSource', () => {
  it('returns the current GPS source', async () => {
    mockGetSource.mockResolvedValue('DRIVER_APP');
    const res = mockRes();
    await systemSettingController.getGpsSource(mockReq(), res);
    expect(res.json).toHaveBeenCalledWith({ source: 'DRIVER_APP' });
  });

  it('returns 500 on service error', async () => {
    mockGetSource.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    await systemSettingController.getGpsSource(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('systemSettingController.setGpsSource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates source and returns new value', async () => {
    mockSetSource.mockResolvedValue(undefined);
    const res = mockRes();
    const req = mockReq({ source: 'DEDICATED_GPS', updatedBy: 'user-id-abc' });
    await systemSettingController.setGpsSource(req, res);
    expect(mockSetSource).toHaveBeenCalledWith('DEDICATED_GPS', 'user-id-abc');
    expect(res.json).toHaveBeenCalledWith({ source: 'DEDICATED_GPS' });
  });

  it('returns 400 for invalid source value', async () => {
    const res = mockRes();
    const req = mockReq({ source: 'INVALID_SOURCE', updatedBy: 'user-id-abc' });
    await systemSettingController.setGpsSource(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockSetSource).not.toHaveBeenCalled();
  });

  it('returns 400 when updatedBy is missing', async () => {
    const res = mockRes();
    const req = mockReq({ source: 'DRIVER_APP' });
    await systemSettingController.setGpsSource(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 500 on service error', async () => {
    mockSetSource.mockRejectedValue(new Error('DB error'));
    const res = mockRes();
    const req = mockReq({ source: 'DRIVER_APP', updatedBy: 'user-id-xyz' });
    await systemSettingController.setGpsSource(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
