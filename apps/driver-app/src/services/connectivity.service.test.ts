import { ConnectivityService } from './connectivity.service';
import NetInfo from '@react-native-community/netinfo';
import { GPSService } from './gps.service';
import { EmergencyService } from './emergency.service';

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
}));

jest.mock('./gps.service', () => ({
  GPSService: {
    flushOfflineQueue: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('./emergency.service', () => ({
  EmergencyService: {
    flushOfflineQueue: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock api.service to prevent import-time errors
jest.mock('./api.service', () => ({
  post: jest.fn(),
  create: jest.fn(() => ({
    interceptors: { request: { use: jest.fn() } },
  })),
}));

describe('ConnectivityService', () => {
  let capturedCallback: (state: any) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset internal unsubscribe state by stopping first
    ConnectivityService.stopMonitoring();

    (NetInfo.addEventListener as jest.Mock).mockImplementation((cb: any) => {
      capturedCallback = cb;
      return jest.fn(); // unsubscribe function
    });
  });

  it('should start monitoring and register NetInfo listener', () => {
    const onOfflineChange = jest.fn();
    ConnectivityService.startMonitoring(onOfflineChange);

    expect(NetInfo.addEventListener).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should report offline when isConnected is false', async () => {
    const onOfflineChange = jest.fn();
    ConnectivityService.startMonitoring(onOfflineChange);

    await capturedCallback({ isConnected: false, isInternetReachable: false });

    expect(onOfflineChange).toHaveBeenCalledWith(true);
  });

  it('should flush offline queues when network is restored', async () => {
    const onOfflineChange = jest.fn();
    ConnectivityService.startMonitoring(onOfflineChange);

    await capturedCallback({ isConnected: true, isInternetReachable: true });

    expect(onOfflineChange).toHaveBeenCalledWith(false);
    expect(GPSService.flushOfflineQueue).toHaveBeenCalled();
    expect(EmergencyService.flushOfflineQueue).toHaveBeenCalled();
  });

  it('should not register a second listener if already monitoring', () => {
    const onOfflineChange = jest.fn();
    ConnectivityService.startMonitoring(onOfflineChange);
    ConnectivityService.startMonitoring(onOfflineChange);

    // addEventListener should only be called once (the second call is a no-op)
    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
  });

  it('should stop monitoring and allow re-registration', () => {
    const onOfflineChange = jest.fn();
    ConnectivityService.startMonitoring(onOfflineChange);
    ConnectivityService.stopMonitoring();

    // After stop, starting again should register a new listener
    ConnectivityService.startMonitoring(onOfflineChange);
    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(2);
  });
});
