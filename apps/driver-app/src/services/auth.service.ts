import api from './api.service';
import * as SecureStore from 'expo-secure-store';
import { Driver, LoginResponse } from '../types';

export const AuthService = {
    login: async (email: string, password: string): Promise<Driver> => {
        const response = await api.post<LoginResponse>('/auth/login', { email, password });
        await SecureStore.setItemAsync('auth_token', response.data.accessToken);

        const schedule = await api.get<Array<{ routeId: string; name: string; direction: 'AM' | 'PM'; startTime: string; vehicleId?: string; schoolId: string }>>(
            '/driver/me/schedule'
        );

        const user = response.data.user;
        const nameParts = [user.firstName, user.lastName].filter(Boolean);
        const name = nameParts.length ? nameParts.join(' ') : user.email;

        return {
            id: user.driverId || user.id,
            name,
            email: user.email,
            assignedRoutes: schedule.data.map((route) => ({
                id: route.routeId,
                name: route.name,
                schoolId: route.schoolId,
                vehicleId: route.vehicleId ?? '',
                startTime: route.startTime,
                endTime: route.startTime,
                direction: route.direction,
            })),
        };
    },

    logout: async () => {
        await SecureStore.deleteItemAsync('auth_token');
    },

    getToken: async () => {
        return await SecureStore.getItemAsync('auth_token');
    }
};
