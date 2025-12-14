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
    startTime: string; // ISO
    endTime: string; // ISO
    direction: 'AM' | 'PM';
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
}

export interface LoginResponse {
    token: string;
    driver: Driver;
}
