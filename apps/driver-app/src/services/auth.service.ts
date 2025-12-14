import api from './api.service';
import * as SecureStore from 'expo-secure-store';
import { Driver, LoginResponse } from '../types';

export const AuthService = {
    login: async (email: string, password: string): Promise<Driver> => {
        // Mocking for now as backend might not be ready, but structure allows real call
        // const response = await api.post<LoginResponse>('/auth/login', { email, password });
        // await SecureStore.setItemAsync('auth_token', response.data.token);
        // return response.data.driver;

        // SIMULATED LOGIN
        if (email === 'driver@test.com' && password === 'password') {
            const token = 'mock-jwt-token';
            await SecureStore.setItemAsync('auth_token', token);
            return {
                id: 'driver-123',
                name: 'John Doe',
                email,
                assignedRoutes: [
                    {
                        id: 'route-456',
                        name: 'Route 101 - Morning',
                        schoolId: 'school-1',
                        startTime: '2025-01-10T07:00:00Z',
                        endTime: '2025-01-10T08:30:00Z',
                        direction: 'AM'
                    }
                ]
            };
        }
        throw new Error('Invalid credentials');
    },

    logout: async () => {
        await SecureStore.deleteItemAsync('auth_token');
    },

    getToken: async () => {
        return await SecureStore.getItemAsync('auth_token');
    }
};
