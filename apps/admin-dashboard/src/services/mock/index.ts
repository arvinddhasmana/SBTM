/**
 * Mock Service Registry
 *
 * Central barrel for all mock API implementations.
 * This module is only imported when VITE_USE_MOCK=true.
 * Keeping mock data and logic fully separated from production API code.
 */

export { mockAuthApi } from './handlers/auth.mock';
export { mockAlertsApi } from './handlers/alerts.mock';
export { mockRoutesApi } from './handlers/routes.mock';
export { mockPresenceApi } from './handlers/presence.mock';
export { mockVideoApi } from './handlers/video.mock';
export { mockFleetApi } from './handlers/fleet.mock';
export { mockComplianceApi } from './handlers/compliance.mock';
export { mockOrganizationApi } from './handlers/organization.mock';
export { mockProvisioningApi } from './handlers/provisioning.mock';
export { mockStudentManagementApi } from './handlers/student-management.mock';
export { mockAbsenceApi } from './handlers/absence.mock';
