import { ApiService } from './ApiService';
import { AuthService } from './AuthService';
import {
  Child,
  User,
  AuthResponse,
  BusLocationUpdate,
  Alert,
  NotificationPreferences,
  AbsenceReport,
  AbsenceReportResponse,
  Route,
} from '../types';

class ParentApiServiceClass {
  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await ApiService.post<AuthResponse>('/auth/login', {
      email,
      password,
    });

    // Store token and user data
    await AuthService.setToken(response.accessToken);
    await AuthService.setUser(response.user);

    return response;
  }

  /**
   * Get current parent's children
   */
  async getChildren(): Promise<Child[]> {
    return ApiService.get<Child[]>('/parent/children');
  }

  /**
   * Get live location for a specific route
   */
  async getLiveLocation(routeId: string): Promise<BusLocationUpdate | null> {
    try {
      return await ApiService.get<BusLocationUpdate>(
        `/routes/${routeId}/live-location`
      );
    } catch (error: any) {
      // Return null if route is not active (404)
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get route details (stops, polyline)
   */
  async getRouteDetails(routeId: string): Promise<Route> {
    return ApiService.get<Route>(`/routes/${routeId}`);
  }

  /**
   * Get active alerts for parent's routes
   */
  async getActiveAlerts(routeIds: string[]): Promise<Alert[]> {
    if (routeIds.length === 0) {
      return [];
    }

    const queryString = routeIds.map((id) => `routeId=${id}`).join('&');
    return ApiService.get<Alert[]>(`/parent/alerts?${queryString}`);
  }

  /**
   * Get alert history
   */
  async getAlertHistory(): Promise<Alert[]> {
    return ApiService.get<Alert[]>('/parent/alerts/history');
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(): Promise<NotificationPreferences> {
    return ApiService.get<NotificationPreferences>('/parent/notification-preferences');
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    preferences: NotificationPreferences
  ): Promise<NotificationPreferences> {
    return ApiService.put<NotificationPreferences>(
      '/parent/notification-preferences',
      preferences
    );
  }

  /**
   * Report student absence
   */
  async reportAbsence(report: AbsenceReport): Promise<AbsenceReportResponse> {
    return ApiService.post<AbsenceReportResponse>('/parent/absence-reports', report);
  }

  /**
   * Register device token for push notifications (FCM)
   * Placeholder implementation until FCM is fully configured
   */
  async registerDeviceToken(token: string, platform: 'ios' | 'android'): Promise<void> {
    try {
      await ApiService.post('/parent/device-tokens', {
        token,
        platform,
      });
      console.log('Device token registered successfully');
    } catch (error) {
      console.warn('Device token registration failed (FCM not configured):', error);
      // Don't throw - this is expected until FCM is set up
    }
  }

  /**
   * Unregister device token
   */
  async unregisterDeviceToken(token: string): Promise<void> {
    try {
      await ApiService.delete(`/parent/device-tokens/${token}`);
    } catch (error) {
      console.warn('Device token unregistration failed:', error);
    }
  }
}

export const ParentApiService = new ParentApiServiceClass();
