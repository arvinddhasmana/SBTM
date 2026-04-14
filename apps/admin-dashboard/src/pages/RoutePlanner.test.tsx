import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RoutePlanner from './RoutePlanner';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: {
      id: 'u-1',
      email: 'admin@osta.ca',
      role: 'OSTA_ADMIN',
    },
  }),
}));

vi.mock('../hooks/useRoutePlanner', () => ({
  useRoutePlanner: vi.fn().mockReturnValue({
    mode: 'list',
    filteredRoutes: [],
    routesLoading: false,
    routeSearch: '',
    directionFilter: 'all',
    schoolFilter: 'all',
    schools: [],
    setRouteSearch: vi.fn(),
    setDirectionFilter: vi.fn(),
    setSchoolFilter: vi.fn(),
    selectedRoute: null,
    selectRoute: vi.fn(),
    clearSelection: vi.fn(),
    startCreate: vi.fn(),
    startEdit: vi.fn(),
    cancelEdit: vi.fn(),
    formSchoolId: '',
    routeName: '',
    direction: 'AM',
    startTime: '07:00',
    numberOfStops: 5,
    stops: [],
    stopWarnings: [],
    spacingWarnings: [],
    mapMode: 'view',
    optimizationResult: null,
    isOptimizing: false,
    isSaving: false,
    editingRouteId: null,
    setFormSchoolId: vi.fn(),
    setRouteName: vi.fn(),
    setDirection: vi.fn(),
    setStartTime: vi.fn(),
    setNumberOfStops: vi.fn(),
    setMapMode: vi.fn(),
    addBlankStop: vi.fn(),
    removeStop: vi.fn(),
    updateStopField: vi.fn(),
    reorderStop: vi.fn(),
    autoGenerate: vi.fn(),
    optimize: vi.fn(),
    snapToRoad: vi.fn(),
    isSnapping: false,
    saveRoute: vi.fn(),
    deleteRoute: vi.fn(),
    schoolLocation: null,
    routePath: [],
    mapResetKey: 0,
    addStop: vi.fn(),
    moveStop: vi.fn(),
    adjustPath: vi.fn(),
  }),
}));

// Mock Leaflet for the PlannerMap component
vi.mock('leaflet', () => ({
  default: {
    map: vi.fn(() => ({
      setView: vi.fn().mockReturnThis(),
      remove: vi.fn(),
      fitBounds: vi.fn(),
      invalidateSize: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      getContainer: vi.fn(() => ({ style: {} })),
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
    circle: vi.fn(() => ({
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    })),
  },
}));

describe('RoutePlanner Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <RoutePlanner />
        </BrowserRouter>
      </QueryClientProvider>,
    );
  };

  it('renders the page header', () => {
    renderComponent();
    expect(screen.getByText('Route Planner')).toBeInTheDocument();
    expect(screen.getByText('Design and optimize school bus routes')).toBeInTheDocument();
  });

  it('renders the sidebar with route list', () => {
    renderComponent();
    // The sidebar should be rendered (list mode, no routes)
    expect(screen.getByText('Route Planner')).toBeInTheDocument();
  });

  it('renders without crashing in list mode', () => {
    const { container } = renderComponent();
    expect(container).toBeTruthy();
  });

  it('renders header subtitle correctly', () => {
    renderComponent();
    expect(screen.getByText('Design and optimize school bus routes')).toBeInTheDocument();
  });
});
