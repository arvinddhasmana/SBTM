import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRoutePlanner, MIN_STOP_SPACING_KM, MAX_ROUTE_RADIUS_KM } from './useRoutePlanner';
import { haversineDistance } from '../utils/geo';

// --- Mock data ---
const { mockRoutes, mockSchools } = vi.hoisted(() => ({
  mockRoutes: [
    {
      id: 'R1',
      name: 'Route Alpha',
      schoolId: 'SCH-001',
      schoolName: 'Test School',
      direction: 'AM' as const,
      startTime: '07:00',
      estimatedDuration: 30,
      status: 'active',
      path: [
        [45.39, -75.7],
        [45.38, -75.69],
      ],
      stops: [
        {
          id: 'S1',
          routeId: 'R1',
          sequence: 1,
          address: 'Stop A',
          location: 'POINT(-75.700 45.390)',
        },
        {
          id: 'S2',
          routeId: 'R1',
          sequence: 2,
          address: 'Stop B',
          location: 'POINT(-75.690 45.380)',
        },
      ],
    },
    {
      id: 'R2',
      name: 'Route Beta',
      schoolId: 'SCH-002',
      schoolName: 'Other School',
      direction: 'PM' as const,
      startTime: '15:00',
      estimatedDuration: 25,
      status: 'active',
      path: [],
      stops: [],
    },
  ],
  mockSchools: [
    { id: 'SCH-001', name: 'Test School', boardId: 'B1', location: { lat: 45.3876, lng: -75.696 } },
    { id: 'SCH-002', name: 'Other School', boardId: 'B2', location: { lat: 45.344, lng: -75.91 } },
  ],
}));

