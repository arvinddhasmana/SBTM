import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();
const mockUse = vi.fn();

vi.mock('axios', () => ({
  default: {
    create: (...args: any[]) => {
      mockCreate(...args);
      return {
        interceptors: {
          request: { use: vi.fn() },
          response: {
            use: mockUse,
          },
        },
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
      };
    },
  },
}));

describe('api-client', () => {
  const originalLocation = window.location;
  let removeItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, pathname: '/dashboard', href: '' },
    });
  });

  it('should create axios instance with base URL and credentials', async () => {
    await import('./api-client');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        withCredentials: true,
      }),
    );
  });

  it('should register a response interceptor', async () => {
    await import('./api-client');

    expect(mockUse).toHaveBeenCalledWith(expect.any(Function), expect.any(Function));
  });

  describe('401 interceptor', () => {
    let errorHandler: (error: any) => Promise<never>;

    beforeEach(async () => {
      await import('./api-client');
      errorHandler = mockUse.mock.calls[0][1];
    });

    it('should remove auth_user from localStorage on 401', async () => {
      const error = { response: { status: 401 } };

      await expect(errorHandler(error)).rejects.toEqual(error);
      expect(removeItemSpy).toHaveBeenCalledWith('auth_user');
    });

    it('should redirect to /login on 401 when not already on login page', async () => {
      window.location.pathname = '/dashboard';
      const error = { response: { status: 401 } };

      await expect(errorHandler(error)).rejects.toEqual(error);
      expect(window.location.href).toBe('/login');
    });

    it('should not redirect when already on /login', async () => {
      window.location.pathname = '/login';
      window.location.href = '/login';
      const error = { response: { status: 401 } };

      await expect(errorHandler(error)).rejects.toEqual(error);
      expect(window.location.href).toBe('/login');
    });

    it('should not remove auth_user for non-401 errors', async () => {
      const error = { response: { status: 500 } };

      await expect(errorHandler(error)).rejects.toEqual(error);
      expect(removeItemSpy).not.toHaveBeenCalled();
    });

    it('should reject the error for non-401 responses', async () => {
      const error = { response: { status: 403 } };

      await expect(errorHandler(error)).rejects.toEqual(error);
    });
  });

  describe('success interceptor', () => {
    it('should pass through successful responses', async () => {
      await import('./api-client');
      const successHandler = mockUse.mock.calls[0][0];
      const mockResponse = { data: 'test', status: 200 };

      const result = successHandler(mockResponse);

      expect(result).toEqual(mockResponse);
    });
  });
});
