import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Notifications from './Notifications';
import { parentApi } from '../services/api';

vi.mock('../services/api', () => ({
  parentApi: {
    getNotifications: vi.fn(),
  },
}));

const mockGetNotifications = vi.mocked(parentApi.getNotifications);

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
    mockGetNotifications.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<Notifications />);
    // The refresh icon should be spinning during load
    expect(screen.getByLabelText('Refresh notifications')).toBeInTheDocument();
  });

  it('shows empty state when there are no notifications', async () => {
    mockGetNotifications.mockResolvedValue([]);
    renderWithProviders(<Notifications />);
    await waitFor(() => {
      expect(screen.getByText('No notifications yet.')).toBeInTheDocument();
    });
  });

  it('renders a list of notifications', async () => {
    mockGetNotifications.mockResolvedValue([
      {
        id: 'n-1',
        alertId: 'a-1',
        recipientUserId: 'parent-001',
        channel: 'PUSH',
        status: 'SENT',
        timestamp: '2026-03-25T10:00:00Z',
      },
      {
        id: 'n-2',
        alertId: 'a-2',
        recipientUserId: 'parent-001',
        channel: 'PUSH',
        status: 'FAILED',
        timestamp: '2026-03-25T09:00:00Z',
      },
    ]);

    renderWithProviders(<Notifications />);

    await waitFor(() => {
      expect(screen.getAllByText('Alert notification')).toHaveLength(2);
    });
    expect(screen.getAllByText('SENT')).toHaveLength(1);
    expect(screen.getAllByText('FAILED')).toHaveLength(1);
  });

  it('shows error state when API call fails', async () => {
    mockGetNotifications.mockRejectedValue(new Error('Network error'));
    renderWithProviders(<Notifications />);
    await waitFor(
      () => {
        expect(screen.getByText(/Unable to load notifications/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it('refreshes notifications on button click', async () => {
    mockGetNotifications.mockResolvedValue([]);
    renderWithProviders(<Notifications />);
    await waitFor(() => {
      expect(screen.getByText('No notifications yet.')).toBeInTheDocument();
    });

    mockGetNotifications.mockResolvedValue([
      {
        id: 'n-3',
        alertId: 'a-3',
        recipientUserId: 'parent-001',
        channel: 'PUSH',
        status: 'SENT',
        timestamp: '2026-03-25T11:00:00Z',
      },
    ]);

    await userEvent.click(screen.getByLabelText('Refresh notifications'));

    await waitFor(() => {
      expect(screen.getAllByText('Alert notification')).toHaveLength(1);
    });
  });
});
