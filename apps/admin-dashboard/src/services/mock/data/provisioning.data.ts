import type { ProvisionedUser } from '../../api/provisioning.api';

export const MOCK_PROVISIONED_USERS: ProvisionedUser[] = [
    { id: 'usr-001', email: 'admin@osta.ca', role: 'ADMIN', firstName: 'System', lastName: 'Admin', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
    { id: 'usr-002', email: 'board.admin@ocdsb.ca', role: 'BOARD_ADMIN', firstName: 'Janet', lastName: 'Wilson', boardId: 'BRD-001', isActive: true, createdAt: '2026-01-15T00:00:00Z' },
    { id: 'usr-003', email: 'school.admin@riverside.ca', role: 'SCHOOL_ADMIN', firstName: 'Tom', lastName: 'Baker', schoolId: 'SCH-001', isActive: true, createdAt: '2026-02-01T00:00:00Z' },
    { id: 'usr-004', email: 'driver@osta.ca', role: 'DRIVER', firstName: 'John', lastName: 'Smith', schoolId: 'SCH-001', isActive: true, createdAt: '2026-02-10T00:00:00Z' },
    { id: 'usr-005', email: 'parent@gmail.com', role: 'PARENT', firstName: 'Sarah', lastName: 'Miller', schoolId: 'SCH-001', isActive: false, createdAt: '2026-03-01T00:00:00Z' },
];
