import axios from 'axios';
import type { Child } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('parent_auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export interface AuthLoginResponse {
    accessToken: string;
    user: {
        id: string;
        email: string;
        role: string;
        firstName?: string;
        lastName?: string;
    };
}

export interface LiveLocationResponse {
    routeId: string;
    vehicleId: string;
    lastUpdate: string;
    position: { lat: number; lng: number };
    etaToNextStopMinutes?: number;
    deviationFlag?: boolean;
    status?: string;
}

export interface ActiveAlert {
    id: string;
    routeId: string;
    vehicleId: string;
    eventType: string;
    message: string;
    createdAt: string;
}

export interface NotificationRecord {
    id: string;
    alertId: string;
    recipientUserId: string;
    channel: string;
    status: 'SENT' | 'FAILED';
    timestamp: string;
}

export const parentApi = {
    async login(email: string, password: string): Promise<AuthLoginResponse> {
        const response = await apiClient.post<AuthLoginResponse>('/api/v1/auth/login', {
            email,
            password,
        });
        return response.data;
    },

    async getChildren(): Promise<Child[]> {
        const response = await apiClient.get<Child[]>('/api/v1/parent/children');
        return response.data;
    },

    async getLiveLocation(routeId: string): Promise<LiveLocationResponse> {
        const response = await apiClient.get<LiveLocationResponse>(`/api/v1/routes/${routeId}/live-location`);
        return response.data;
    },

    async getActiveAlert(routeId: string): Promise<ActiveAlert | null> {
        const response = await apiClient.get<{ alertActive: boolean; message: string } & Partial<ActiveAlert>>(
            `/api/v1/alerts/parent-view/${routeId}`
        );
        if (!response.data.alertActive) return null;
        return response.data as ActiveAlert;
    },

    async getNotifications(): Promise<NotificationRecord[]> {
        const response = await apiClient.get<NotificationRecord[]>('/api/v1/parent/notifications');
        return response.data;
    },
};
