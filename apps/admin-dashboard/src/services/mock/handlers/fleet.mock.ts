import type { Vehicle } from '../../../types';
import { MOCK_VEHICLES } from '../data/fleet.data';

export const mockFleetApi = {
    getAllVehicles: async () => MOCK_VEHICLES,
    createVehicle: async (data: Partial<Vehicle>) => ({ ...MOCK_VEHICLES[0], ...data, id: `VEH-${Math.random().toString(36).substr(2, 6)}` } as Vehicle),
    updateVehicle: async (id: string, data: Partial<Vehicle>) => ({ ...MOCK_VEHICLES[0], ...data, id } as Vehicle),
    deleteVehicle: async (_id: string) => { },
};
