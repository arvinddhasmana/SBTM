import { AuthService } from './auth.service';
import api from './api.service';
import * as SecureStore from 'expo-secure-store';

jest.mock('./api.service', () => ({
  post: jest.fn(),
  get: jest.fn(),
  create: jest.fn(() => ({
    interceptors: { request: { use: jest.fn() } },
  })),
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should login, store token, and return a Driver object', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: {
        accessToken: 'jwt-token-123',
        user: {
          id: 'user-1',
          email: 'driver@example.com',
          firstName: 'John',
          lastName: 'Doe',
          driverId: 'driver-1',
        },
      },
    });

    (api.get as jest.Mock).mockResolvedValue({
      data: [
        {
          routeId: 'route-1',
          name: 'Route AM',
          direction: 'AM',
          startTime: '07:30',
          schoolId: 'school-1',
          vehicleId: 'bus-1',
        },
      ],
    });

    const driver = await AuthService.login('driver@example.com', 'password');

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'driver@example.com',
      password: 'password',
    });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', 'jwt-token-123');
    expect(driver.id).toBe('driver-1');
    expect(driver.name).toBe('John Doe');
    expect(driver.assignedRoutes).toHaveLength(1);
    expect(driver.assignedRoutes[0].id).toBe('route-1');
  });

  it('should use email as name when firstName/lastName are missing', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: {
        accessToken: 'token',
        user: { id: 'user-1', email: 'driver@example.com' },
      },
    });
    (api.get as jest.Mock).mockResolvedValue({ data: [] });

    const driver = await AuthService.login('driver@example.com', 'pass');

    expect(driver.name).toBe('driver@example.com');
  });

  it('should restore session using /auth/me and /driver/me/schedule', async () => {
    (api.get as jest.Mock)
      .mockResolvedValueOnce({
        data: {
          id: 'user-1',
          email: 'driver@test.com',
          firstName: 'Jane',
          lastName: 'Smith',
          driverId: 'driver-2',
        },
      })
      .mockResolvedValueOnce({
        data: [
          {
            routeId: 'route-pm',
            name: 'Route PM',
            direction: 'PM',
            startTime: '15:00',
            schoolId: 'school-2',
          },
        ],
      });

    const driver = await AuthService.restoreSession();

    expect(api.get).toHaveBeenCalledWith('/auth/me');
    expect(api.get).toHaveBeenCalledWith('/driver/me/schedule');
    expect(driver.name).toBe('Jane Smith');
    expect(driver.assignedRoutes[0].direction).toBe('PM');
  });

  it('should delete token on logout', async () => {
    await AuthService.logout();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
  });

  it('should get token from SecureStore', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('stored-token');

    const token = await AuthService.getToken();

    expect(token).toBe('stored-token');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_token');
  });

  it('should propagate login errors', async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

    await expect(AuthService.login('bad@email.com', 'wrong')).rejects.toThrow(
      'Invalid credentials',
    );
  });
});
