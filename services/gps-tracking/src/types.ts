export interface LocationPoint {
    id: string;
    vehicleId: string;
    routeId: string;
    timestamp: Date;
    lat: number;
    lng: number;
    speedKph: number | null;
    headingDeg: number | null;
    accuracyMeters: number | null;
}

export interface CreateLocationDto {
    vehicleId: string;
    routeId: string;
    timestamp: string; // ISO string
    lat: number;
    lng: number;
    speedKph?: number;
    headingDeg?: number;
    accuracyMeters?: number;
}
