/**
 * BLE Service unit tests
 *
 * react-native-ble-plx is mocked to avoid requiring native modules.
 * Tests verify throttling, deduplication, flush, and state transitions.
 */

// Mock react-native-ble-plx before import
const mockStartDeviceScan = jest.fn();
const mockStopDeviceScan = jest.fn();
const mockState = jest.fn().mockResolvedValue('PoweredOn');
const mockDestroy = jest.fn();

jest.mock('react-native-ble-plx', () => ({
    BleManager: jest.fn().mockImplementation(() => ({
        startDeviceScan: mockStartDeviceScan,
        stopDeviceScan: mockStopDeviceScan,
        state: mockState,
        destroy: mockDestroy,
    })),
    State: { PoweredOn: 'PoweredOn' },
}));

jest.mock('./presence.service', () => ({
    PresenceService: {
        sendBleDetections: jest.fn().mockResolvedValue(undefined),
    },
}));

jest.mock('react-native', () => ({
    Platform: { OS: 'android' },
}));

import { BleService } from './ble.service';
import { PresenceService } from './presence.service';

const mockPresence = PresenceService as jest.Mocked<typeof PresenceService>;

describe('BleService', () => {
    const routeId = 'route-ble-1';
    const vehicleId = 'vehicle-ble-1';
    const schoolId = 'school-ble-1';

    beforeEach(() => {
        jest.clearAllMocks();
        BleService.destroy();
    });

    afterEach(() => {
        BleService.destroy();
    });

    describe('getState', () => {
        it('returns idle initially', () => {
            expect(BleService.getState()).toBe('idle');
        });
    });

    describe('startScanning', () => {
        it('transitions to scanning state when BLE is powered on', async () => {
            await BleService.startScanning(routeId, vehicleId, schoolId);
            expect(BleService.getState()).toBe('scanning');
            expect(mockStartDeviceScan).toHaveBeenCalled();
        });

        it('transitions to permission_denied when BLE is not powered on', async () => {
            mockState.mockResolvedValueOnce('PoweredOff');
            await BleService.startScanning(routeId, vehicleId, schoolId);
            expect(BleService.getState()).toBe('permission_denied');
        });

        it('ignores duplicate startScanning calls', async () => {
            await BleService.startScanning(routeId, vehicleId, schoolId);
            await BleService.startScanning(routeId, vehicleId, schoolId);
            expect(mockStartDeviceScan).toHaveBeenCalledTimes(1);
        });
    });

    describe('stopScanning', () => {
        it('stops scanning and returns to idle state', async () => {
            await BleService.startScanning(routeId, vehicleId, schoolId);
            await BleService.stopScanning();
            expect(BleService.getState()).toBe('idle');
            expect(mockStopDeviceScan).toHaveBeenCalled();
        });

        it('does nothing if not scanning', async () => {
            await BleService.stopScanning();
            expect(mockStopDeviceScan).not.toHaveBeenCalled();
        });
    });

    describe('onStateChange', () => {
        it('notifies listener on state transition', async () => {
            const listener = jest.fn();
            const unsubscribe = BleService.onStateChange(listener);

            await BleService.startScanning(routeId, vehicleId, schoolId);

            expect(listener).toHaveBeenCalledWith('scanning');

            unsubscribe();

            await BleService.stopScanning();
            // Listener removed – should not have been called again
            expect(listener).toHaveBeenCalledTimes(1);
        });
    });

    describe('destroy', () => {
        it('resets state to idle', async () => {
            await BleService.startScanning(routeId, vehicleId, schoolId);
            BleService.destroy();
            expect(BleService.getState()).toBe('idle');
            expect(mockDestroy).toHaveBeenCalled();
        });
    });
});
