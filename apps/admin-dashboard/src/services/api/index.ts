import { authApi as realAuthApi } from './auth.api';
import { alertsApi as realAlertsApi } from './alerts.api';
import { routesApi as realRoutesApi } from './routes.api';
import { presenceApi as realPresenceApi } from './presence.api';
import { videoApi as realVideoApi } from './video.api';
import { studentManagementApi as realStudentManagementApi } from './student-management.api';
import { fleetApi as realFleetApi } from './fleet.api';
import { complianceApi as realComplianceApi } from './compliance.api';
import { organizationApi as realOrganizationApi } from './organization.api';
import { provisioningApi as realProvisioningApi } from './provisioning.api';
import { absenceApi as realAbsenceApi } from './absence.api';

import {
    mockAuthApi,
    mockAlertsApi,
    mockRoutesApi,
    mockPresenceApi,
    mockVideoApi,
    mockFleetApi,
    mockComplianceApi,
    mockOrganizationApi,
    mockProvisioningApi,
    mockStudentManagementApi,
    mockAbsenceApi,
} from '../mock';

export const useMock =
    import.meta.env.VITE_USE_MOCK === 'true' ||
    localStorage.getItem('VITE_USE_MOCK') === 'true' ||
    window.location.search.includes('mock=true');

if (useMock) {
    if (typeof window !== 'undefined' && !window.hasOwnProperty('__MOCK_LOGGED__')) {
        console.log('--- ADMIN DASHBOARD: MOCK MODE ACTIVE ---');
        (window as any).__MOCK_LOGGED__ = true;
    }
    if (window.location.search.includes('mock=true')) {
        localStorage.setItem('VITE_USE_MOCK', 'true');
    }
}

// Core APIs (always have both real and mock)
export const authApi = useMock ? mockAuthApi : realAuthApi;
export const alertsApi = useMock ? mockAlertsApi : realAlertsApi;
export const routesApi = useMock ? mockRoutesApi : realRoutesApi;
export const presenceApi = useMock ? mockPresenceApi : realPresenceApi;

// Extended APIs (now also have mock support)
export const videoApi = useMock ? mockVideoApi : realVideoApi;
export const studentManagementApi = useMock ? mockStudentManagementApi : realStudentManagementApi;
export const fleetApi = useMock ? mockFleetApi : realFleetApi;
export const complianceApi = useMock ? mockComplianceApi : realComplianceApi;
export const organizationApi = useMock ? mockOrganizationApi : realOrganizationApi;
export const provisioningApi = useMock ? mockProvisioningApi : realProvisioningApi;
export const absenceApi = useMock ? mockAbsenceApi : realAbsenceApi;
