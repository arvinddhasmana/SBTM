/**
 * Driver-app request shapes for the v2 boarding event API.
 *
 * Backed by `stx_boarding_events` (see student-presence service). `runId` and
 * `stopId` are REQUIRED — no nullable fallback per SBTM Phase B aggressive
 * cutover. The legacy `signalStrength` column is GONE from persistence; it
 * remains on the BLE detection payload only as a client-side threshold input.
 */

import type { BleDetection } from './index';

export type BoardingEventKind =
  | 'boarded'
  | 'alighted'
  | 'no_show'
  | 'boarded_at_alt_stop'
  | 'refused';

export type BoardingEventSource = 'driver_app' | 'rfid' | 'smarttag';

/** POST /student-presence-events (manual single boarding event). */
export interface LogPresenceEventRequest {
  schoolId: string;
  studentId: string;
  vehicleId: string;
  routeId: string;
  runId: string;
  stopId: string;
  eventKind: BoardingEventKind;
  source?: BoardingEventSource;
  timestamp: string;
}

/** POST /student-presence-events/manual (alias of the above, explicit). */
export interface ManualPresenceEventRequest extends LogPresenceEventRequest {}

/** POST /presence-events (BLE detection batch). */
export interface ProcessDetectionsRequest {
  schoolId: string;
  vehicleId: string;
  routeId: string;
  runId: string;
  stopId: string;
  timestamp: string;
  detections: BleDetection[];
}
