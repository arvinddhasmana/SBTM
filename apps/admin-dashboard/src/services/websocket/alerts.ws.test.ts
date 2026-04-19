import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock socket.io-client
let mockSocketInstance: any;
const mockIo = vi.fn();

vi.mock('socket.io-client', () => ({
  io: (...args: any[]) => {
    mockSocketInstance = {
      connected: false,
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        if (!mockSocketInstance._handlers[event]) {
          mockSocketInstance._handlers[event] = [];
        }
        mockSocketInstance._handlers[event].push(handler);
      }),
      disconnect: vi.fn(() => {
        mockSocketInstance.connected = false;
      }),
      _handlers: {} as Record<string, ((...args: any[]) => void)[]>,
      _emit(event: string, ...args: any[]) {
        const handlers = mockSocketInstance._handlers[event] || [];
        handlers.forEach((h: (...args: any[]) => void) => h(...args));
      },
    };
    mockIo(...args);
    return mockSocketInstance;
  },
}));

import { alertsWs } from './alerts.ws';

describe('AlertsWebSocket', () => {
  beforeEach(() => {
    mockSocketInstance = null;
    mockIo.mockClear();
    alertsWs.disconnect();
  });

  afterEach(() => {
    alertsWs.disconnect();
  });

  describe('connect', () => {
    it('should create a socket.io connection with the /alerts namespace', () => {
      alertsWs.connect('http://test:3003');
      expect(mockIo).toHaveBeenCalledWith(
        'http://test:3003/alerts',
        expect.objectContaining({
          transports: ['websocket'],
          reconnection: true,
        }),
      );
    });

    it('should not create duplicate connections if already connected', () => {
      alertsWs.connect('http://test:3003');
      mockSocketInstance.connected = true;
      alertsWs.connect('http://test:3003');
      expect(mockIo).toHaveBeenCalledTimes(1);
    });

    it('should register emergency-alert event handler', () => {
      alertsWs.connect('http://test:3003');
      expect(mockSocketInstance.on).toHaveBeenCalledWith('emergency-alert', expect.any(Function));
    });
  });

  describe('emergency-alert event', () => {
    it('should call all subscribers when emergency-alert received', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      alertsWs.subscribe(callback1);
      alertsWs.subscribe(callback2);

      alertsWs.connect('http://test:3003');

      const alertData = { id: 'alert-1', eventType: 'PANIC_BUTTON', status: 'ACTIVE' };
      mockSocketInstance._emit('emergency-alert', alertData);

      expect(callback1).toHaveBeenCalledWith(alertData);
      expect(callback2).toHaveBeenCalledWith(alertData);
    });
  });

  describe('subscribe', () => {
    it('should return an unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = alertsWs.subscribe(callback);

      alertsWs.connect('http://test:3003');
      const alertData = { id: 'alert-1', eventType: 'INCIDENT' };

      mockSocketInstance._emit('emergency-alert', alertData);
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      mockSocketInstance._emit('emergency-alert', alertData);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('disconnect', () => {
    it('should disconnect the socket and clear callbacks', () => {
      const callback = vi.fn();
      alertsWs.subscribe(callback);
      alertsWs.connect('http://test:3003');
      const socket = mockSocketInstance;

      alertsWs.disconnect();

      expect(socket.disconnect).toHaveBeenCalled();
    });
  });

  describe('isConnected', () => {
    it('should return true when socket is connected', () => {
      alertsWs.connect('http://test:3003');
      mockSocketInstance.connected = true;
      expect(alertsWs.isConnected()).toBe(true);
    });

    it('should return false when socket is not connected', () => {
      alertsWs.connect('http://test:3003');
      mockSocketInstance.connected = false;
      expect(alertsWs.isConnected()).toBe(false);
    });

    it('should return false when no socket exists', () => {
      expect(alertsWs.isConnected()).toBe(false);
    });
  });
});
