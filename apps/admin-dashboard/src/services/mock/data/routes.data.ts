import type { LiveLocation, Route } from '../../../types';

export const MOCK_LOCATIONS: LiveLocation[] = [
  {
    routeId: 'ROUTE-SingleBus-AM',
    vehicleId: 'BUS-01',
    lastUpdate: new Date().toISOString(),
    position: { lat: 45.38, lng: -75.6808 },
    etaToNextStopMinutes: 5,
    deviationFlag: false,
    status: 'normal',
  },
  {
    routeId: 'ROUTE-SingleBus-PM',
    vehicleId: 'BUS-01',
    lastUpdate: new Date().toISOString(),
    position: { lat: 45.3876, lng: -75.696 },
    etaToNextStopMinutes: 2,
    deviationFlag: false,
    status: 'normal',
  },
];

export const MOCK_ROUTES: Route[] = [
  {
    id: 'ROUTE-SingleBus-AM',
    name: 'Single Bus AM',
    schoolId: 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c',
    direction: 'AM',
    startTime: '07:15',
    estimatedDuration: 35,
    status: 'active',
    path: [
      [45.3682, -75.6807],
      [45.373, -75.6832],
      [45.38, -75.6808],
      [45.3876, -75.696],
    ],
    stops: [
      {
        id: 'S1',
        routeId: 'ROUTE-SingleBus-AM',
        sequence: 1,
        address: 'AM Stop 1',
        location: 'POINT(-75.68318 45.3730)',
      },
      {
        id: 'S2',
        routeId: 'ROUTE-SingleBus-AM',
        sequence: 2,
        address: 'AM Stop 2',
        location: 'POINT(-75.68247 45.37472)',
      },
      {
        id: 'S3',
        routeId: 'ROUTE-SingleBus-AM',
        sequence: 3,
        address: 'AM Stop 3',
        location: 'POINT(-75.68183 45.37381)',
      },
      {
        id: 'S4',
        routeId: 'ROUTE-SingleBus-AM',
        sequence: 4,
        address: 'AM Stop 4',
        location: 'POINT(-75.68510 45.37922)',
      },
      {
        id: 'S5',
        routeId: 'ROUTE-SingleBus-AM',
        sequence: 5,
        address: 'AM Stop 5',
        location: 'POINT(-75.69067 45.38600)',
      },
    ],
  },
  {
    id: 'ROUTE-SingleBus-PM',
    name: 'Single Bus PM',
    schoolId: 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c',
    direction: 'PM',
    startTime: '15:00',
    estimatedDuration: 35,
    status: 'active',
    path: [
      [45.3876, -75.696],
      [45.38, -75.6808],
      [45.373, -75.6832],
      [45.3682, -75.6807],
    ],
    stops: [
      {
        id: 'S6',
        routeId: 'ROUTE-SingleBus-PM',
        sequence: 1,
        address: 'PM Stop 1',
        location: 'POINT(-75.69067 45.38600)',
      },
      {
        id: 'S7',
        routeId: 'ROUTE-SingleBus-PM',
        sequence: 2,
        address: 'PM Stop 2',
        location: 'POINT(-75.68510 45.37922)',
      },
      {
        id: 'S8',
        routeId: 'ROUTE-SingleBus-PM',
        sequence: 3,
        address: 'PM Stop 3',
        location: 'POINT(-75.68183 45.37381)',
      },
      {
        id: 'S9',
        routeId: 'ROUTE-SingleBus-PM',
        sequence: 4,
        address: 'PM Stop 4',
        location: 'POINT(-75.68247 45.37472)',
      },
      {
        id: 'S10',
        routeId: 'ROUTE-SingleBus-PM',
        sequence: 5,
        address: 'PM Stop 5',
        location: 'POINT(-75.68318 45.3730)',
      },
    ],
  },
];
