import { CallHandler, RequestTimeoutException } from '@nestjs/common';
import { of, delay, throwError } from 'rxjs';
import { TimeoutInterceptor } from './timeout.interceptor';

describe('TimeoutInterceptor', () => {
  const mockContext = {} as never;

  it('should pass through when handler completes within timeout', (done) => {
    const interceptor = new TimeoutInterceptor(5000);
    const next: CallHandler = { handle: () => of('ok') };

    interceptor.intercept(mockContext, next).subscribe({
      next: (val) => expect(val).toBe('ok'),
      complete: done,
    });
  });

  it('should throw RequestTimeoutException when handler exceeds timeout', (done) => {
    const interceptor = new TimeoutInterceptor(50);
    const next: CallHandler = { handle: () => of('ok').pipe(delay(200)) };

    interceptor.intercept(mockContext, next).subscribe({
      error: (err) => {
        expect(err).toBeInstanceOf(RequestTimeoutException);
        done();
      },
    });
  });

  it('should respect custom timeout value', (done) => {
    const interceptor = new TimeoutInterceptor(10);
    const next: CallHandler = { handle: () => of('ok').pipe(delay(100)) };

    interceptor.intercept(mockContext, next).subscribe({
      error: (err) => {
        expect(err).toBeInstanceOf(RequestTimeoutException);
        done();
      },
    });
  });

  it('should forward non-timeout errors unchanged', (done) => {
    const interceptor = new TimeoutInterceptor(5000);
    const originalError = new Error('some other error');
    const next: CallHandler = { handle: () => throwError(() => originalError) };

    interceptor.intercept(mockContext, next).subscribe({
      error: (err) => {
        expect(err).toBe(originalError);
        done();
      },
    });
  });
});
