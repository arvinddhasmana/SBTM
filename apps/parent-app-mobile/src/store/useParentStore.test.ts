import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useParentStore } from './useParentStore';
import { ParentApiService } from '../services/ParentApiService';
import { AuthService } from '../services/AuthService';

jest.mock('../services/ParentApiService');
jest.mock('../services/AuthService');

describe('useParentStore', () => {
  const mockParentApiService = ParentApiService as jest.Mocked<typeof ParentApiService>;
  const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useParentStore.setState({
      user: null,
      isAuthenticated: false,
      children: [],
      activeAlerts: [],
      isLoadingChildren: false,
      isLoadingAlerts: false,
      isOffline: false,
    });
  });

  describe('login', () => {
    it('should login successfully and fetch children', async () => {
      const mockUser = {
        id: '1',
        email: 'parent@test.com',
        firstName: 'Test',
        lastName: 'Parent',
      };
      const mockChildren = [
        { id: 'child-1', firstName: 'John', lastName: 'Doe', status: 'at_home' as const },
      ];

      mockParentApiService.login.mockResolvedValue({
        user: mockUser,
        token: 'test-token',
      });
      mockAuthService.setToken.mockResolvedValue(undefined);
      mockAuthService.setUser.mockResolvedValue(undefined);
      mockParentApiService.getChildren.mockResolvedValue(mockChildren);

      const { result } = renderHook(() => useParentStore());

      await act(async () => {
        await result.current.login('parent@test.com', 'password123');
      });

      expect(mockParentApiService.login).toHaveBeenCalledWith('parent@test.com', 'password123');
      expect(mockAuthService.setToken).toHaveBeenCalledWith('test-token');
      expect(mockAuthService.setUser).toHaveBeenCalledWith(mockUser);
      expect(mockParentApiService.getChildren).toHaveBeenCalled();
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.children).toEqual(mockChildren);
    });

    it('should handle login failure', async () => {
      const error = new Error('Invalid credentials');
      mockParentApiService.login.mockRejectedValue(error);

      const { result } = renderHook(() => useParentStore());

      await expect(
        act(async () => {
          await result.current.login('parent@test.com', 'wrong-password');
        })
      ).rejects.toThrow('Invalid credentials');

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe('logout', () => {
    it('should clear auth data and reset state', async () => {
      // Setup authenticated state
      useParentStore.setState({
        user: { id: '1', email: 'test@test.com', firstName: 'Test', lastName: 'User' },
        isAuthenticated: true,
        children: [{ id: 'child-1', firstName: 'John', lastName: 'Doe', status: 'at_home' as const }],
      });

      mockAuthService.clearAuth.mockResolvedValue(undefined);

      const { result } = renderHook(() => useParentStore());

      await act(async () => {
        await result.current.logout();
      });

      expect(mockAuthService.clearAuth).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.children).toEqual([]);
      expect(result.current.activeAlerts).toEqual([]);
    });
  });

  describe('refreshChildren', () => {
    it('should fetch and update children list', async () => {
      const mockChildren = [
        { id: 'child-1', firstName: 'John', lastName: 'Doe', status: 'on_bus' as const },
        { id: 'child-2', firstName: 'Jane', lastName: 'Doe', status: 'at_school' as const },
      ];

      mockParentApiService.getChildren.mockResolvedValue(mockChildren);

      const { result } = renderHook(() => useParentStore());

      await act(async () => {
        await result.current.refreshChildren();
      });

      expect(mockParentApiService.getChildren).toHaveBeenCalled();
      expect(result.current.children).toEqual(mockChildren);
      expect(result.current.isLoadingChildren).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      mockParentApiService.getChildren.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      );

      const { result } = renderHook(() => useParentStore());

      act(() => {
        result.current.refreshChildren();
      });

      expect(result.current.isLoadingChildren).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoadingChildren).toBe(false);
      });
    });

    it('should handle fetch error', async () => {
      const error = new Error('Failed to fetch children');
      mockParentApiService.getChildren.mockRejectedValue(error);

      const { result } = renderHook(() => useParentStore());

      await expect(
        act(async () => {
          await result.current.refreshChildren();
        })
      ).rejects.toThrow('Failed to fetch children');

      expect(result.current.isLoadingChildren).toBe(false);
    });
  });

  describe('refreshAlerts', () => {
    it('should fetch active alerts for all child routes', async () => {
      const mockChildren = [
        {
          id: 'child-1',
          firstName: 'John',
          lastName: 'Doe',
          status: 'on_bus' as const,
          amRouteId: 'route-am-1',
          pmRouteId: 'route-pm-1',
        },
        {
          id: 'child-2',
          firstName: 'Jane',
          lastName: 'Doe',
          status: 'at_school' as const,
          amRouteId: 'route-am-2',
          pmRouteId: null,
        },
      ];
      const mockAlerts = [
        {
          id: 'alert-1',
          routeId: 'route-am-1',
          eventType: 'LATE_ARRIVAL' as const,
          description: 'Bus is running late',
          status: 'ACTIVE' as const,
        },
      ];

      useParentStore.setState({ children: mockChildren });
      mockParentApiService.getActiveAlerts.mockResolvedValue(mockAlerts);

      const { result } = renderHook(() => useParentStore());

      await act(async () => {
        await result.current.refreshAlerts();
      });

      expect(mockParentApiService.getActiveAlerts).toHaveBeenCalledWith([
        'route-am-1',
        'route-pm-1',
        'route-am-2',
      ]);
      expect(result.current.activeAlerts).toEqual(mockAlerts);
    });

    it('should not fetch alerts when no children', async () => {
      useParentStore.setState({ children: [] });

      const { result } = renderHook(() => useParentStore());

      await act(async () => {
        await result.current.refreshAlerts();
      });

      expect(mockParentApiService.getActiveAlerts).toHaveBeenCalledWith([]);
      expect(result.current.activeAlerts).toEqual([]);
    });
  });

  describe('setUser', () => {
    it('should update user and authentication state', () => {
      const user = {
        id: '1',
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
      };

      const { result } = renderHook(() => useParentStore());

      act(() => {
        result.current.setUser(user);
      });

      expect(result.current.user).toEqual(user);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('setOffline', () => {
    it('should update offline status', () => {
      const { result } = renderHook(() => useParentStore());

      expect(result.current.isOffline).toBe(false);

      act(() => {
        result.current.setOffline(true);
      });

      expect(result.current.isOffline).toBe(true);

      act(() => {
        result.current.setOffline(false);
      });

      expect(result.current.isOffline).toBe(false);
    });
  });

  describe('initial state', () => {
    it('should have correct default values', () => {
      const { result } = renderHook(() => useParentStore());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.children).toEqual([]);
      expect(result.current.activeAlerts).toEqual([]);
      expect(result.current.isLoadingChildren).toBe(false);
      expect(result.current.isLoadingAlerts).toBe(false);
      expect(result.current.isOffline).toBe(false);
    });
  });
});
