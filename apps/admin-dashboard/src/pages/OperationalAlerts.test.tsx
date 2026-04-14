import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import OperationalAlerts from './OperationalAlerts';

const { mockAlerts } = vi.hoisted(() => ({
  mockAlerts: [
    {
      id: 'alert-1',
      eventType: 'LATE_ARRIVAL',
      status: 'ACTIVE',
      tier: 'TIER_2',
      timestamp: new Date().toISOString(),
      routeId: 'R-101',
      vehicleId: 'BUS-01',
      description: 'Bus 01 running late',
    },
    {
      id: 'alert-2',
      eventType: 'ROUTE_DEVIATION',
      status: 'ACTIVE',
      tier: 'TIER_2',
      timestamp: new Date().toISOString(),
      routeId: 'R-102',
      vehicleId: 'BUS-02',
      description: 'Route deviation detected',
    },
    {
      id: 'alert-3',
      eventType: 'PANIC_BUTTON',
      status: 'ACTIVE',
      tier: 'TIER_1',
      timestamp: new Date().toISOString(),
      routeId: 'R-103',
      vehicleId: 'BUS-03',
      description: 'Panic button - not tier 2',
    },
  ],
}));

vi.mock('../services/api', () => ({
  alertsApi: {
    getAllAlerts: vi.fn().mockResolvedValue(mockAlerts),
    resolveAlert: vi.fn().mockResolvedValue({}),
  },
}));

describe('OperationalAlerts Page', () => {
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
          <AuthProvider>
            <OperationalAlerts />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>,
    );
  };

  it('shows loading state initially', () => {
    renderComponent();
    expect(screen.getByText(/Loading operational alerts/i)).toBeInTheDocument();
  });

  it('renders operational alerts header after loading', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Operational Alerts')).toBeInTheDocument();
    });
  });

  it('shows event type filter buttons', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Event Type:')).toBeInTheDocument();
      expect(screen.getByText(/^All/)).toBeInTheDocument();
      expect(screen.getByText(/Late Arrival/)).toBeInTheDocument();
    });
  });

  it('only shows Tier 2 alerts (not Tier 1)', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/2 active Tier 2 alerts/)).toBeInTheDocument();
    });
  });
});
