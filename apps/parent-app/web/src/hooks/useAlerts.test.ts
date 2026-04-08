import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAlerts } from './useAlerts';
import { parentApi } from '../services/api';

vi.mock('../services/api', () => ({
  parentApi: {
    getActiveAlert: vi.fn(),
  },
}));

// Disable EventSource in tests to avoid SSE side-effects
const originalEventSource = globalThis.EventSource;
beforeEach(() => {
  (globalThis as any).EventSource = undefined;
});
afterEach(() => {
  (globalThis as any).EventSource = originalEventSource;
  cleanup();
  vi.resetAllMocks();
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useAlerts', () => {
  it('returns empty array when no routeId is provided', () => {
    const { result } = renderHook(() => useAlerts(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.alerts).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('fetches and returns active alerts', async () => {
    const mockAlert = {
      id: 'alert-1',
      routeId: 'ROUTE-1',
      vehicleId: 'BUS-01',
      eventType: 'PANIC_BUTTON',
      message: "Emergency reported on your child's bus.",
      createdAt: '2026-04-04T10:00:00Z',
      alertActive: true,
    };

    vi.mocked(parentApi.getActiveAlert).mockResolvedValue(mockAlert);

    const { result } = renderHook(() => useAlerts('ROUTE-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.alerts.length).toBeGreaterThan(0);
    });

    expect(result.current.alerts[0]).toEqual(mockAlert);
    expect(result.current.error).toBeNull();
  });

  it('returns empty array when no active alert exists', async () => {
    vi.mocked(parentApi.getActiveAlert).mockResolvedValue(null);

    const { result } = renderHook(() => useAlerts('ROUTE-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(parentApi.getActiveAlert).toHaveBeenCalled();
    });

    expect(result.current.alerts).toEqual([]);
  });

  it('sets error when query fails', async () => {
    vi.mocked(parentApi.getActiveAlert).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAlerts('ROUTE-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Unable to fetch alert status.');
    });
  });

  it('treats 403 response as handled (returns empty, no throw)', async () => {
    const forbiddenError = { response: { status: 403 } };
    vi.mocked(parentApi.getActiveAlert).mockRejectedValue(forbiddenError);

    const { result } = renderHook(() => useAlerts('ROUTE-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(parentApi.getActiveAlert).toHaveBeenCalled();
    });

    // Should return empty array without an error state (not throwing to TanStack)
    expect(result.current.alerts).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('treats 404 response as handled (returns empty, no throw)', async () => {
    const notFoundError = { response: { status: 404 } };
    vi.mocked(parentApi.getActiveAlert).mockRejectedValue(notFoundError);

    const { result } = renderHook(() => useAlerts('ROUTE-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(parentApi.getActiveAlert).toHaveBeenCalled();
    });

    expect(result.current.alerts).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('returns successful alerts when some routes 403 and others succeed', async () => {
    const mockAlert = {
      id: 'alert-2',
      routeId: 'ROUTE-2',
      vehicleId: 'BUS-01',
      eventType: 'PANIC_BUTTON',
      message: 'Emergency.',
      createdAt: '2026-04-08T09:00:00Z',
      alertActive: true,
    };
    vi.mocked(parentApi.getActiveAlert)
      .mockRejectedValueOnce({ response: { status: 403 } }) // ROUTE-1 fails
      .mockResolvedValueOnce(mockAlert); // ROUTE-2 succeeds

    const { result } = renderHook(() => useAlerts(['ROUTE-1', 'ROUTE-2']), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.alerts.length).toBe(1);
    });

    expect(result.current.alerts[0].routeId).toBe('ROUTE-2');
    expect(result.current.error).toBeNull();
  });
});
