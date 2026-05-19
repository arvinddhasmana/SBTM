import { renderHook, act } from '@testing-library/react-native';
import { useBleScanning } from './useBleScanning';
import { BleService } from '../services/ble.service';

jest.mock('../services/ble.service', () => ({
  BleService: {
    getState: jest.fn(() => 'idle'),
    onStateChange: jest.fn(() => jest.fn()),
    startScanning: jest.fn().mockResolvedValue(undefined),
    stopScanning: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('useBleScanning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return idle state initially when disabled', () => {
    const { result } = renderHook(() => useBleScanning('route-1', 'bus-1', 'school-1', false));

    expect(result.current.scanState).toBe('idle');
    expect(BleService.startScanning).not.toHaveBeenCalled();
  });

  it('should start scanning when enabled with all required params', () => {
    renderHook(() => useBleScanning('route-1', 'bus-1', 'school-1', true));

    expect(BleService.startScanning).toHaveBeenCalledWith('route-1', 'bus-1', 'school-1', '', '');
  });

  it('should stop scanning and unsubscribe on unmount', () => {
    const unsubscribe = jest.fn();
    (BleService.onStateChange as jest.Mock).mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useBleScanning('route-1', 'bus-1', 'school-1', true));

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
    expect(BleService.stopScanning).toHaveBeenCalled();
  });

  it('should not start scanning when routeId is empty', () => {
    renderHook(() => useBleScanning('', 'bus-1', 'school-1', true));

    expect(BleService.startScanning).not.toHaveBeenCalled();
  });
});
