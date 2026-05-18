import { useEffect, useState } from 'react';
import { BleService, type BleScanState } from '../services/ble.service';

/**
 * Hook that manages BLE scanning lifecycle for an active route.
 *
 * Starts scanning on mount and stops on unmount, ensuring no rogue
 * background BLE activity persists outside of an active route session
 * (NFR-BATT-001).
 *
 * @param routeId  The active route ID
 * @param vehicleId The vehicle assigned to this route
 * @param schoolId  Tenant identifier (from authenticated user context)
 * @param enabled   Set to false to skip scanning (e.g. permission not granted)
 */
export function useBleScanning(
  routeId: string,
  vehicleId: string,
  schoolId: string,
  enabled: boolean,
  runId?: string,
  stopId?: string,
): { scanState: BleScanState } {
  const [scanState, setScanState] = useState<BleScanState>(BleService.getState());

  useEffect(() => {
    const unsubscribe = BleService.onStateChange(setScanState);

    if (enabled && routeId && vehicleId && schoolId) {
      void BleService.startScanning(routeId, vehicleId, schoolId, runId ?? '', stopId ?? '');
    }

    return () => {
      unsubscribe();
      void BleService.stopScanning();
    };
  }, [routeId, vehicleId, schoolId, enabled, runId, stopId]);

  return { scanState };
}
