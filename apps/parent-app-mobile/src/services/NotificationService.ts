import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { ParentApiService } from './ParentApiService';

// Configure notification behavior (Android channels, iOS settings)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationServiceClass {
  private deviceToken: string | null = null;

  /**
   * Initialize notification service
   * Request permissions and register device token
   *
   * NOTE: FCM Configuration Placeholder
   * This implementation uses Expo's notification service.
   * Full FCM integration requires:
   * 1. Firebase project setup
   * 2. google-services.json (Android) and GoogleService-Info.plist (iOS)
   * 3. Backend FCM server key configuration
   */
  async initialize(): Promise<boolean> {
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        return false;
      }

      // Get push token (Expo push token for now, FCM token when configured)
      const tokenData = await this.getExpoPushToken();
      if (tokenData) {
        this.deviceToken = tokenData;

        // Register with backend (will fail gracefully if FCM not configured)
        await ParentApiService.registerDeviceToken(
          tokenData,
          Platform.OS as 'ios' | 'android'
        );

        console.log('Notification service initialized successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      return false;
    }
  }

  /**
   * Get Expo Push Token
   * TODO: Replace with FCM token when Firebase is configured
   */
  private async getExpoPushToken(): Promise<string | null> {
    try {
      if (!Constants.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Add notification received listener (foreground)
   */
  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  /**
   * Add notification response listener (user taps notification)
   */
  addNotificationResponseReceivedListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  /**
   * Unregister device token on logout
   */
  async unregister(): Promise<void> {
    if (this.deviceToken) {
      await ParentApiService.unregisterDeviceToken(this.deviceToken);
      this.deviceToken = null;
    }
  }

  /**
   * Get current device token
   */
  getDeviceToken(): string | null {
    return this.deviceToken;
  }

  /**
   * Schedule a local notification (for testing)
   */
  async scheduleLocalNotification(title: string, body: string, data?: any): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // Immediately
    });
  }
}

export const NotificationService = new NotificationServiceClass();
