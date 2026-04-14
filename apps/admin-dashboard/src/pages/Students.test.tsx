import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import Students from './Students';

const { mockStats, mockEvents, mockStudents } = vi.hoisted(() => ({
  mockStats: {
    totalStudents: 42,
    boarded: 30,
    alighted: 10,
    unknown: 2,
    byRoute: [],
  },
  mockEvents: {
    items: [
      {
        id: 'ev-1',
        firstName: 'Alice',
        lastName: 'Smith',
        grade: 'Grade 3',
        eventType: 'BOARD' as const,
        routeId: 'R-101',
        vehicleId: 'BUS-01',
        timestamp: new Date().toISOString(),
      },
    ],
    total: 1,
  },
  mockStudents: [
    {
      id: 's-1',
      first_name: 'Bob',
      last_name: 'Jones',
      grade: 'Grade 5',
      address: '123 Main St',
      status: 'ENROLLED',
      am_route_id: 'R-101',
      pm_route_id: null,
    },
    {
      id: 's-2',
      first_name: 'Carol',
      last_name: 'Lee',
      grade: 'Grade 2',
      address: '',
      status: 'ENROLLED',
      am_route_id: null,
      pm_route_id: null,
    },
  ],
}));

vi.mock('../services/api', () => ({
  presenceApi: {
    getStats: vi.fn().mockResolvedValue(mockStats),
    getEvents: vi.fn().mockResolvedValue(mockEvents),
  },
  routesApi: {
    getActiveRoutes: vi.fn().mockResolvedValue([]),
  },
  studentManagementApi: {
    getStudents: vi.fn().mockResolvedValue(mockStudents),
    enrollStudent: vi.fn().mockResolvedValue({ id: 's-new' }),
    updateStudent: vi.fn().mockResolvedValue({}),
    assignRoute: vi.fn().mockResolvedValue({}),
    bulkImport: vi.fn().mockResolvedValue({ success: 2, failed: 0, errors: [] }),
  },
}));

vi.mock('../services/websocket/presence.ws', () => ({
  presenceWs: {
    connect: vi.fn(),
    subscribe: vi.fn().mockReturnValue(vi.fn()),
    disconnect: vi.fn(),
  },
}));

describe('Students Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderStudents = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Students />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>,
    );
  };

  it('shows loading state initially', () => {
    renderStudents();
    expect(screen.getByText(/Loading student data/i)).toBeInTheDocument();
  });

  it('renders presence tab by default with stats after loading', async () => {
    renderStudents();
    await waitFor(() => {
      expect(screen.getByText('Live Presence')).toBeInTheDocument();
      expect(screen.getByText('Administration')).toBeInTheDocument();
    });
  });

  it('displays presence stats after data loads', async () => {
    renderStudents();
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
    });
  });

  it('displays recent events heading', async () => {
    renderStudents();
    await waitFor(() => {
      expect(screen.getByText('Recent Events')).toBeInTheDocument();
    });
  });

  it('switches to management tab and shows student roster', async () => {
    renderStudents();
    await waitFor(() => {
      expect(screen.getByText('Administration')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Administration'));

    await waitFor(() => {
      expect(screen.getByText('Student Roster')).toBeInTheDocument();
    });
  });

  it('shows Bulk Import and Enroll Student buttons in management tab', async () => {
    renderStudents();
    await waitFor(() => {
      expect(screen.getByText('Administration')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Administration'));

    await waitFor(() => {
      expect(screen.getByText('Bulk Import')).toBeInTheDocument();
      expect(screen.getByText('Enroll Student')).toBeInTheDocument();
    });
  });

  it('renders student names in the management tab', async () => {
    renderStudents();
    await waitFor(() => {
      expect(screen.getByText('Administration')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Administration'));

    await waitFor(() => {
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
      expect(screen.getByText('Carol Lee')).toBeInTheDocument();
    });
  });

  it('renders the page subtitle for presence tab', async () => {
    renderStudents();
    await waitFor(() => {
      expect(
        screen.getByText(/Live monitoring of student boardings and alightings/i),
      ).toBeInTheDocument();
    });
  });
});
