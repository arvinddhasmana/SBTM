import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MapPage from './Map';
import * as AuthContext from '../context/AuthContext';

// Mock AuthContext
vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

// Mock parentApi
vi.mock('../services/api', () => ({
  parentApi: {
    getChildren: vi.fn().mockResolvedValue([]),
    getLiveLocation: vi.fn().mockResolvedValue(null),
    getActiveAlert: vi.fn().mockResolvedValue(null),
    getRouteDetails: vi.fn().mockResolvedValue(null),
  },
}));

// Mock useGpsLocation
vi.mock('../hooks/useGpsLocation', () => ({
  useGpsLocation: vi.fn(() => ({ location: null, sseConnected: false })),
}));

// Mock useAlerts
vi.mock('../hooks/useAlerts', () => ({
  useAlerts: vi.fn(() => ({ alerts: [], error: null, refresh: vi.fn() })),
}));

// Mock polyline util
vi.mock('../utils/polyline', () => ({
  decodePolyline: vi.fn(() => []),
}));

// Mock query-keys
vi.mock('../services/query-keys', () => ({
  queryKeys: {
    alerts: { active: (id?: string) => ['alerts', 'active', id] },
    location: { live: (id: string) => ['location', 'live', id] },
    route: { details: (id: string) => ['route', 'details', id] },
    children: { all: ['children'] },
  },
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  ArrowLeft: () => 'ArrowLeftIcon',
  Navigation: () => 'NavigationIcon',
  RotateCcw: () => 'RotateCcwIcon',
}));

// Mock react-leaflet and leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: any) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
  Polyline: () => <div data-testid="polyline" />,
  useMap: () => ({
    fitBounds: vi.fn(),
  }),
}));

vi.mock('leaflet', () => ({
  default: {
    icon: vi.fn(() => ({})),
    divIcon: vi.fn(() => ({})),
    latLngBounds: vi.fn(() => ({ isValid: () => true })),
    Marker: { prototype: { options: { icon: {} } } },
  },
  icon: vi.fn(() => ({})),
  divIcon: vi.fn(() => ({})),
  latLngBounds: vi.fn(() => ({ isValid: () => true })),
  Marker: { prototype: { options: { icon: {} } } },
}));

// Mock leaflet image imports
vi.mock('leaflet/dist/images/marker-icon.png', () => ({ default: 'marker-icon.png' }));
vi.mock('leaflet/dist/images/marker-shadow.png', () => ({ default: 'marker-shadow.png' }));

// Disable EventSource
const originalEventSource = globalThis.EventSource;
beforeEach(() => {
  (globalThis as any).EventSource = undefined;
});
afterEach(() => {
  (globalThis as any).EventSource = originalEventSource;
});

function renderWithProviders(ui: React.ReactElement, { route = '/' } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Map Page', () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it('renders Loading when no child is available and user has no children', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: '1', name: 'Jane', email: 'jane@test.com', children: [] },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    renderWithProviders(<MapPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders child name and route info when child data is available', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: {
        id: '1',
        name: 'Jane',
        email: 'jane@test.com',
        children: [
          {
            id: 'c1',
            name: 'Alice',
            schoolName: 'Greenfield Elementary',
            routeId: 'route-am',
            amRouteId: 'route-am',
            pmRouteId: 'route-pm',
            vehicleId: 'bus-1',
            status: 'on_bus' as const,
          },
        ],
      },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    renderWithProviders(<MapPage />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders the map container', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: {
        id: '1',
        name: 'Jane',
        email: 'jane@test.com',
        children: [
          {
            id: 'c1',
            name: 'Alice',
            schoolName: 'Greenfield Elementary',
            routeId: 'route-am',
            amRouteId: 'route-am',
            pmRouteId: 'route-pm',
            vehicleId: 'bus-1',
            status: 'on_bus' as const,
          },
        ],
      },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    renderWithProviders(<MapPage />);

    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('shows "Route is not currently active" when bus is not live', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: {
        id: '1',
        name: 'Jane',
        email: 'jane@test.com',
        children: [
          {
            id: 'c1',
            name: 'Alice',
            schoolName: 'Greenfield Elementary',
            routeId: 'route-am',
            amRouteId: 'route-am',
            pmRouteId: 'route-pm',
            vehicleId: 'bus-1',
            status: 'at_home' as const,
          },
        ],
      },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    renderWithProviders(<MapPage />);

    expect(screen.getByText('Route is not currently active.')).toBeInTheDocument();
  });
});
