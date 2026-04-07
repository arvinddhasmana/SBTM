import type { FleetAssignment } from '../../api/fleet-assignment.api';

const MOCK_FLEET_ASSIGNMENTS: FleetAssignment[] = [
  {
    id: 'fa-001',
    schoolId: 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c',
    routeId: 'ROUTE-SingleBus-AM',
    vehicleId: 'BUS-01',
    status: 'ACCEPTED',
    proposedByUserId: 'osta-admin-001',
    reviewedByUserId: 'school-admin-001',
    effectiveDate: '2026-04-01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fa-002',
    schoolId: 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c',
    routeId: 'ROUTE-SingleBus-PM',
    vehicleId: 'BUS-01',
    status: 'PROPOSED',
    proposedByUserId: 'osta-admin-001',
    effectiveDate: '2026-04-15',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const mockFleetAssignmentApi = {
  list: async (): Promise<FleetAssignment[]> => MOCK_FLEET_ASSIGNMENTS,
  propose: async (): Promise<FleetAssignment> => MOCK_FLEET_ASSIGNMENTS[0],
  accept: async (): Promise<FleetAssignment> => ({
    ...MOCK_FLEET_ASSIGNMENTS[1],
    status: 'ACCEPTED',
  }),
  reject: async (): Promise<FleetAssignment> => ({
    ...MOCK_FLEET_ASSIGNMENTS[1],
    status: 'REJECTED',
  }),
};
