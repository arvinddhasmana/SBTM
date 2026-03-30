import { MOCK_INSPECTIONS, MOCK_COMPLIANCE_RECORDS, MOCK_AUDIT_LOGS } from '../data/compliance.data';

export const mockComplianceApi = {
    getAllInspections: async (_schoolId?: string) => MOCK_INSPECTIONS,
    getDriverCompliance: async (driverId: string) => MOCK_COMPLIANCE_RECORDS.find(c => c.driverId === driverId) || MOCK_COMPLIANCE_RECORDS[0],
    getAllCompliance: async (_schoolId?: string) => MOCK_COMPLIANCE_RECORDS,
    getAuditLogs: async (_schoolId?: string) => MOCK_AUDIT_LOGS,
};
