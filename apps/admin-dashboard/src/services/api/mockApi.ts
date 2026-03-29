import { Alert, LiveLocation, StudentPresence, Route } from '../../types';

const MOCK_LOCATIONS: LiveLocation[] = [
    {
        routeId: 'ROUTE-R01',
        vehicleId: 'BUS-101',
        lastUpdate: new Date().toISOString(),
        position: { lat: 45.4215, lng: -75.6972 },
        etaToNextStopMinutes: 5,
        deviationFlag: false,
        status: 'normal',
    },
    {
        routeId: 'ROUTE-R12',
        vehicleId: 'BUS-205',
        lastUpdate: new Date().toISOString(),
        position: { lat: 45.4115, lng: -75.7072 },
        etaToNextStopMinutes: 2,
        deviationFlag: true,
        status: 'emergency',
    },
    {
        routeId: 'ROUTE-R03',
        vehicleId: 'BUS-303',
        lastUpdate: new Date().toISOString(),
        position: { lat: 45.4315, lng: -75.6872 },
        etaToNextStopMinutes: 12,
        deviationFlag: false,
        status: 'delay',
    },
];

const MOCK_ALERTS: Alert[] = [
    {
        id: 'alert-1',
        schoolId: 'SCH-001',
        routeId: 'ROUTE-R12',
        vehicleId: 'BUS-205',
        driverId: 'DRV-001',
        timestamp: new Date().toISOString(),
        lat: 45.4115,
        lng: -75.7072,
        eventType: 'PANIC_BUTTON',
        status: 'ACTIVE',
        description: 'Silent panic alarm triggered by operator.',
    },
    {
        id: 'alert-2',
        schoolId: 'SCH-002',
        routeId: 'ROUTE-R03',
        vehicleId: 'BUS-303',
        driverId: 'DRV-003',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        lat: 45.4315,
        lng: -75.6872,
        eventType: 'INCIDENT',
        status: 'ACTIVE',
        description: 'Engine overheating reported. Vehicle stationary.',
    },
];

const MOCK_STUDENTS: StudentPresence[] = [
    { studentId: 'STU-001', name: 'James Wilson', status: 'BOARDED', lastSeen: new Date().toISOString(), routeId: 'ROUTE-R01' },
    { studentId: 'STU-002', name: 'Sarah Miller', status: 'BOARDED', lastSeen: new Date(Date.now() - 60000).toISOString(), routeId: 'ROUTE-R01' },
    { studentId: 'STU-003', name: 'Robert Chen', status: 'ALIGHTED', lastSeen: new Date(Date.now() - 300000).toISOString(), routeId: 'ROUTE-R12' },
    { studentId: 'STU-004', name: 'Emily Davis', status: 'BOARDED', lastSeen: new Date().toISOString(), routeId: 'ROUTE-R03' },
    { studentId: 'STU-005', name: 'Michael Brown', status: 'BOARDED', lastSeen: new Date().toISOString(), routeId: 'ROUTE-R01' },
];

const MOCK_ROUTES: Route[] = [
    {
        id: 'ROUTE-R01',
        name: 'Riverside Express',
        schoolId: 'SCH-001',
        direction: 'AM',
        startTime: '07:30',
        estimatedDuration: 45,
        status: 'active',
        path: [[45.4215, -75.6972], [45.4115, -75.6872], [45.4015, -75.6772]],
        stops: [
            { id: 'S1', routeId: 'ROUTE-R01', sequence: 1, address: 'Bank St & Riverside Dr', location: 'POINT(-75.6972 45.4215)' },
            { id: 'S2', routeId: 'ROUTE-R01', sequence: 2, address: 'Billing Bridge', location: 'POINT(-75.6872 45.4115)' },
            { id: 'S3', routeId: 'ROUTE-R01', sequence: 3, address: 'Heron Rd Depot', location: 'POINT(-75.6772 45.4015)' },
        ]
    },
    {
        id: 'ROUTE-R12',
        name: 'Glebe North',
        schoolId: 'SCH-001',
        direction: 'AM',
        startTime: '07:45',
        estimatedDuration: 30,
        status: 'active',
        path: [[45.4115, -75.7072], [45.4015, -75.6972]],
        stops: [
            { id: 'S4', routeId: 'ROUTE-R12', sequence: 1, address: 'Fifth Ave & Bank St', location: 'POINT(-75.7072 45.4115)' },
            { id: 'S5', routeId: 'ROUTE-R12', sequence: 2, address: 'Lansdowne Park', location: 'POINT(-75.6972 45.4015)' },
        ]
    },
    {
        id: 'ROUTE-R03',
        name: 'Kanata Rapid',
        schoolId: 'SCH-002',
        direction: 'AM',
        startTime: '08:00',
        estimatedDuration: 50,
        status: 'active',
        path: [[45.4315, -75.6872], [45.4215, -75.6772]],
        stops: [
            { id: 'S6', routeId: 'ROUTE-R03', sequence: 1, address: 'Teron Rd', location: 'POINT(-75.6872 45.4315)' },
            { id: 'S7', routeId: 'ROUTE-R03', sequence: 2, address: 'March Rd', location: 'POINT(-75.6772 45.4215)' },
        ]
    },
];

export const mockAlertsApi = {
    getActiveAlerts: async () => MOCK_ALERTS,
    getAllAlerts: async () => MOCK_ALERTS,
    getAlertById: async (id: string) => MOCK_ALERTS.find(a => a.id === id) || MOCK_ALERTS[0],
    resolveAlert: async (id: string) => ({ ...MOCK_ALERTS[0], id, status: 'RESOLVED' as const }),
};

export const mockRoutesApi = {
    getAllLiveLocations: async () => MOCK_LOCATIONS,
    getActiveRoutes: async () => MOCK_ROUTES,
    getRouteById: async (id: string) => MOCK_ROUTES.find(r => r.id === id) || MOCK_ROUTES[0],
};

export const mockPresenceApi = {
    getAllBoardedStudents: async () => MOCK_STUDENTS.filter(s => s.status === 'BOARDED'),
    getStudentPresence: async (id: string) => MOCK_STUDENTS.find(s => s.studentId === id) || MOCK_STUDENTS[0],
};

export const mockAuthApi = {
    login: async (email: string) => ({
        accessToken: 'mock-token',
        user: { id: 'usr-001', name: 'Mock Admin', email, role: 'ADMIN' as const },
    }),
    getProfile: async () => ({ id: 'usr-001', name: 'Mock Admin', email: 'admin@mock.com', role: 'ADMIN' as const }),
};
