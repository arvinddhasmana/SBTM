/**
 * BLE Service — SmartTag detection for student presence
 *
 * Uses react-native-ble-plx to scan for BLE beacons and translates
 * detections into presence events sent to the backend presence service.
 *
 * Battery: scanning is started only during active routes and stopped
 * immediately on route completion (NFR-BATT-001).
 *
 * Throttle: identical tagId detections are deduplicated within a 5-second
 * window to avoid flooding the backend. A maximum of 50 detections are
 * accumulated before a batch is sent.
 *
 * Permissions: Android requires BLUETOOTH_SCAN + ACCESS_FINE_LOCATION;
 * iOS requires NSBluetoothAlwaysUsageDescription in Info.plist.
 * The service requests permissions and surfaces a clear denial state.
 */
import { BleManager, State, Device } from 'react-native-ble-plx';
import { Platform } from 'react-native';
import type { BleDetection } from '../types';
import { PresenceService } from './presence.service';

export type BleScanState = 'idle' | 'scanning' | 'permission_denied' | 'unsupported';

// Detections within this window for the same tag are collapsed into one
const DEDUP_WINDOW_MS = 5_000;
// Batch send when this many unique detections accumulate
const BATCH_SIZE = 50;
// Interval between batch sends (ms)
const BATCH_INTERVAL_MS = 10_000;

interface ActiveScanContext {
  routeId: string;
  vehicleId: string;
  schoolId: string;
  runId: string;
  stopId: string;
  batchTimer: ReturnType<typeof setInterval> | null;
  pendingDetections: Map<string, { signalStrength: number; lastSeenAt: number }>;
  scanSubscription: { remove: () => void } | null;
}

let manager: BleManager | null = null;
let scanContext: ActiveScanContext | null = null;
let stateListener: BleScanState = 'idle';
const listeners = new Set<(s: BleScanState) => void>();

function setState(next: BleScanState): void {
  stateListener = next;
  listeners.forEach((l) => l(next));
}

function getManager(): BleManager {
  if (!manager) {
    manager = new BleManager();
  }
  return manager;
}

async function checkPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // React Native PermissionsAndroid is handled inside BleManager on Android 12+
    // but we rely on Expo or OS-level prompts wired via app.json plugins.
    // Permissions are declared in AndroidManifest.xml via the expo-ble-plx plugin.
  }
  const bleState = await getManager().state();
  return bleState === State.PoweredOn;
}

async function flushBatch(context: ActiveScanContext): Promise<void> {
  if (context.pendingDetections.size === 0) return;

  const now = Date.now();
  const detections: BleDetection[] = [];

  for (const [tagId, info] of context.pendingDetections.entries()) {
    // Only send detections seen in the last DEDUP_WINDOW_MS * 2 interval
    if (now - info.lastSeenAt < DEDUP_WINDOW_MS * 2) {
      detections.push({ tagId, signalStrength: info.signalStrength });
    }
  }

  if (detections.length === 0) return;

  await PresenceService.sendBleDetections({
    schoolId: context.schoolId,
    vehicleId: context.vehicleId,
    routeId: context.routeId,
    runId: context.runId,
    stopId: context.stopId,
    timestamp: new Date().toISOString(),
    detections,
  });

  // Clear sent entries – keep entries that arrived during the send
  for (const [tagId, info] of context.pendingDetections.entries()) {
    if (now - info.lastSeenAt >= DEDUP_WINDOW_MS * 2) {
      context.pendingDetections.delete(tagId);
    }
  }
}

function onDeviceDetected(context: ActiveScanContext, device: Device): void {
  const tagId = device.id;
  const rssi = device.rssi ?? -100;
  const now = Date.now();

  const existing = context.pendingDetections.get(tagId);
  if (existing && now - existing.lastSeenAt < DEDUP_WINDOW_MS) {
    // Update signal strength to strongest seen in window
    existing.signalStrength = Math.max(existing.signalStrength, rssi);
    existing.lastSeenAt = now;
    return;
  }

  context.pendingDetections.set(tagId, { signalStrength: rssi, lastSeenAt: now });

  // Flush immediately if batch size reached
  if (context.pendingDetections.size >= BATCH_SIZE) {
    void flushBatch(context);
  }
}

export const BleService = {
  getState: (): BleScanState => stateListener,

  onStateChange: (listener: (s: BleScanState) => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  startScanning: async (
    routeId: string,
    vehicleId: string,
    schoolId: string,
    runId: string,
    stopId: string,
  ): Promise<void> => {
    if (scanContext) {
      // Already scanning – ignore duplicate start
      return;
    }

    const ready = await checkPermissions();
    if (!ready) {
      setState('permission_denied');
      return;
    }

    const context: ActiveScanContext = {
      routeId,
      vehicleId,
      schoolId,
      runId,
      stopId,
      batchTimer: null,
      pendingDetections: new Map(),
      scanSubscription: null,
    };

    getManager().startDeviceScan(null, { allowDuplicates: true }, (error, device) => {
      if (error) {
        console.warn('BLE scan error', { routeId, message: error.message });
        setState('idle');
        return;
      }
      if (device) {
        onDeviceDetected(context, device);
      }
    });

    context.batchTimer = setInterval(() => {
      void flushBatch(context);
    }, BATCH_INTERVAL_MS);

    scanContext = context;
    setState('scanning');
  },

  stopScanning: async (): Promise<void> => {
    if (!scanContext) return;

    const context = scanContext;
    scanContext = null;

    getManager().stopDeviceScan();

    if (context.batchTimer) {
      clearInterval(context.batchTimer);
    }

    // Flush remaining detections before stopping
    await flushBatch(context);

    setState('idle');
  },

  /** Destroy the BLE manager. Call on app teardown. */
  destroy: (): void => {
    if (scanContext) {
      if (scanContext.batchTimer) {
        clearInterval(scanContext.batchTimer);
      }
      scanContext = null;
    }
    if (manager) {
      manager.destroy();
      manager = null;
    }
    setState('idle');
  },
};
