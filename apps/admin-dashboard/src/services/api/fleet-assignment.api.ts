import { apiClient } from './api-client';

export interface FleetAssignment {
  id: string;
  schoolId: string;
  routeId: string;
  vehicleId: string;
  driverId?: string;
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED';
  proposedByUserId: string;
  reviewedByUserId?: string;
  reviewNotes?: string;
  reviewedAt?: string;
  effectiveDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProposeFleetAssignmentDto {
  schoolId: string;
  routeId: string;
  vehicleId: string;
  driverId?: string;
  effectiveDate?: string;
  notes?: string;
}

export const fleetAssignmentApi = {
  list: async (): Promise<FleetAssignment[]> => {
    const res = await apiClient.get('/api/v1/fleet-assignments');
    return res.data;
  },
  propose: async (dto: ProposeFleetAssignmentDto): Promise<FleetAssignment> => {
    const res = await apiClient.post('/api/v1/fleet-assignments', dto);
    return res.data;
  },
  accept: async (id: string): Promise<FleetAssignment> => {
    const res = await apiClient.patch(`/api/v1/fleet-assignments/${id}/accept`);
    return res.data;
  },
  reject: async (id: string, notes?: string): Promise<FleetAssignment> => {
    const res = await apiClient.patch(`/api/v1/fleet-assignments/${id}/reject`, { notes });
    return res.data;
  },
};
