import { renderHook, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAlertStream } from './useAlertStream';

class MockEventSource {
  url: string;
  withCredentials: boolean;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  closed = false;

  constructor(url: string, opts?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = opts?.withCredentials ?? false;
    MockEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  static instances: MockEventSource[] = [];
  static reset() {
    MockEventSource.instances = [];
  }
}

const originalEventSource = globalThis.EventSource;

beforeEach(() => {
  MockEventSource.reset();
  (globalThis as any).EventSource = MockEventSource;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  (globalThis as any).EventSource = originalEventSource;
  cleanup();
});

describe('useAlertStream', () => {
  it('starts with disconnected state and no alert', () => {
    const { result } = renderHook(() => useAlertStream(['ROUTE-1']));

    expect(result.current.latestAlert).toBeNull();
    expect(result.current.connected).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('connects to SSE and sets connected state', () => {
    const { result } = renderHook(() => useAlertStream(['ROUTE-1']));

    expect(MockEventSource.instances).toHaveLength(1);
    const es = MockEventSource.instances[0];

    act(() => {
      es.onopen?.(new Event('open'));
    });

    expect(result.current.connected).toBe(true);
  });

  it('updates latestAlert when matching message received', () => {
    const { result } = renderHook(() => useAlertStream(['ROUTE-1']));
    const es = MockEventSource.instances[0];

    act(() => {
      es.onopen?.(new Event('open'));
    });

    const alertData = {
      id: 'alert-1',
      routeId: 'ROUTE-1',
      vehicleId: 'BUS-01',
      eventType: 'PANIC_BUTTON',
      message: 'Emergency!',
      createdAt: '2026-04-04T10:00:00Z',
    };

    act(() => {
      es.onmessage?.(new MessageEvent('message', { data: JSON.stringify(alertData) }));
    });

    expect(result.current.latestAlert).toEqual(alertData);
  });

  it('filters alerts that do not match routeIds', () => {
    const { result } = renderHook(() => useAlertStream(['ROUTE-1']));
    const es = MockEventSource.instances[0];

    act(() => {
      es.onopen?.(new Event('open'));
    });

    const alertData = {
      id: 'alert-2',
      routeId: 'ROUTE-OTHER',
      vehicleId: 'BUS-02',
      eventType: 'LATE_ARRIVAL',
      message: 'Late!',
      createdAt: '2026-04-04T10:00:00Z',
    };

    act(() => {
      es.onmessage?.(new MessageEvent('message', { data: JSON.stringify(alertData) }));
    });

    expect(result.current.latestAlert).toBeNull();
  });

  it('reconnects after error with delay', () => {
    renderHook(() => useAlertStream(['ROUTE-1']));

    expect(MockEventSource.instances).toHaveLength(1);
    const es = MockEventSource.instances[0];

    act(() => {
      es.onerror?.(new Event('error'));
    });

    expect(es.closed).toBe(true);

    // Before delay, no new connection
    expect(MockEventSource.instances).toHaveLength(1);

    // After 5s reconnect delay
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(MockEventSource.instances).toHaveLength(2);
  });

  it('cleans up EventSource on unmount', () => {
    const { unmount } = renderHook(() => useAlertStream(['ROUTE-1']));
    const es = MockEventSource.instances[0];

    unmount();

    expect(es.closed).toBe(true);
  });
});
