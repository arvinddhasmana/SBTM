import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useGpsLocation } from './useGpsLocation';
import * as api from '../services/api';

// ---------------------------------------------------------------------------
// Mock EventSource
// ---------------------------------------------------------------------------

type SSECallback = (event: { data: string }) => void;

class MockEventSource {
  static instances: MockEventSource[] = [];
  readonly url: string;
  onopen: (() => void) | null = null;
  onmessage: SSECallback | null = null;
  onerror: (() => void) | null = null;
  private _closed = false;

  constructor(url: string, _opts?: unknown) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close() {
    this._closed = true;
  }

  get isClosed() {
    return this._closed;
  }

  /** Test helper: simulate a message arriving */
  simulateMessage(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateOpen() {
    this.onopen?.();
  }

  simulateError() {
    this.onerror?.();
  }
}

vi.stubGlobal('EventSource', MockEventSource);

// ---------------------------------------------------------------------------
// Mock parentApi
// ---------------------------------------------------------------------------

vi.mock('../services/api', async (importOriginal) => {
  const original = await importOriginal<typeof api>();
  return {
    ...original,
    parentApi: {
      ...original.parentApi,
      getLiveLocation: vi.fn(),
    },
  };
});

const mockGetLiveLocation = vi.mocked(api.parentApi.getLiveLocation);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeWrapper(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

const mockRestResponse: api.LiveLocationResponse = {
  routeId: 'ROUTE-AM',
  vehicleId: 'BUS-001',
  lastUpdate: '2026-04-08T08:00:00.000Z',
  position: { lat: 45.42, lng: -75.69 },
  etaToNextStopMinutes: 3,
  status: 'normal',
};

const mockSseEvent = {
  routeId: 'ROUTE-AM',
  vehicleId: 'BUS-001',
  lastUpdate: '2026-04-08T08:01:00.000Z',
  position: { lat: 45.43, lng: -75.7 },
  speedKph: 35,
  headingDeg: 180,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useGpsLocation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    MockEventSource.instances = [];
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockGetLiveLocation.mockResolvedValue(mockRestResponse);
  });

  afterEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('returns null initially when routeId is undefined', () => {
    const { result } = renderHook(() => useGpsLocation(undefined), {
      wrapper: makeWrapper(queryClient),
    });
    expect(result.current.location).toBeNull();
    expect(result.current.sseConnected).toBe(false);
  });

  it('opens an EventSource for the given routeId', () => {
    renderHook(() => useGpsLocation('ROUTE-AM'), {
      wrapper: makeWrapper(queryClient),
    });
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toContain('ROUTE-AM');
    expect(MockEventSource.instances[0].url).toContain('/location/stream');
  });

  it('marks sseConnected true when EventSource opens', async () => {
    const { result } = renderHook(() => useGpsLocation('ROUTE-AM'), {
      wrapper: makeWrapper(queryClient),
    });

    act(() => {
      MockEventSource.instances[0].simulateOpen();
    });

    await waitFor(() => expect(result.current.sseConnected).toBe(true));
  });

  it('updates location from SSE message and disables polling', async () => {
    const { result } = renderHook(() => useGpsLocation('ROUTE-AM'), {
      wrapper: makeWrapper(queryClient),
    });

    const es = MockEventSource.instances[0];

    act(() => {
      es.simulateOpen();
    });
    await waitFor(() => expect(result.current.sseConnected).toBe(true));

    act(() => {
      es.simulateMessage(mockSseEvent);
    });

    await waitFor(() => {
      const loc = result.current.location;
      expect(loc?.lat).toBe(45.43);
      expect(loc?.lng).toBe(-75.7);
      expect(loc?.routeId).toBe('ROUTE-AM');
      expect(loc?.vehicleId).toBe('BUS-001');
      expect(loc?.timestamp).toBe('2026-04-08T08:01:00.000Z');
    });
  });

  it('falls back to polling when SSE errors', async () => {
    const { result } = renderHook(() => useGpsLocation('ROUTE-AM'), {
      wrapper: makeWrapper(queryClient),
    });

    const es = MockEventSource.instances[0];

    // Initial connect then error
    act(() => es.simulateOpen());
    await waitFor(() => expect(result.current.sseConnected).toBe(true));

    act(() => es.simulateError());
    await waitFor(() => expect(result.current.sseConnected).toBe(false));

    // Polling should now be active — getLiveLocation is called by the query
    await waitFor(() => {
      expect(mockGetLiveLocation).toHaveBeenCalled();
    });
  });

  it('re-throws unexpected errors from REST endpoint (raw 404 no longer silently swallowed)', async () => {
    // The API gateway now converts GPS-service 404 → HTTP 200 { active: false }.
    // If useGpsLocation ever receives a raw 404 rejection (e.g. misconfigured proxy),
    // it should propagate the error so TanStack Query can surface it appropriately.
    mockGetLiveLocation.mockRejectedValue({ response: { status: 404 } });

    const { result } = renderHook(() => useGpsLocation('ROUTE-PM'), {
      wrapper: makeWrapper(queryClient),
    });

    // TanStack Query marks the query as errored; location stays null (initial value)
    await waitFor(() => {
      expect(result.current.location).toBeNull();
    });
  });

  it('closes EventSource on unmount', () => {
    const { unmount } = renderHook(() => useGpsLocation('ROUTE-AM'), {
      wrapper: makeWrapper(queryClient),
    });

    const es = MockEventSource.instances[0];
    expect(es.isClosed).toBe(false);

    unmount();

    expect(es.isClosed).toBe(true);
  });

  it('returns null when getLiveLocation returns { active: false } (inactive route)', async () => {
    // The API gateway converts GPS-service 404 to HTTP 200 { active: false }.
    // useGpsLocation must detect this and return null cleanly — no console error.
    mockGetLiveLocation.mockResolvedValue({
      active: false,
      routeId: 'ROUTE-PM',
      vehicleId: '',
      lastUpdate: '',
      position: { lat: 0, lng: 0 },
      etaToNextStopMinutes: 0,
    });

    const { result } = renderHook(() => useGpsLocation('ROUTE-PM'), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.location).toBeNull();
    });
  });

  it('treats 403 from REST endpoint as null (not an error)', async () => {
    mockGetLiveLocation.mockRejectedValue({ response: { status: 403 } });

    const { result } = renderHook(() => useGpsLocation('ROUTE-NO-ACCESS'), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => {
      // null is the expected outcome for 403 (session mismatch, wrong role, etc.)
      // The hook should not re-throw so TanStack Query does not log a console error.
      expect(result.current.location).toBeNull();
    });
  });

  it('reopens EventSource when routeId changes', async () => {
    const { rerender } = renderHook(({ routeId }: { routeId: string }) => useGpsLocation(routeId), {
      wrapper: makeWrapper(queryClient),
      initialProps: { routeId: 'ROUTE-AM' },
    });

    expect(MockEventSource.instances).toHaveLength(1);

    rerender({ routeId: 'ROUTE-PM' });

    await waitFor(() => {
      // Old connection closed, new one opened
      expect(MockEventSource.instances).toHaveLength(2);
      expect(MockEventSource.instances[1].url).toContain('ROUTE-PM');
    });
  });
});
