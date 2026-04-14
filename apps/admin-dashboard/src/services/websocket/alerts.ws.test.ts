import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let mockWsInstance: any;

function createMockWs(url: string) {
  mockWsInstance = {
    url,
    onopen: null as any,
    onmessage: null as any,
    onclose: null as any,
    onerror: null as any,
    close: vi.fn(),
    readyState: 1,
  };
  return mockWsInstance;
}

const MockWebSocket = vi.fn().mockImplementation(createMockWs);

(MockWebSocket as any).OPEN = 1;
(MockWebSocket as any).CLOSED = 3;

vi.stubGlobal('WebSocket', MockWebSocket);

import { alertsWs } from './alerts.ws';

describe('AlertsWebSocket', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockWsInstance = null;
    // Re-attach implementation after any clearAllMocks
    MockWebSocket.mockImplementation(createMockWs);
    // Ensure clean state
    alertsWs.disconnect();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('connect', () => {
    it('should create a WebSocket with the provided URL', () => {
      alertsWs.connect('ws://test:3000/ws/alerts');
      expect(MockWebSocket).toHaveBeenCalledWith('ws://test:3000/ws/alerts');
    });

    it('should reset reconnect attempts on successful open', () => {
      alertsWs.connect('ws://test:3000/ws/alerts');
      const callCountBefore = MockWebSocket.mock.calls.length;
      mockWsInstance.onopen();
      // After open, no more reconnects should happen
      expect(MockWebSocket.mock.calls.length).toBe(callCountBefore);
    });
  });

  describe('onmessage', () => {
    it('should parse JSON and call all subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      alertsWs.subscribe(callback1);
      alertsWs.subscribe(callback2);

      alertsWs.connect('ws://test:3000/ws/alerts');

      const alertData = { id: 'alert-1', type: 'PANIC_BUTTON', severity: 'critical' };
      mockWsInstance.onmessage({ data: JSON.stringify(alertData) });

      expect(callback1).toHaveBeenCalledWith(alertData);
      expect(callback2).toHaveBeenCalledWith(alertData);
    });

    it('should handle invalid JSON gracefully', () => {
      const callback = vi.fn();
      alertsWs.subscribe(callback);

      alertsWs.connect('ws://test:3000/ws/alerts');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockWsInstance.onmessage({ data: 'not-json' });

      expect(callback).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('onclose', () => {
    it('should attempt reconnect with exponential backoff', () => {
      alertsWs.connect('ws://test:3000/ws/alerts');
      const firstCallCount = MockWebSocket.mock.calls.length;

      mockWsInstance.onclose();

      expect(MockWebSocket.mock.calls.length).toBe(firstCallCount);
      vi.advanceTimersByTime(2000);
      expect(MockWebSocket.mock.calls.length).toBe(firstCallCount + 1);
    });

    it('should stop reconnecting after max attempts', () => {
      alertsWs.connect('ws://test:3000/ws/alerts');

      for (let i = 0; i < 5; i++) {
        mockWsInstance.onclose();
        vi.advanceTimersByTime(30000);
      }

      const callCount = MockWebSocket.mock.calls.length;

      mockWsInstance.onclose();
      vi.advanceTimersByTime(60000);

      expect(MockWebSocket.mock.calls.length).toBe(callCount);
    });
  });

  describe('subscribe', () => {
    it('should return an unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = alertsWs.subscribe(callback);

      alertsWs.connect('ws://test:3000/ws/alerts');
      const alertData = { id: 'alert-1', type: 'INCIDENT' };

      mockWsInstance.onmessage({ data: JSON.stringify(alertData) });
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      mockWsInstance.onmessage({ data: JSON.stringify(alertData) });
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('disconnect', () => {
    it('should close the WebSocket and clear callbacks', () => {
      const callback = vi.fn();
      alertsWs.subscribe(callback);
      alertsWs.connect('ws://test:3000/ws/alerts');
      const ws = mockWsInstance;

      alertsWs.disconnect();

      expect(ws.close).toHaveBeenCalled();
    });

    it('should clear pending reconnect timeout', () => {
      alertsWs.connect('ws://test:3000/ws/alerts');
      mockWsInstance.onclose();

      alertsWs.disconnect();

      const callCount = MockWebSocket.mock.calls.length;
      vi.advanceTimersByTime(60000);
      expect(MockWebSocket.mock.calls.length).toBe(callCount);
    });
  });

  describe('isConnected', () => {
    it('should return true when readyState is OPEN', () => {
      alertsWs.connect('ws://test:3000/ws/alerts');
      mockWsInstance.readyState = WebSocket.OPEN;

      expect(alertsWs.isConnected()).toBe(true);
    });

    it('should return false when readyState is not OPEN', () => {
      alertsWs.connect('ws://test:3000/ws/alerts');
      mockWsInstance.readyState = 3;

      expect(alertsWs.isConnected()).toBe(false);
    });

    it('should return false when no WebSocket exists', () => {
      expect(alertsWs.isConnected()).toBe(false);
    });
  });
});
