import api from './api.service';
import * as SecureStore from 'expo-secure-store';
import { Driver, LoginResponse } from '../types';

function mapScheduleToDriver(
  user: LoginResponse['user'],
  schedule: Array<{
    routeId: string;
    name: string;
    direction: 'AM' | 'PM';
    startTime: string;
    vehicleId?: string;
    schoolId: string;
    polyline?: string;
    schoolLat?: number;
    schoolLng?: number;
    schoolName?: string;
  }>,
): Driver {
  const nameParts = [user.firstName, user.lastName].filter(Boolean);
  const name = nameParts.length ? nameParts.join(' ') : user.email;

  return {
    id: user.driverId || user.id,
    name,
    email: user.email,
    assignedRoutes: schedule.map((route) => ({
      id: route.routeId,
      name: route.name,
      schoolId: route.schoolId,
      vehicleId: route.vehicleId ?? '',
      startTime: route.startTime,
      endTime: route.startTime,
      direction: route.direction,
      polyline: route.polyline,
      schoolLat: route.schoolLat,
      schoolLng: route.schoolLng,
      schoolName: route.schoolName,
    })),
  };
}

export const AuthService = {
  login: async (email: string, password: string): Promise<Driver> => {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    await SecureStore.setItemAsync('auth_token', response.data.accessToken);

    const schedule = await api.get<
      Array<{
        routeId: string;
        name: string;
        direction: 'AM' | 'PM';
        startTime: string;
        vehicleId?: string;
        schoolId: string;
        polyline?: string;
        schoolLat?: number;
        schoolLng?: number;
        schoolName?: string;
      }>
    >('/driver/me/schedule');

    return mapScheduleToDriver(response.data.user, schedule.data);
  },

  /** Restore a session from a persisted token – validates by fetching schedule. */
  restoreSession: async (): Promise<Driver> => {
    // Use the /auth/me endpoint to get user info, then fetch schedule
    const meResponse = await api.get<LoginResponse['user']>('/auth/me');
    const schedule = await api.get<
      Array<{
        routeId: string;
        name: string;
        direction: 'AM' | 'PM';
        startTime: string;
        vehicleId?: string;
        schoolId: string;
        polyline?: string;
        schoolLat?: number;
        schoolLng?: number;
        schoolName?: string;
      }>
    >('/driver/me/schedule');

    return mapScheduleToDriver(meResponse.data, schedule.data);
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
  },

  getToken: async () => {
    return await SecureStore.getItemAsync('auth_token');
  },
};
