import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';

import { AuthService } from './src/services/AuthService';
import { ConnectivityService } from './src/services/ConnectivityService';
import { NotificationService } from './src/services/NotificationService';
import { useParentStore } from './src/store/useParentStore';
import { initI18n } from './src/i18n/config';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import MapScreen from './src/screens/MapScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import AbsenceReportScreen from './src/screens/AbsenceReportScreen';
import SettingsScreen from './src/screens/SettingsScreen';

import { RootStackParamList } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const { isAuthenticated, setUser, setOffline, logout } = useParentStore();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize translations first so screens never render raw keys.
      // Failures are logged but don't block app startup — i18next falls back
      // to keys, which is preferable to a permanent loading screen.
      try {
        await initI18n();
      } catch (i18nError) {
        console.error('[App] i18n init failed, continuing:', i18nError);
      }

      // Set up unauthorized handler
      AuthService.setOnUnauthorized(() => {
        Alert.alert('Session Expired', 'Your session has expired. Please log in again.', [
          { text: 'OK', onPress: () => logout() },
        ]);
      });

      // Restore session
      const user = await AuthService.restoreSession();
      if (user) {
        setUser(user);
      }

      // Initialize connectivity monitoring
      ConnectivityService.startMonitoring((isOffline) => {
        setOffline(isOffline);
        if (isOffline) {
          Alert.alert(
            'Connection Lost',
            'You are currently offline. Some features may be unavailable.',
          );
        }
      });

      // Initialize notifications (will fail gracefully if FCM not configured)
      if (isAuthenticated) {
        await NotificationService.initialize();
      }
    } catch (error) {
      console.error('App initialization error:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  if (isInitializing) {
    // TODO: Replace with splash screen component
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1e293b',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: '600',
            },
          }}
        >
          {!isAuthenticated ? (
            // Unauthenticated Stack
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          ) : (
            // Authenticated Stack
            <>
              <Stack.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen name="Map" component={MapScreen} options={{ headerShown: false }} />
              <Stack.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="AbsenceReport"
                component={AbsenceReportScreen}
                options={{ title: 'Report Absence' }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: 'Settings' }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
