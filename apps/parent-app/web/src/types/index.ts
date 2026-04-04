export interface Child {
  id: string;
  name: string;
  schoolName: string;
  routeId: string;
  vehicleId: string;
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
}

export interface NotificationPreference {
  eventType: string;
  channel: string;
  enabled: boolean;
}
