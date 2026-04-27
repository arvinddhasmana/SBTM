import NetInfo from '@react-native-community/netinfo';

class ConnectivityServiceClass {
  private isMonitoring = false;
  private unsubscribe: (() => void) | null = null;

  /**
   * Start monitoring network connectivity
   * @param onConnectivityChange Callback invoked when connectivity changes
   */
  startMonitoring(onConnectivityChange: (isOffline: boolean) => void): void {
    if (this.isMonitoring) {
      console.warn('Connectivity monitoring already started');
      return;
    }

    this.unsubscribe = NetInfo.addEventListener((state) => {
      const isOffline = !state.isConnected || !state.isInternetReachable;
      onConnectivityChange(isOffline);

      if (state.isConnected && state.isInternetReachable) {
        console.log('Network connection restored');
      } else {
        console.log('Network connection lost');
      }
    });

    this.isMonitoring = true;
    console.log('Connectivity monitoring started');
  }

  /**
   * Stop monitoring network connectivity
   */
  stopMonitoring(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
      this.isMonitoring = false;
      console.log('Connectivity monitoring stopped');
    }
  }

  /**
   * Get current network state
   */
  async getNetworkState(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return !state.isConnected || !state.isInternetReachable;
  }
}

export const ConnectivityService = new ConnectivityServiceClass();
