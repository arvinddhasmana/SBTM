import type { Vehicle } from '../../../types';

export const MOCK_VEHICLES: Vehicle[] = [
    { id: 'VEH-001', schoolId: 'SCH-001', licensePlate: 'ON-BUS-101', status: 'ACTIVE' },
    { id: 'VEH-002', schoolId: 'SCH-001', licensePlate: 'ON-BUS-205', status: 'ACTIVE' },
    { id: 'VEH-003', schoolId: 'SCH-002', licensePlate: 'ON-BUS-303', status: 'MAINTENANCE' },
    { id: 'VEH-004', schoolId: 'SCH-002', licensePlate: 'ON-BUS-404', status: 'INACTIVE' },
];
