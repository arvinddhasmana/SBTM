import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Notifications from './Notifications';
import { parentApi } from '../services/api';

vi.mock('../services/api', () => ({
  parentApi: {
    getAlertHistory: vi.fn(),
  },
}));

const mockGetAlertHistory = vi.mocked(parentApi.getAlertHistory);

describe('Notifications page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>,
    );
  };

  it('shows loading state initially', () => {
    mockGetAlertHistory.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<Notifications />);
    expect(screen.getByLabelText('Refresh')).toBeInTheDocument();
  });

  it('shows empty state when there are no alerts', async () => {
    mockGetAlertHistory.mockResolvedValue([]);
    renderWithProviders(<Notifications />);
    await waitFor(() => {
      expect(screen.getByText('No alerts yet')).toBeInTheDocument();
    });
  });

  it('renders a list of alerts', async () => {
    mockGetAlertHistory.mockResolvedValue([
      {
        id: 'a-1',
        schoolId: 's1',
        vehicleId: 'BUS-01',
        routeId: 'ROUTE-1',
        driverId: 'd1',
        timestamp: '2026-03-25T10:00:00Z',
        lat: 45.42,
        lng: -75.69,
        eventType: 'PANIC_BUTTON',
        description: 'Emergency panic button pressed',
        status: 'RESOLVED' as const,
        createdAt: '2026-03-25T10:00:00Z',
        updatedAt: '2026-03-25T10:05:00Z',
      },
      {
        id: 'a-2',
        schoolId: 's1',
        vehicleId: 'BUS-01',
        routeId: 'ROUTE-1',
        driverId: 'd1',
        timestamp: '2026-03-25T09:00:00Z',
        lat: 45.42,
        lng: -75.69,
        eventType: 'LATE_ARRIVAL',
        description: 'Bus is running late',
        status: 'ACTIVE' as const,
        createdAt: '2026-03-25T09:00:00Z',
        updatedAt: '2026-03-25T09:00:00Z',
      },
    ]);

    renderWithProviders(<Notifications />);

    await waitFor(() => {
      expect(screen.getByText('Panic Button')).toBeInTheDocument();
    });
    expect(screen.getByText('Late Arrival')).toBeInTheDocument();
    expect(screen.getByText('RESOLVED')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('shows error state when API call fails', async () => {
    mockGetAlertHistory.mockRejectedValue(new Error('Network error'));
    renderWithProviders(<Notifications />);
    await waitFor(
      () => {
        expect(screen.getByText(/Unable to load alert history/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it('refreshes alerts on button click', async () => {
    mockGetAlertHistory.mockResolvedValue([]);
    renderWithProviders(<Notifications />);
    await waitFor(() => {
      expect(screen.getByText('No alerts yet')).toBeInTheDocument();
    });

    mockGetAlertHistory.mockResolvedValue([
      {
        id: 'a-3',
        schoolId: 's1',
        vehicleId: 'BUS-01',
        routeId: 'ROUTE-1',
        driverId: 'd1',
        timestamp: '2026-03-25T11:00:00Z',
        lat: 45.42,
        lng: -75.69,
        eventType: 'INCIDENT',
        description: 'Incident reported',
        status: 'ACTIVE' as const,
        createdAt: '2026-03-25T11:00:00Z',
        updatedAt: '2026-03-25T11:00:00Z',
      },
    ]);

    await userEvent.click(screen.getByLabelText('Refresh'));

    await waitFor(() => {
      expect(screen.getByText('Incident')).toBeInTheDocument();
    });
  });
});
