import { authApi as realAuthApi } from './auth.api';
import { alertsApi as realAlertsApi } from './alerts.api';
import { routesApi as realRoutesApi } from './routes.api';
import { presenceApi as realPresenceApi } from './presence.api';
import { mockAlertsApi, mockRoutesApi, mockPresenceApi, mockAuthApi } from './mockApi';

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

export const authApi = useMock ? mockAuthApi : realAuthApi;
export const alertsApi = useMock ? mockAlertsApi : realAlertsApi;
export const routesApi = useMock ? mockRoutesApi : realRoutesApi;
export const presenceApi = useMock ? mockPresenceApi : realPresenceApi;

export { videoApi } from './video.api';
export { studentManagementApi } from './student-management.api';
export { fleetApi } from './fleet.api';
export { complianceApi } from './compliance.api';
export { organizationApi } from './organization.api';
export { provisioningApi } from './provisioning.api';
export { absenceApi } from './absence.api';
