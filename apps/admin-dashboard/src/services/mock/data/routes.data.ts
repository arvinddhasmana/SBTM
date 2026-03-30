import type { LiveLocation, Route } from '../../../types';

export const MOCK_LOCATIONS: LiveLocation[] = [
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

export const MOCK_ROUTES: Route[] = [
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
