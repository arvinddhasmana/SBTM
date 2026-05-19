import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import Dashboard from './Dashboard';

// Mock ResizeObserver for JSDOM
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

// vi.hoisted ensures these are available when vi.mock factory runs (hoisted)
const { mockAlerts, mockLocations, mockRoutes, mockStudents } = vi.hoisted(() => ({
  mockAlerts: [
    {
      id: 'a1',
      schoolId: 's1',
      routeId: 'ROUTE-SingleBus-PM',
      vehicleId: 'BUS-01',
      driverId: 'd1',
      timestamp: new Date().toISOString(),
      lat: 45.39,
      lng: -75.71,
      eventType: 'PANIC_BUTTON',
      status: 'PENDING_CONFIRMATION',
      tier: 'TIER_1',
      description: 'Panic button pressed',
    },
    {
      id: 'a2',
      schoolId: 's1',
      routeId: 'ROUTE-SingleBus-AM',
      vehicleId: 'BUS-01',
      driverId: 'd1',
      timestamp: new Date().toISOString(),
      lat: 45.39,
      lng: -75.71,
      eventType: 'LATE_ARRIVAL',
      status: 'ACTIVE',
      tier: 'TIER_2',
      description: 'Late arrival',
    },
  ],
  mockLocations: [
    {
      routeId: 'ROUTE-SingleBus-PM',
      vehicleId: 'BUS-01',
      lastUpdate: new Date().toISOString(),
      position: { lat: 45.39, lng: -75.71 },
      etaToNextStopMinutes: 5,
      deviationFlag: false,
      status: 'normal',
    },
  ],
  mockRoutes: [
    {
      id: 'ROUTE-SingleBus-PM',
      name: 'SingleBus PM',
      schoolId: 's1',
      schoolName: 'Greenfield Elementary',
      direction: 'PM',
      vehicleId: 'BUS-01',
      startTime: '15:00',
      estimatedDuration: 60,
      stops: [],
      status: 'active',
    },
    {
      id: 'ROUTE-SingleBus-AM',
      name: 'SingleBus AM',
      schoolId: 's1',
      schoolName: 'Greenfield Elementary',
      direction: 'AM',
      vehicleId: 'BUS-01',
      startTime: '07:00',
      estimatedDuration: 60,
      stops: [],
      status: 'active',
    },
  ],
  mockStudents: [
    {
      studentId: 's1',
      name: 'Alice Smith',
      status: 'BOARDED',
      lastSeen: new Date().toISOString(),
      routeId: 'ROUTE-SingleBus-PM',
      vehicleId: 'BUS-01',
    },
  ],
}));

// Mock the APIs
vi.mock('../services/api', () => ({
  alertsApi: {
    getActiveAlerts: vi.fn().mockResolvedValue(mockAlerts),
  },
  routesApi: {
    getActiveRoutes: vi.fn().mockResolvedValue(mockRoutes),
    getAllLiveLocations: vi.fn().mockResolvedValue(mockLocations),
    getRouteById: vi.fn().mockResolvedValue(mockRoutes[0]),
  },
  presenceApi: {
    getAllBoardedStudents: vi.fn().mockResolvedValue(mockStudents),
  },
  useMock: false,
}));

