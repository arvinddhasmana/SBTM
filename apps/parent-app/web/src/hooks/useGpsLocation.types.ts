/** Shape of the SSE event emitted by the API Gateway's GpsSseService. */
export interface GpsLocationEvent {
  routeId: string;
  vehicleId: string;
  lastUpdate: string;
  position: { lat: number; lng: number };
  speedKph?: number;
  headingDeg?: number;
}
