import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useDriverStore } from './src/store/useDriverStore';
import { AuthService } from './src/services/auth.service';
import { setOnUnauthorized } from './src/services/api.service';
import { ConnectivityService } from './src/services/connectivity.service';

import LoginScreen from './src/screens/LoginScreen';
import RouteSelectScreen from './src/screens/RouteSelectScreen';
import ActiveRouteScreen from './src/screens/ActiveRouteScreen';
import RosterScreen from './src/screens/RosterScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const isAuthenticated = useDriverStore((state) => state.isAuthenticated);
  const activeRoute = useDriverStore((state) => state.activeRoute);
  const logout = useDriverStore((state) => state.logout);
  const setOffline = useDriverStore((state) => state.setOffline);
  const [isRestoring, setIsRestoring] = useState(true);

  // Rehydrate persisted token on app launch
  useEffect(() => {
    (async () => {
      try {
        const token = await AuthService.getToken();
        if (token) {
          // Token exists – fetch the driver profile to validate it
          const driver = await AuthService.restoreSession();
          useDriverStore.setState({ driver, isAuthenticated: true });
        }
      } catch {
        // Token invalid or expired – stay on login screen
        await AuthService.logout();
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
    ConnectivityService.startMonitoring(setOffline);
    return () => ConnectivityService.stopMonitoring();
  }, [setOffline]);

  if (isRestoring) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator>
          {!isAuthenticated ? (
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          ) : (
            <>
              <Stack.Screen
                name="RouteSelect"
                component={RouteSelectScreen}
                options={{ title: 'My Routes' }}
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
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
