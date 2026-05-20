import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import axios from 'axios';
import { useDriverStore } from './src/store/useDriverStore';
import { AuthService } from './src/services/auth.service';
import { setOnUnauthorized } from './src/services/api.service';
import { ConnectivityService } from './src/services/connectivity.service';
import BackendBanner from './src/components/BackendBanner';
import { initI18n } from './src/i18n/config';

import LoginScreen from './src/screens/LoginScreen';
import RouteSelectScreen from './src/screens/RouteSelectScreen';
import ActiveRouteScreen from './src/screens/ActiveRouteScreen';
import RosterScreen from './src/screens/RosterScreen';
import AlertMessagesScreen from './src/screens/AlertMessagesScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const isAuthenticated = useDriverStore((state) => state.isAuthenticated);
  const activeRoute = useDriverStore((state) => state.activeRoute);
  const logout = useDriverStore((state) => state.logout);
  const setOffline = useDriverStore((state) => state.setOffline);
  const [isRestoring, setIsRestoring] = useState(true);
  const [backendUnreachable, setBackendUnreachable] = useState(false);
  const [i18nReady, setI18nReady] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  // Initialize i18n
  useEffect(() => {
    initI18n()
      .then(() => setI18nReady(true))
      .catch((err) => {
        console.error('[App] i18n init failed, continuing without translations:', err);
        // Unblock app rendering even if i18n initialization fails so the user
        // sees the UI (with key fallbacks) instead of a permanent loading state.
        setI18nReady(true);
      });
  }, []);

  // Rehydrate persisted token on app launch
  useEffect(() => {
    (async () => {
      try {
        const token = await AuthService.getToken();
        if (token) {
          // Token exists – fetch the driver profile to validate it
          const driver = await AuthService.restoreSession();
          useDriverStore.setState({ driver, isAuthenticated: true });
          setBackendUnreachable(false);
        }
      } catch (error) {
        const isNetworkError = axios.isAxiosError(error) && !error.response;
        if (isNetworkError) {
          // Backend is down — keep the token so the user can retry when it comes back.
          // Show a banner so they know why the app can't auto-login.
          setBackendUnreachable(true);
        } else {
          // Auth error (401, invalid token, etc.) — clear stale credentials.
          await AuthService.logout();
          setBackendUnreachable(false);
        }
      } finally {
        setIsRestoring(false);
      }
    })();
  }, []);

  // Register 401 handler to force logout on token expiry
  useEffect(() => {
    setOnUnauthorized(() => {
      logout();
    });
  }, [logout]);

  // Monitor network connectivity and flush offline queues on reconnect
  useEffect(() => {
    ConnectivityService.startMonitoring((isOffline) => {
      setOffline(isOffline);
      // When connectivity returns, clear the backend-unreachable banner —
      // the user's next login attempt will confirm whether the backend is back.
      if (!isOffline) setBackendUnreachable(false);
    });
    return () => ConnectivityService.stopMonitoring();
  }, [setOffline]);

  const screenOptions = {
    headerStyle: { backgroundColor: '#0f172a' },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: '700' as const, fontSize: 16 },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: '#0f172a' },
  };

  if (isRestoring || (!fontsLoaded && Platform.OS !== 'web') || !i18nReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#0f172a',
        }}
      >
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <BackendBanner visible={backendUnreachable} />
      <NavigationContainer>
        <Stack.Navigator screenOptions={screenOptions}>
          {!isAuthenticated ? (
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          ) : (
            <>
              <Stack.Screen
                name="RouteSelect"
                component={RouteSelectScreen}
                options={{ title: 'My Routes', headerShown: false }}
              />
              <Stack.Screen
                name="ActiveRoute"
                component={ActiveRouteScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Roster"
                component={RosterScreen}
                options={{ title: 'Roster', presentation: 'modal' }}
              />
              <Stack.Screen
                name="AlertMessages"
                component={AlertMessagesScreen}
                options={{ title: 'Messages', presentation: 'modal' }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
