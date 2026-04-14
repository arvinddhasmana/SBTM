import { Request, Response } from 'express';
import { CorrelationIdMiddleware, CORRELATION_ID_HEADER } from './correlation-id.middleware';

jest.mock('@opentelemetry/api', () => ({
  context: {
    active: jest.fn().mockReturnValue({}),
    with: jest.fn((_ctx: unknown, next: () => void) => next()),
  },
  propagation: {
    getBaggage: jest.fn().mockReturnValue({
      setEntry: jest.fn().mockReturnValue({}),
    }),
    createBaggage: jest.fn().mockReturnValue({}),
    setBaggage: jest.fn().mockReturnValue({}),
  },
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('generated-uuid-1234'),
}));

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();
    mockReq = { headers: {} };
    mockRes = { setHeader: jest.fn() };
    mockNext = jest.fn();
  });

  it('should generate UUID when no x-request-id header present', () => {
    middleware.use(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.headers![CORRELATION_ID_HEADER]).toBe('generated-uuid-1234');
    expect(mockRes.setHeader).toHaveBeenCalledWith(CORRELATION_ID_HEADER, 'generated-uuid-1234');
  });

  it('should use existing x-request-id when present', () => {
    mockReq.headers = { [CORRELATION_ID_HEADER]: 'existing-id' };

    middleware.use(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.headers[CORRELATION_ID_HEADER]).toBe('existing-id');
    expect(mockRes.setHeader).toHaveBeenCalledWith(CORRELATION_ID_HEADER, 'existing-id');
  });

  it('should call next() to continue middleware chain', () => {
    middleware.use(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should generate new ID when header is empty string', () => {
    mockReq.headers = { [CORRELATION_ID_HEADER]: '' };

    middleware.use(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.headers[CORRELATION_ID_HEADER]).toBe('generated-uuid-1234');
  });

  it('should set header on both request and response', () => {
    middleware.use(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.headers![CORRELATION_ID_HEADER]).toBeDefined();
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      CORRELATION_ID_HEADER,
      mockReq.headers![CORRELATION_ID_HEADER],
    );
  });
});
