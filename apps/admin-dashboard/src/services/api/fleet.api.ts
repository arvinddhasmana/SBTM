import type { Vehicle } from '../../types';
import { apiClient } from './api-client';

export const fleetApi = {
    async getAllVehicles(): Promise<Vehicle[]> {
        const response = await apiClient.get<Vehicle[]>('/api/v1/vehicles');
        return response.data;
    },

    async createVehicle(data: Partial<Vehicle>): Promise<Vehicle> {
        const response = await apiClient.post<Vehicle>('/api/v1/vehicles', data);
        return response.data;
    },

    async updateVehicle(id: string, data: Partial<Vehicle>): Promise<Vehicle> {
        const response = await apiClient.patch<Vehicle>(`/api/v1/vehicles/${id}`, data);
        return response.data;
    },

    async deleteVehicle(id: string): Promise<void> {
        await apiClient.delete(`/api/v1/vehicles/${id}`);
    }
};
