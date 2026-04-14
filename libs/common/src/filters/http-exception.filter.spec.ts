import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({ status: mockStatus }),
      }),
    } as unknown as ArgumentsHost;
  });

  it('should handle HttpException with string response body', () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith({
      error: { code: 'RESOURCE_NOT_FOUND', message: 'Not Found', details: {} },
    });
  });

  it('should handle HttpException with object response body', () => {
    const exception = new HttpException(
      { message: 'Validation failed', error: 'VALIDATION', details: { field: 'email' } },
      HttpStatus.BAD_REQUEST,
    );
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      error: { code: 'VALIDATION', message: 'Validation failed', details: { field: 'email' } },
    });
  });

  it('should handle generic Error (non-HttpException) as 500', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const exception = new Error('Something broke');
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: {} },
    });
    consoleSpy.mockRestore();
  });

  it('should handle unknown exception types as 500 UNKNOWN_ERROR', () => {
    filter.catch('string error', mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      error: { code: 'UNKNOWN_ERROR', message: 'An unexpected error occurred', details: {} },
    });
  });

  it('should map status 401 to UNAUTHORIZED', () => {
    const exception = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    filter.catch(exception, mockHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'UNAUTHORIZED' }) }),
    );
  });

  it('should map status 403 to FORBIDDEN', () => {
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    filter.catch(exception, mockHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'FORBIDDEN' }) }),
    );
  });

  it('should map status 429 to TOO_MANY_REQUESTS', () => {
    const exception = new HttpException('Rate Limited', 429);
    filter.catch(exception, mockHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'TOO_MANY_REQUESTS' }) }),
    );
  });

  it('should map unknown status codes to ERROR', () => {
    const exception = new HttpException('Teapot', 418);
    filter.catch(exception, mockHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'ERROR' }) }),
    );
  });
});
