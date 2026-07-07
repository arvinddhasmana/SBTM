export interface Child {
  id: string;
  name: string;
  schoolName: string;
  routeId: string;
  amRouteId?: string;
  pmRouteId?: string;
  amRouteName?: string;
  pmRouteName?: string;
  amStopId?: string;
  pmStopId?: string;
  amTripId?: string;
  pmTripId?: string;
  vehicleId: string;
  vehicleCode?: string;
  amOperatorCode?: string;
  pmOperatorCode?: string;
  status: 'on_bus' | 'at_school' | 'at_home' | 'unknown';
  avatarUrl?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  children: Child[];
}

export interface Location {
  lat: number;
  lng: number;
}

export interface BusLocationUpdate {
  routeId: string;
  vehicleId: string;
  timestamp: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  etaToNextStop?: number; // minutes
  status?: 'normal' | 'delay' | 'emergency';
}

export interface NotificationPreference {
  eventType: string;
  channel: string;
  enabled: boolean;
}
