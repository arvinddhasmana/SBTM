export interface MockInspection {
    id: string;
    vehicleId: string;
    schoolId: string;
    inspectionDate: string;
    status: 'PASS' | 'FAIL' | 'PENDING';
    notes?: string;
}

export interface MockComplianceRecord {
    driverId: string;
    driverName: string;
    licenseExpiry: string;
    backgroundCheck: 'CLEAR' | 'PENDING' | 'EXPIRED';
    firstAidCert: boolean;
}

export interface MockAuditLog {
    id: string;
    action: string;
    userId: string;
    timestamp: string;
    details: string;
}

export const MOCK_INSPECTIONS: MockInspection[] = [
    { id: 'INS-001', vehicleId: 'VEH-001', schoolId: 'SCH-001', inspectionDate: '2026-03-15', status: 'PASS', notes: 'All systems nominal.' },
    { id: 'INS-002', vehicleId: 'VEH-003', schoolId: 'SCH-002', inspectionDate: '2026-03-10', status: 'FAIL', notes: 'Brake pads below threshold.' },
    { id: 'INS-003', vehicleId: 'VEH-002', schoolId: 'SCH-001', inspectionDate: '2026-03-20', status: 'PENDING' },
];

export const MOCK_COMPLIANCE_RECORDS: MockComplianceRecord[] = [
    { driverId: 'DRV-001', driverName: 'John Smith', licenseExpiry: '2027-06-01', backgroundCheck: 'CLEAR', firstAidCert: true },
    { driverId: 'DRV-002', driverName: 'Maria Garcia', licenseExpiry: '2026-12-15', backgroundCheck: 'CLEAR', firstAidCert: true },
    { driverId: 'DRV-003', driverName: 'David Lee', licenseExpiry: '2026-05-01', backgroundCheck: 'PENDING', firstAidCert: false },
];

export const MOCK_AUDIT_LOGS: MockAuditLog[] = [
    { id: 'AUD-001', action: 'ROUTE_CREATED', userId: 'usr-001', timestamp: new Date().toISOString(), details: 'Created route ROUTE-R01' },
    { id: 'AUD-002', action: 'ALERT_RESOLVED', userId: 'usr-001', timestamp: new Date(Date.now() - 3600000).toISOString(), details: 'Resolved alert alert-1' },
    { id: 'AUD-003', action: 'USER_LOGIN', userId: 'usr-001', timestamp: new Date(Date.now() - 7200000).toISOString(), details: 'Admin login from 192.168.1.1' },
];
