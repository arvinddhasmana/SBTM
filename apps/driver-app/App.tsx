import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useDriverStore } from './src/store/useDriverStore';

import LoginScreen from './src/screens/LoginScreen';
import RouteSelectScreen from './src/screens/RouteSelectScreen';
import ActiveRouteScreen from './src/screens/ActiveRouteScreen';
import RosterScreen from './src/screens/RosterScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const isAuthenticated = useDriverStore((state) => state.isAuthenticated);
  const activeRoute = useDriverStore((state) => state.activeRoute);

  // In a real app we might check for persisted token on mount here

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator>
          {!isAuthenticated ? (
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
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
