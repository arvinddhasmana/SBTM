import { CorrelationIdMiddleware, CORRELATION_ID_HEADER } from '@sbtm/common';
import { Request, Response } from 'express';

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();
    mockRes = { setHeader: jest.fn() };
    mockNext = jest.fn();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should propagate an incoming x-request-id header unchanged', () => {
    const incomingId = 'incoming-request-id-abc123';
    const mockReq = {
      headers: { [CORRELATION_ID_HEADER]: incomingId },
    } as unknown as Request;

    middleware.use(mockReq, mockRes as Response, mockNext);

    expect(mockReq.headers[CORRELATION_ID_HEADER]).toBe(incomingId);
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      CORRELATION_ID_HEADER,
      incomingId,
    );
    expect(mockNext).toHaveBeenCalled();
  });

  it('should generate a new UUID when x-request-id header is absent', () => {
    const mockReq = { headers: {} } as unknown as Request;

    middleware.use(mockReq, mockRes as Response, mockNext);

    const assignedId = mockReq.headers[CORRELATION_ID_HEADER] as string;
    expect(assignedId).toBeDefined();
    expect(assignedId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      CORRELATION_ID_HEADER,
      assignedId,
    );
    expect(mockNext).toHaveBeenCalled();
  });

  it('should generate a new UUID when x-request-id is an empty string', () => {
    const mockReq = {
      headers: { [CORRELATION_ID_HEADER]: '' },
    } as unknown as Request;

    middleware.use(mockReq, mockRes as Response, mockNext);

    const assignedId = mockReq.headers[CORRELATION_ID_HEADER] as string;
    expect(assignedId.length).toBeGreaterThan(0);
    expect(assignedId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('should always call next()', () => {
    const mockReq = { headers: {} } as unknown as Request;
    middleware.use(mockReq, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});
