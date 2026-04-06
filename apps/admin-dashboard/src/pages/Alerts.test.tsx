import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import Alerts from './Alerts';

// Mock the API
vi.mock('../services/api', () => ({
  alertsApi: {
    getAllAlerts: vi.fn().mockResolvedValue([
      {
        id: 'alert-1',
        eventType: 'PANIC_BUTTON',
        status: 'ACTIVE',
        tier: 'TIER_1',
        timestamp: new Date().toISOString(),
        routeId: 'route-1',
        vehicleId: 'bus-1',
        description: 'Test alert',
      },
      {
        id: 'alert-2',
        eventType: 'INCIDENT',
        status: 'RESOLVED',
        tier: 'TIER_1',
        timestamp: new Date().toISOString(),
        routeId: 'route-2',
        vehicleId: 'bus-2',
        description: 'Resolved alert',
      },
      {
        id: 'alert-3',
        eventType: 'LATE_ARRIVAL',
        status: 'ACTIVE',
        tier: 'TIER_2',
        timestamp: new Date().toISOString(),
        routeId: 'route-3',
        vehicleId: 'bus-3',
        description: 'Late arrival',
      },
    ]),
    resolveAlert: vi.fn().mockImplementation((id) => Promise.resolve({ id, status: 'RESOLVED' })),
    confirmAlert: vi.fn().mockImplementation((id) => Promise.resolve({ id, status: 'CONFIRMED' })),
    falseAlarmAlert: vi
      .fn()
      .mockImplementation((id) => Promise.resolve({ id, status: 'FALSE_ALARM' })),
    requestInfoAlert: vi.fn().mockImplementation((id) => Promise.resolve({ id, status: 'ACTIVE' })),
    getAlertAuditLog: vi.fn().mockResolvedValue([]),
  },
}));

describe('Alerts Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAlerts = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Alerts />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>,
    );
  };

  it('shows loading state initially', () => {
    renderAlerts();
    expect(screen.getByText(/Loading alerts/i)).toBeInTheDocument();
  });

  it('renders alerts header after loading', async () => {
    renderAlerts();

    await waitFor(
      () => {
        expect(screen.getByText('Alerts Management')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('renders filter buttons', async () => {
    renderAlerts();

    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /^All \(/i })).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  }, 10000);

  it('renders tier filter tabs', async () => {
    renderAlerts();

    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /All Tiers/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Safety \(Tier 1\)/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Operational \(Tier 2\)/i })).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /Informational \(Tier 3\)/i }),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  }, 10000);
});
