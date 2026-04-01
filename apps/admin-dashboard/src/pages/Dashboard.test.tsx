import { render, screen, waitFor } from '@testing-library/react';
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

// Mock the APIs
vi.mock('../services/api', () => ({
  alertsApi: {
    getActiveAlerts: vi.fn().mockResolvedValue([]),
  },
  routesApi: {
    getActiveRoutes: vi.fn().mockResolvedValue([]),
    getAllLiveLocations: vi.fn().mockResolvedValue([]),
  },
  presenceApi: {
    getAllBoardedStudents: vi.fn().mockResolvedValue([]),
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
      remove: vi.fn(),
    })),
    divIcon: vi.fn(),
    latLngBounds: vi.fn(),
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

  it('renders stat cards after loading', async () => {
    renderDashboard();

    await waitFor(
      () => {
        expect(screen.getByText('Routes')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });
});