vi.mock('../services/api', () => ({
  routesApi: {
    getAllRoutes: vi.fn().mockResolvedValue(mockRoutes),
    optimizeRoute: vi.fn().mockResolvedValue({
      optimizedStops: [],
      polylineGeoJson: null,
      totalDistance: 10,
      totalDuration: 30,
    }),
    snapToRoad: vi.fn().mockResolvedValue({
      polylineGeoJson: {
        type: 'LineString',
        coordinates: [
          [-75.7, 45.39],
          [-75.69, 45.38],
        ],
      },
      totalDistance: 1.5,
      totalDuration: 5,
    }),
    createRoute: vi.fn().mockResolvedValue({ id: 'NEW-1' }),
    updateRoute: vi.fn().mockResolvedValue({ id: 'R1' }),
    deleteRoute: vi.fn().mockResolvedValue(undefined),
    getRouteShape: vi.fn().mockResolvedValue([]),
  },
  organizationApi: {
    listSchools: vi.fn().mockResolvedValue(mockSchools),
  },
  useMock: true,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 'u1', email: 'admin@test.ca', role: 'BOARD_ADMIN', boardId: 'B1' },
  }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useRoutePlanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in list mode', () => {
    const { result } = renderHook(() => useRoutePlanner(), { wrapper: createWrapper() });
    expect(result.current.mode).toBe('list');
    expect(result.current.mapMode).toBe('view');
  });

  it('loads routes and schools', async () => {
    const { result } = renderHook(() => useRoutePlanner(), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.filteredRoutes.length).toBe(2);
      expect(result.current.schools.length).toBe(2);
    });
  });

  it('filters routes by direction', async () => {
    const { result } = renderHook(() => useRoutePlanner(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.filteredRoutes.length).toBe(2));

    act(() => result.current.setDirectionFilter('AM'));
    expect(result.current.filteredRoutes.length).toBe(1);
    expect(result.current.filteredRoutes[0].name).toBe('Route Alpha');
  });

  it('filters routes by text search', async () => {
    const { result } = renderHook(() => useRoutePlanner(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.filteredRoutes.length).toBe(2));

    act(() => result.current.setRouteSearch('beta'));
    expect(result.current.filteredRoutes.length).toBe(1);
    expect(result.current.filteredRoutes[0].name).toBe('Route Beta');
  });

  it('filters routes by school', async () => {
    const { result } = renderHook(() => useRoutePlanner(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.filteredRoutes.length).toBe(2));

    act(() => result.current.setSchoolFilter('SCH-002'));
    expect(result.current.filteredRoutes.length).toBe(1);
    expect(result.current.filteredRoutes[0].schoolId).toBe('SCH-002');
  });

  it('transitions to create mode and back', async () => {
    const { result } = renderHook(() => useRoutePlanner(), { wrapper: createWrapper() });

    act(() => result.current.startCreate());
    expect(result.current.mode).toBe('create');

    act(() => result.current.cancelEdit());
    expect(result.current.mode).toBe('list');
  });

  it('transitions to edit mode and pre-populates form', async () => {
    const { result } = renderHook(() => useRoutePlanner(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.filteredRoutes.length).toBe(2));

    const route = result.current.filteredRoutes[0];
    await act(async () => {
      await result.current.startEdit(route);
    });

    expect(result.current.mode).toBe('edit');
    expect(result.current.routeName).toBe('Route Alpha');
    expect(result.current.direction).toBe('AM');
    expect(result.current.formSchoolId).toBe('SCH-001');
    expect(result.current.stops.length).toBe(2);
    expect(result.current.editingRouteId).toBe('R1');
  });

  it('adds a stop from map click', () => {
    const { result } = renderHook(() => useRoutePlanner(), { wrapper: createWrapper() });
    act(() => result.current.startCreate());

    act(() => result.current.addStop(45.39, -75.7, 'Map Stop'));
    expect(result.current.stops.length).toBe(1);
    expect(result.current.stops[0].lat).toBeCloseTo(45.39, 4);
    expect(result.current.stops[0].lng).toBeCloseTo(-75.7, 4);
    expect(result.current.stops[0].address).toBe('Map Stop');
    expect(result.current.stops[0].sequence).toBe(1);
  });

  it('adds a blank stop', () => {
    const { result } = renderHook(() => useRoutePlanner(), { wrapper: createWrapper() });
    act(() => result.current.startCreate());

    act(() => result.current.addBlankStop());
    expect(result.current.stops.length).toBe(1);
    expect(result.current.stops[0].lat).toBe(0);
    expect(result.current.stops[0].lng).toBe(0);
  });

  it('removes a stop and re-sequences', () => {
    const { result } = renderHook(() => useRoutePlanner(), { wrapper: createWrapper() });
    act(() => result.current.startCreate());

    act(() => {
      result.current.addStop(45.39, -75.7);
      result.current.addStop(45.38, -75.69);
      result.current.addStop(45.37, -75.68);
    });
    expect(result.current.stops.length).toBe(3);

    const middleId = result.current.stops[1].id;
    act(() => result.current.removeStop(middleId));

    expect(result.current.stops.length).toBe(2);
    expect(result.current.stops[0].sequence).toBe(1);
    expect(result.current.stops[1].sequence).toBe(2);
  });

  it('moves a stop and updates coordinates', () => {
    const { result } = renderHook(() => useRoutePlanner(), { wrapper: createWrapper() });
    act(() => result.current.startCreate());

    act(() => result.current.addStop(45.39, -75.7));
    const stopId = result.current.stops[0].id;

    act(() => result.current.moveStop(stopId, 45.4, -75.71));
    expect(result.current.stops[0].lat).toBeCloseTo(45.4, 4);
    expect(result.current.stops[0].lng).toBeCloseTo(-75.71, 4);
  });

  it('reorders stops', () => {
    const { result } = renderHook(() => useRoutePlanner(), { wrapper: createWrapper() });
    act(() => result.current.startCreate());

    act(() => {
      result.current.addStop(45.39, -75.7, 'First');
      result.current.addStop(45.38, -75.69, 'Second');
      result.current.addStop(45.37, -75.68, 'Third');
    });

    const firstId = result.current.stops[0].id;
    act(() => result.current.reorderStop(firstId, 2)); // move first to index 2

    expect(result.current.stops[0].address).toBe('Second');
    expect(result.current.stops[1].address).toBe('Third');
    expect(result.current.stops[2].address).toBe('First');
    // Re-sequenced
    expect(result.current.stops[0].sequence).toBe(1);
    expect(result.current.stops[1].sequence).toBe(2);
    expect(result.current.stops[2].sequence).toBe(3);
  });

  it('adjustPath calls snap-to-road without adding a stop', async () => {
    const { result } = renderHook(() => useRoutePlanner(), { wrapper: createWrapper() });
    act(() => result.current.startCreate());

    act(() => {
      result.current.addStop(45.39, -75.7, 'A');
      result.current.addStop(45.37, -75.68, 'B');
    });

    await act(async () => {
      await result.current.adjustPath(0, 45.38, -75.69);
    });
    // Should NOT add a new stop — stops count stays at 2
    expect(result.current.stops.length).toBe(2);
  });

  it('updates stop field', () => {
    const { result } = renderHook(() => useRoutePlanner(), { wrapper: createWrapper() });
    act(() => result.current.startCreate());
    act(() => result.current.addStop(45.39, -75.7, 'Old'));

    const stopId = result.current.stops[0].id;
    act(() => result.current.updateStopField(stopId, 'address', 'New Address'));
    expect(result.current.stops[0].address).toBe('New Address');

    act(() => result.current.updateStopField(stopId, 'lat', '45.5'));
    expect(result.current.stops[0].lat).toBeCloseTo(45.5, 1);
  });

  it('computes radius warnings for stops beyond MAX_ROUTE_RADIUS_KM', async () => {
    const { result } = renderHook(() => useRoutePlanner(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.schools.length).toBe(2));

    act(() => {
      result.current.startCreate();
      result.current.setFormSchoolId('SCH-001');
    });

    // Add a stop far from school (>5km)
    act(() => result.current.addStop(45.5, -75.5)); // ~15km away
    expect(result.current.stopWarnings.size).toBe(1);

    // Add a close stop
    act(() => result.current.addStop(45.388, -75.696)); // very close to school
    expect(result.current.stopWarnings.size).toBe(1); // only first stop warned
  });

  it('computes spacing warnings for consecutive stops < 200m apart', () => {
    const { result } = renderHook(() => useRoutePlanner(), { wrapper: createWrapper() });
    act(() => result.current.startCreate());

    // Two stops ~50m apart
    act(() => {
      result.current.addStop(45.3876, -75.696, 'A');
      result.current.addStop(45.3877, -75.696, 'B'); // ~11m away
    });

    expect(result.current.spacingWarnings.size).toBe(1);
  });

  it('autoGenerate creates stops around school', async () => {
    const { result } = renderHook(() => useRoutePlanner(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.schools.length).toBe(2));

    act(() => {
      result.current.startCreate();
      result.current.setFormSchoolId('SCH-001');
      result.current.setNumberOfStops(5);
    });

    await act(async () => {
      await result.current.autoGenerate();
    });

    expect(result.current.stops.length).toBeGreaterThanOrEqual(2);
    // All stops within radius
    const school = mockSchools[0].location!;
    result.current.stops.forEach((stop) => {
      if (stop.lat !== 0 && stop.lng !== 0) {
        const dist = haversineDistance(stop.lat, stop.lng, school.lat, school.lng);
        expect(dist).toBeLessThanOrEqual(MAX_ROUTE_RADIUS_KM);
      }
    });
  });

  it('mapMode toggles between view and add-stop', () => {
    const { result } = renderHook(() => useRoutePlanner(), { wrapper: createWrapper() });
    expect(result.current.mapMode).toBe('view');

    act(() => result.current.setMapMode('add-stop'));
    expect(result.current.mapMode).toBe('add-stop');

    act(() => result.current.setMapMode('view'));
    expect(result.current.mapMode).toBe('view');
  });

  it('selectRoute sets selected route', async () => {
    const { result } = renderHook(() => useRoutePlanner(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.filteredRoutes.length).toBe(2));

    await act(async () => {
      await result.current.selectRoute(result.current.filteredRoutes[0]);
    });

    expect(result.current.selectedRoute?.id).toBe('R1');
    expect(result.current.mode).toBe('list');
  });

  it('clearSelection clears selected route', async () => {
    const { result } = renderHook(() => useRoutePlanner(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.filteredRoutes.length).toBe(2));

    await act(async () => {
      await result.current.selectRoute(result.current.filteredRoutes[0]);
    });
    expect(result.current.selectedRoute).not.toBeNull();

    act(() => result.current.clearSelection());
    expect(result.current.selectedRoute).toBeNull();
  });

  it('routePath returns straight-line fallback when no optimization', () => {
    const { result } = renderHook(() => useRoutePlanner(), { wrapper: createWrapper() });
    act(() => {
      result.current.startCreate();
      result.current.addStop(45.39, -75.7);
      result.current.addStop(45.38, -75.69);
    });

    expect(result.current.routePath.length).toBe(2);
    expect(result.current.routePath[0][0]).toBeCloseTo(45.39, 4);
  });

  it('mapResetKey increments on selectRoute and startCreate', async () => {
    const { result } = renderHook(() => useRoutePlanner(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.filteredRoutes.length).toBe(2));

    const initial = result.current.mapResetKey;

    act(() => result.current.startCreate());
    expect(result.current.mapResetKey).toBe(initial + 1);

    await act(async () => {
      await result.current.selectRoute(result.current.filteredRoutes[0]);
    });
    expect(result.current.mapResetKey).toBe(initial + 2);
  });

  it('snapToRoad is exposed and callable', async () => {
    const { result } = renderHook(() => useRoutePlanner(), { wrapper: createWrapper() });
    act(() => {
      result.current.startCreate();
      result.current.addStop(45.39, -75.7, 'A');
      result.current.addStop(45.38, -75.69, 'B');
    });

    await act(async () => {
      await result.current.snapToRoad();
    });

    // Optimization result should be set from snap
    expect(result.current.isSnapping).toBe(false);
  });
});
