import axios from 'axios';

export interface OsrmSnapResult {
    lat: number;
    lng: number;
    name?: string;
}

export class OsrmService {
    private readonly baseUrl: string;

    constructor() {
        this.baseUrl = process.env.OSRM_BASE_URL || 'http://osrm:5000';
    }

    /**
     * Snaps a coordinate to the nearest road.
     */
    async snapToRoad(lat: number, lng: number): Promise<OsrmSnapResult | null> {
        try {
            const url = `${this.baseUrl}/nearest/v1/driving/${lng},${lat}`;
            const response = await axios.get(url, { timeout: 2000 });

            if (response.data?.code === 'Ok' && response.data.waypoints?.length > 0) {
                const waypoint = response.data.waypoints[0];
                return {
                    lng: waypoint.location[0],
                    lat: waypoint.location[1],
                    name: waypoint.name,
                };
            }
        } catch (error) {
            console.error('OSRM Snap failed:', (error as Error).message);
        }
        return null;
    }

    /**
     * Gets a road-aligned route for a set of coordinates.
     */
    async getSnappedRoute(coordinates: [number, number][]): Promise<[number, number][] | null> {
        try {
            if (coordinates.length < 2) return null;

            const coordStr = coordinates.map(([lng, lat]) => `${lng},${lat}`).join(';');
            const url = `${this.baseUrl}/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;

            const response = await axios.get(url, { timeout: 5000 });

            if (response.data?.code === 'Ok' && response.data.routes?.length > 0) {
                return response.data.routes[0].geometry.coordinates;
            }
        } catch (error) {
            console.error('OSRM Route failed:', (error as Error).message);
        }
        return null;
    }
}
