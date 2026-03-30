import type { Alert } from '../../../types';

export const MOCK_ALERTS: Alert[] = [
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
