import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import Routes from './Routes';

const { mockRoutes, mockLocations } = vi.hoisted(() => ({
  mockRoutes: [
    {
      id: 'R-101',
      name: 'Route 101',
      direction: 'AM',
      status: 'active',
      schoolId: 's1',
      stops: [{ id: 'stop-1', name: 'Stop A' }],
      vehicleId: 'BUS-01',
    },
    {
      id: 'R-102',
      name: 'Route 102',
      direction: 'PM',
      status: 'inactive',
      schoolId: 's1',
      stops: [],
      vehicleId: 'BUS-02',
    },
  ],
  mockLocations: [
    {
      routeId: 'R-101',
      vehicleId: 'BUS-01',
      lastUpdate: new Date().toISOString(),
      position: { lat: 45.39, lng: -75.71 },
      etaToNextStopMinutes: 3,
      deviationFlag: false,
      status: 'normal',
    },
  ],
}));

vi.mock('../services/api', () => ({
  routesApi: {
    getAllRoutes: vi.fn(() => Promise.resolve(mockRoutes)),
    getAllLiveLocations: vi.fn(() => Promise.resolve(mockLocations)),
  },
}));

// Mock Leaflet and map components
vi.mock('leaflet', () => ({
  default: {
    map: vi.fn(() => ({
      setView: vi.fn().mockReturnThis(),
      remove: vi.fn(),
      fitBounds: vi.fn(),
      invalidateSize: vi.fn(),
    })),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
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

vi.mock('../utils/polyline', () => ({
  decodePolyline: vi.fn().mockReturnValue([]),
}));

describe('Routes Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderRoutes = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Routes />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>,
    );
  };

  it('shows loading state initially', () => {
    renderRoutes();
    expect(screen.getByText(/Loading routes/i)).toBeInTheDocument();
  });

  it('renders route monitoring header after loading', async () => {
    renderRoutes();
    await waitFor(() => {
      expect(screen.getByText('Route Monitoring')).toBeInTheDocument();
    });
  });

  it('shows active routes count in subtitle', async () => {
    renderRoutes();
    await waitFor(() => {
      expect(screen.getByText('1 active routes')).toBeInTheDocument();
    });
  });

  it('renders All Routes card', async () => {
    renderRoutes();
    await waitFor(() => {
      expect(screen.getByText('All Routes')).toBeInTheDocument();
    });
  });
});
