export interface Driver {
  id: string;
  name: string;
  email: string;
  assignedRoutes: Route[];
}

export interface Route {
  id: string;
  name: string;
  schoolId: string;
  vehicleId: string;
  startTime: string; // ISO
  endTime: string; // ISO
  direction: 'AM' | 'PM';
  polyline?: string;
  schoolLat?: number;
  schoolLng?: number;
  schoolName?: string;
}

export const RouteLifecycleEventType = {
  ROUTE_STARTED: 'ROUTE_STARTED',
  STOP_REACHED: 'STOP_REACHED',
  ROUTE_COMPLETED: 'ROUTE_COMPLETED',
} as const;
export type RouteLifecycleEventType =
  (typeof RouteLifecycleEventType)[keyof typeof RouteLifecycleEventType];

export interface BleDetection {
  tagId: string;
  signalStrength: number; // dBm
}

export interface LocationPoint {
  lat: number;
  lng: number;
  timestamp: string;
  speedKph?: number;
  headingDeg?: number;
  accuracyMeters?: number;
}

export interface Student {
  id: string;
  name: string;
  status: 'NOT_BOARDED' | 'BOARDED' | 'ALIGHTED';
  serverConfirmed?: boolean; // true once backend has acknowledged the state
  pendingSync?: boolean; // true while an offline event is queued
  stopId?: string;
  stopName?: string;
  stopSequence?: number;
  avatarUrl?: string;
}

export interface Stop {
  id: string;
  stopName: string;
  sequence: number;
  arrivalTime: string;
  lat?: number;
  lng?: number;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    driverId?: string;
  };
}
