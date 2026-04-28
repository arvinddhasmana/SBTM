/** Polling and timeout constants for the Driver App. */

/** GPS location update interval (ms) for both foreground and background tracking. */
export const GPS_UPDATE_INTERVAL_MS = 5_000;

/** Route status poll interval (ms) when WebSocket is unavailable. */
export const ROUTE_STATUS_POLL_MS = 30_000;

/** Alert messages poll interval (ms). */
export const ALERT_POLL_INTERVAL_MS = 15_000;

/** HTTP request timeout (ms). */
export const API_REQUEST_TIMEOUT_MS = 15_000;
