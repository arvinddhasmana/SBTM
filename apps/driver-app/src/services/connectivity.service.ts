import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { GPSService } from './gps.service';
import { EmergencyService } from './emergency.service';

type OfflineCallback = (isOffline: boolean) => void;

let unsubscribe: (() => void) | null = null;

export const ConnectivityService = {
  /**
   * Start monitoring network state. Calls `onOfflineChange` when connectivity
   * changes and automatically flushes offline queues on reconnect.
   */
  startMonitoring: (onOfflineChange: OfflineCallback) => {
    if (unsubscribe) return; // already monitoring

    unsubscribe = NetInfo.addEventListener(async (state: NetInfoState) => {
      const isOffline = !(state.isConnected && state.isInternetReachable !== false);
      onOfflineChange(isOffline);

      if (!isOffline) {
        // Network restored – flush all offline queues
        console.log('Network restored, flushing offline queues');
        await GPSService.flushOfflineQueue();
        await EmergencyService.flushOfflineQueue();
      }
    });
  },

  stopMonitoring: () => {
    unsubscribe?.();
    unsubscribe = null;
  },
};
