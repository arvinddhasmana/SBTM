import type { Alert } from '../../../types';

export const MOCK_ALERTS: Alert[] = [
  {
    id: 'alert-1',
    schoolId: 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c',
    routeId: 'ROUTE-SingleBus-PM',
    vehicleId: 'BUS-01',
    driverId: 'driver-001',
    timestamp: new Date().toISOString(),
    lat: 45.38,
    lng: -75.6808,
    eventType: 'PANIC_BUTTON',
    status: 'ACTIVE',
    description: 'Silent panic alarm triggered by operator.',
  },
  {
    id: 'alert-2',
    schoolId: 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c',
    routeId: 'ROUTE-SingleBus-PM',
    vehicleId: 'BUS-01',
    driverId: 'driver-001',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    lat: 45.373,
    lng: -75.6832,
    eventType: 'LATE_ARRIVAL',
    status: 'ACTIVE',
    description: 'Bus running 10 minutes behind schedule.',
  },
];
