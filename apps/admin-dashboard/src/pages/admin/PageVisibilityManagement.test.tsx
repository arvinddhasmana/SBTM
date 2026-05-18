import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PageVisibilityManagement from './PageVisibilityManagement';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 'super-1', email: 'super@test.example', role: 'SUPER_ADMIN' },
  }),
}));

vi.mock('../../services/api/page-visibility.api', () => ({
  HIDEABLE_PAGE_KEYS: ['dashboard', 'alerts', 'alerts/operational', 'vehicles', 'students'],
  pageVisibilityApi: {
    getAll: vi.fn().mockResolvedValue([
      {
        pageKey: 'dashboard',
        pageName: 'Dashboard',
        isVisible: true,
        updatedAt: '2026-05-14T00:00:00Z',
      },
      { pageKey: 'alerts', pageName: 'Alerts', isVisible: true, updatedAt: '2026-05-14T00:00:00Z' },
      {
        pageKey: 'alerts/operational',
        pageName: 'Operational Alerts',
        isVisible: false,
        updatedAt: '2026-05-14T00:00:00Z',
      },
      {
        pageKey: 'vehicles',
        pageName: 'Fleet',
        isVisible: true,
        updatedAt: '2026-05-14T00:00:00Z',
      },
      {
        pageKey: 'students',
        pageName: 'Students',
        isVisible: true,
        updatedAt: '2026-05-14T00:00:00Z',
      },
    ]),
    update: vi.fn().mockResolvedValue({
      pageKey: 'alerts',
      pageName: 'Alerts',
      isVisible: false,
      updatedAt: '2026-05-14T00:00:00Z',
    }),
  },
}));

const renderComponent = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <PageVisibilityManagement />
      </BrowserRouter>
    </QueryClientProvider>,
  );
};

describe('PageVisibilityManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page heading', async () => {
    renderComponent();
    expect(screen.getByText(/page visibility/i)).toBeInTheDocument();
  });

  it('shows subtitle about controlling pages for non-Super-Admin', async () => {
    renderComponent();
    expect(screen.getByText(/control which pages are visible/i)).toBeInTheDocument();
  });

  it('loads and displays page records', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Alerts')).toBeInTheDocument();
      expect(screen.getByText('Operational Alerts')).toBeInTheDocument();
    });
  });

  it('shows correct visible/hidden status badges', async () => {
    renderComponent();
    await waitFor(() => {
      const visibleBadges = screen.getAllByText('Visible');
      const hiddenBadges = screen.getAllByText('Hidden');
      expect(visibleBadges.length).toBeGreaterThan(0);
      expect(hiddenBadges.length).toBeGreaterThan(0);
    });
  });

  it('shows summary of visible/total pages', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/pages visible/i)).toBeInTheDocument();
    });
  });

  it('shows warning badge when pages are hidden', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/hidden from other users/i)).toBeInTheDocument();
    });
  });

  it('shows loading state initially', async () => {
    const { pageVisibilityApi } = await import('../../services/api/page-visibility.api');
    vi.mocked(pageVisibilityApi.getAll).mockImplementationOnce(() => new Promise(() => {}));
    renderComponent();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('opens confirmation dialog on Hide button click', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    const hideButtons = screen.getAllByRole('button', { name: /hide/i });
    fireEvent.click(hideButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/hide page/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  it('opens confirmation dialog on Show button click for hidden page', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Operational Alerts')).toBeInTheDocument();
    });

    const showButton = screen.getByRole('button', { name: /show/i });
    fireEvent.click(showButton);

    await waitFor(() => {
      expect(screen.getByText(/show page/i)).toBeInTheDocument();
    });
  });

  it('cancels the dialog without calling update', async () => {
    const { pageVisibilityApi } = await import('../../services/api/page-visibility.api');
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    const hideButtons = screen.getAllByRole('button', { name: /hide/i });
    fireEvent.click(hideButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(pageVisibilityApi.update).not.toHaveBeenCalled();
  });

  it('calls update API on confirmation', async () => {
    const { pageVisibilityApi } = await import('../../services/api/page-visibility.api');
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    const hideButtons = screen.getAllByRole('button', { name: /hide/i });
    fireEvent.click(hideButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(pageVisibilityApi.update).toHaveBeenCalled();
    });
  });

  it('denies access for non-Super-Admin', async () => {
    const { useAuth } = await import('../../context/AuthContext');
    vi.mocked(useAuth).mockReturnValueOnce({
      user: { id: 'osta-1', email: 'osta@test.example', role: 'STA_ADMIN' },
    } as ReturnType<typeof useAuth>);

    renderComponent();
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });
});