// Mock Leaflet
vi.mock('leaflet', () => ({
  default: {
    map: vi.fn(() => ({
      setView: vi.fn().mockReturnThis(),
      remove: vi.fn(),
      fitBounds: vi.fn(),
      invalidateSize: vi.fn(),
    })),
    tileLayer: vi.fn(() => ({
      addTo: vi.fn(),
    })),
    marker: vi.fn(() => ({
      addTo: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      bindPopup: vi.fn().mockReturnThis(),
      setLatLng: vi.fn().mockReturnThis(),
      setIcon: vi.fn().mockReturnThis(),
      setZIndexOffset: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    })),
    polyline: vi.fn(() => ({
      addTo: vi.fn().mockReturnThis(),
      getBounds: vi.fn().mockReturnValue({
        extend: vi.fn().mockReturnThis(),
        isValid: vi.fn().mockReturnValue(true),
      }),
      remove: vi.fn(),
    })),
    divIcon: vi.fn(),
    latLngBounds: vi.fn(() => ({
      extend: vi.fn().mockReturnThis(),
      isValid: vi.fn().mockReturnValue(true),
    })),
  },
}));

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDashboard = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Dashboard />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>,
    );
  };

  it('shows loading state initially', () => {
    renderDashboard();
    expect(screen.getByText(/Initialising Tactical Command/i)).toBeInTheDocument();
  });

  it('renders dashboard content after loading', async () => {
    renderDashboard();
    await waitFor(
      () => {
        expect(screen.getByText('Tactical Overview')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('renders fleet metrics bar with stat cards after loading', async () => {
    renderDashboard();
    await waitFor(
      () => {
        const metricsBar = screen.getByTestId('fleet-metrics');
        expect(metricsBar).toBeInTheDocument();
        expect(within(metricsBar).getByTestId('stat-routes')).toBeInTheDocument();
        expect(within(metricsBar).getByTestId('stat-buses')).toBeInTheDocument();
        expect(within(metricsBar).getByTestId('stat-boarded')).toBeInTheDocument();
        expect(within(metricsBar).getByTestId('stat-alerts')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('renders mode toggle with Info and Action buttons', async () => {
    renderDashboard();
    await waitFor(
      () => {
        expect(screen.getByTestId('mode-toggle')).toBeInTheDocument();
        expect(screen.getByTestId('mode-info')).toBeInTheDocument();
        expect(screen.getByTestId('mode-action')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('renders 3 floating panels (Routes, Alerts, Passengers — no Buses panel)', async () => {
    renderDashboard();
    await waitFor(
      () => {
        expect(screen.getByText('Tactical Alerts')).toBeInTheDocument();
        expect(screen.getByText('Passenger Feed')).toBeInTheDocument();
        const routesPanelTitle = screen.getAllByText('Routes').find((el) => el.tagName === 'H3');
        expect(routesPanelTitle).toBeInTheDocument();
        // Buses panel should NOT be present as a floating panel
        const busesPanelTitle = screen.getAllByText('Buses').find((el) => el.tagName === 'H3');
        expect(busesPanelTitle).toBeUndefined();
      },
      { timeout: 3000 },
    );
  });

  it('renders search inputs in floating panels', async () => {
    renderDashboard();
    await waitFor(
      () => {
        const searchInputs = screen.getAllByTestId('panel-search');
        expect(searchInputs.length).toBe(2); // routes, passengers
      },
      { timeout: 3000 },
    );
  });

  it('renders tier filter in alerts panel', async () => {
    renderDashboard();
    await waitFor(
      () => {
        expect(screen.getByTestId('tier-filter')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('filters alerts by tier when tier filter is changed', async () => {
    renderDashboard();

    await waitFor(
      () => {
        expect(screen.getByTestId('tier-filter')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    expect(screen.getByText('Panic button pressed')).toBeInTheDocument();
    expect(screen.getByText('Late arrival')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('tier-filter'), { target: { value: 'TIER_1' } });

    expect(screen.getByText('Panic button pressed')).toBeInTheDocument();
    expect(screen.queryByText('Late arrival')).not.toBeInTheDocument();
  });

  it('switches to action mode and filters to actionable alerts', async () => {
    renderDashboard();

    await waitFor(
      () => {
        expect(screen.getByTestId('mode-action')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    expect(screen.getByText('Panic button pressed')).toBeInTheDocument();
    expect(screen.getByText('Late arrival')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('mode-action'));

    // Both should still be visible since both have actionable statuses
    await waitFor(() => {
      expect(screen.getByText('Panic button pressed')).toBeInTheDocument();
    });
  });

  it('shows correct stat numbers for each mode', async () => {
    renderDashboard();

    await waitFor(
      () => {
        const metricsBar = screen.getByTestId('fleet-metrics');
        expect(within(metricsBar).getByTestId('stat-routes').textContent).toBe('2');
        expect(within(metricsBar).getByTestId('stat-alerts').textContent).toBe('2');
      },
      { timeout: 3000 },
    );

    fireEvent.click(screen.getByTestId('mode-action'));

    await waitFor(() => {
      const metricsBar = screen.getByTestId('fleet-metrics');
      expect(within(metricsBar).getByTestId('stat-alerts').textContent).toBe('2');
    });
  });

  it('filters passengers by search', async () => {
    renderDashboard();

    await waitFor(
      () => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const searchInputs = screen.getAllByTestId('panel-search');
    const passengerSearch = searchInputs[1]; // second search is passengers

    fireEvent.change(passengerSearch, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
    });
  });

  it('route search matches school name', async () => {
    renderDashboard();

    await waitFor(
      () => {
        expect(screen.getAllByText('SingleBus PM').length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 3000 },
    );

    const searchInputs = screen.getAllByTestId('panel-search');
    const routeSearchInput = searchInputs[0];

    fireEvent.change(routeSearchInput, { target: { value: 'Greenfield' } });

    await waitFor(() => {
      expect(screen.getAllByText('SingleBus PM').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('route search matches vehicle ID', async () => {
    renderDashboard();

    await waitFor(
      () => {
        expect(screen.getAllByText('SingleBus PM').length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 3000 },
    );

    const searchInputs = screen.getAllByTestId('panel-search');
    const routeSearchInput = searchInputs[0];

    fireEvent.change(routeSearchInput, { target: { value: 'BUS-01' } });

    await waitFor(() => {
      expect(screen.getAllByText('SingleBus PM').length).toBeGreaterThanOrEqual(1);
    });
  });
});
