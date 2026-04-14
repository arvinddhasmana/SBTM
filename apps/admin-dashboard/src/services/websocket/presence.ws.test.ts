import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock socket instance
const mockSocket = {
  on: vi.fn(),
  disconnect: vi.fn(),
  connected: false,
};

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

import { presenceWs } from './presence.ws';
import { io } from 'socket.io-client';

describe('PresenceWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    mockSocket.on.mockReset();
    mockSocket.disconnect.mockReset();

    // Reset module state by disconnecting
    presenceWs.disconnect();
  });

  describe('connect', () => {
    it('should create a socket.io connection with the provided URL', () => {
      presenceWs.connect('http://test:3004');

      expect(io).toHaveBeenCalledWith('http://test:3004/ws/presence', {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
      });
    });

    it('should subscribe to presence:updated event', () => {
      presenceWs.connect('http://test:3004');

      const presenceCall = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'presence:updated',
      );
      expect(presenceCall).toBeDefined();
    });

    it('should not reconnect if already connected', () => {
      presenceWs.connect('http://test:3004');
      mockSocket.connected = true;

      presenceWs.connect('http://test:3004');

      // io should only be called once
      expect(io).toHaveBeenCalledTimes(1);
    });
  });

  describe('presence:updated event', () => {
    it('should notify all subscribers when event is received', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      presenceWs.subscribe(callback1);
      presenceWs.subscribe(callback2);

      presenceWs.connect('http://test:3004');

      // Find the presence:updated handler
      const presenceCall = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'presence:updated',
      );
      const handler = presenceCall![1];

      const event = { driverId: 'drv-1', status: 'online' };
      handler(event);

      expect(callback1).toHaveBeenCalledWith(event);
      expect(callback2).toHaveBeenCalledWith(event);
    });
  });

  describe('subscribe', () => {
    it('should return an unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = presenceWs.subscribe(callback);

      presenceWs.connect('http://test:3004');

      // Find the presence:updated handler
      const presenceCall = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'presence:updated',
      );
      const handler = presenceCall![1];

      handler({ driverId: 'drv-1', status: 'online' });
      expect(callback).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();

      handler({ driverId: 'drv-1', status: 'offline' });
      expect(callback).toHaveBeenCalledTimes(1); // Not called again
    });
  });

  describe('disconnect', () => {
    it('should disconnect the socket and clear callbacks', () => {
      presenceWs.connect('http://test:3004');

      presenceWs.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('isConnected', () => {
    it('should return true when socket is connected', () => {
      presenceWs.connect('http://test:3004');
      mockSocket.connected = true;

      expect(presenceWs.isConnected()).toBe(true);
    });

    it('should return false when socket is not connected', () => {
      presenceWs.connect('http://test:3004');
      mockSocket.connected = false;

      expect(presenceWs.isConnected()).toBe(false);
    });

    it('should return false when no socket exists', () => {
      expect(presenceWs.isConnected()).toBe(false);
    });
  });
});
