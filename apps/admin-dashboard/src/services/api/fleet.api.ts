import axios from 'axios';
import type { Vehicle } from '../../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const mockVehicles: Vehicle[] = [
    { id: 'v1', licensePlate: 'BUS-101', schoolId: 's1', status: 'ACTIVE' },
    { id: 'v2', licensePlate: 'BUS-102', schoolId: 's1', status: 'MAINTENANCE' },
];

export const fleetApi = {
    async getAllVehicles(): Promise<Vehicle[]> {
        try {
            const response = await axios.get<Vehicle[]>(`${API_BASE_URL}/api/v1/vehicles`);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && !error.response) {
                return mockVehicles;
            }
            throw error;
        }
    },

    async createVehicle(data: Partial<Vehicle>): Promise<Vehicle> {
        const response = await axios.post<Vehicle>(`${API_BASE_URL}/api/v1/vehicles`, data);
        return response.data;
    },

    async updateVehicle(id: string, data: Partial<Vehicle>): Promise<Vehicle> {
        const response = await axios.patch<Vehicle>(`${API_BASE_URL}/api/v1/vehicles/${id}`, data);
        return response.data;
    },

    async deleteVehicle(id: string): Promise<void> {
        await axios.delete(`${API_BASE_URL}/api/v1/vehicles/${id}`);
    }
};
