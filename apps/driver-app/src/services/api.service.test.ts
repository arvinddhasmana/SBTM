import { setOnUnauthorized } from './api.service';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// We need to test the module's behaviour. The axios instance is created at import
// time, so we mock axios and inspect interceptor registrations.
jest.mock('axios', () => {
  const requestInterceptors: Array<(config: any) => any> = [];
  const responseInterceptors: Array<{ fulfilled: (r: any) => any; rejected: (e: any) => any }> = [];

  const instance = {
    interceptors: {
      request: {
        use: jest.fn((fn: any) => {
          requestInterceptors.push(fn);
        }),
      },
      response: {
        use: jest.fn((fulfilled: any, rejected: any) => {
          responseInterceptors.push({ fulfilled, rejected });
        }),
      },
    },
    get: jest.fn(),
    post: jest.fn(),
    _requestInterceptors: requestInterceptors,
    _responseInterceptors: responseInterceptors,
  };

  return {
    __esModule: true,
    default: {
      create: jest.fn(() => instance),
    },
    _testInstance: instance,
  };
});

describe('api.service', () => {
  let instance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Access the test instance from the mock
    instance = require('axios')._testInstance;
  });

  it('should create an axios instance with baseURL and timeout', () => {
    // Re-import in isolation to capture import-time create() call
    // (beforeEach clears mock call records from the initial import)
    jest.isolateModules(() => {
      const axios = require('axios').default;
      require('./api.service');
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 15000,
        }),
      );
    });
  });

  it('should register request and response interceptors', () => {
    // Check the actual arrays populated at import time
    // (mock call records are cleared by beforeEach, but the arrays persist)
    expect(instance._requestInterceptors.length).toBeGreaterThan(0);
    expect(instance._responseInterceptors.length).toBeGreaterThan(0);
  });

  it('should attach auth token from SecureStore in request interceptor', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-jwt-token');
    const interceptor = instance._requestInterceptors[0];
    const config = { headers: {} as any };
    const result = await interceptor(config);

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_token');
    expect(result.headers.Authorization).toBe('Bearer test-jwt-token');
  });

  it('should not set Authorization when no token is stored', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    const interceptor = instance._requestInterceptors[0];
    const config = { headers: {} as any };
    const result = await interceptor(config);

    expect(result.headers.Authorization).toBeUndefined();
  });

  it('should clear token and call onUnauthorized on 401 response', async () => {
    const handler = jest.fn();
    setOnUnauthorized(handler);

    const responseInterceptor = instance._responseInterceptors[0];
    const error = { response: { status: 401 } };

    await expect(responseInterceptor.rejected(error)).rejects.toEqual(error);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
    expect(handler).toHaveBeenCalled();
  });
});
