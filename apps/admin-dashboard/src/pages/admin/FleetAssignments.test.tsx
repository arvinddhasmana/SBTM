import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FleetAssignments } from './FleetAssignments';

const { mockAssignments } = vi.hoisted(() => ({
  mockAssignments: [
    {
      id: 'fa-1',
      schoolId: 'school-1',
      routeId: 'route-1',
      vehicleId: 'BUS-01',
      effectiveDate: '2026-01-15',
      status: 'PROPOSED',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'fa-2',
      schoolId: 'school-2',
      routeId: 'route-2',
      vehicleId: 'BUS-02',
      effectiveDate: '2026-01-10',
      status: 'ACCEPTED',
      createdAt: new Date().toISOString(),
    },
  ],
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: {
      id: 'u-1',
      email: 'admin@osta.ca',
      role: 'OSTA_ADMIN',
    },
  }),
}));

vi.mock('../../services/api/fleet-assignment.api', () => ({
  fleetAssignmentApi: {
    list: vi.fn().mockResolvedValue(mockAssignments),
    propose: vi.fn().mockResolvedValue({ id: 'fa-new' }),
    accept: vi.fn().mockResolvedValue({}),
    reject: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../../services/api/api-client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: new Blob() }),
  },
}));

describe('FleetAssignments Page', () => {
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
          <FleetAssignments />
        </BrowserRouter>
      </QueryClientProvider>,
    );
  };

  it('renders the page heading', () => {
    renderComponent();
    expect(screen.getByText('Fleet Assignments')).toBeInTheDocument();
  });

  it('shows Create Proposal button for OSTA admin', () => {
    renderComponent();
    expect(screen.getByText('Create Proposal')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    renderComponent();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays assignments after loading', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('school-1')).toBeInTheDocument();
      expect(screen.getByText('BUS-01')).toBeInTheDocument();
      expect(screen.getByText('PROPOSED')).toBeInTheDocument();
    });
  });

  it('displays accepted status and PDF download for accepted assignments', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('ACCEPTED')).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();
    });
  });

  it('shows proposal form when Create Proposal is clicked', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('Create Proposal'));

    expect(screen.getByText('New Assignment Proposal')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter school ID')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter route ID')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter vehicle ID')).toBeInTheDocument();
  });

  it('hides proposal form when Cancel is clicked', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('Create Proposal'));
    expect(screen.getByText('New Assignment Proposal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('New Assignment Proposal')).not.toBeInTheDocument();
  });

  it('shows empty state when no assignments exist', async () => {
    const { fleetAssignmentApi } = await import('../../services/api/fleet-assignment.api');
    vi.mocked(fleetAssignmentApi.list).mockResolvedValueOnce([]);

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('No fleet assignments found.')).toBeInTheDocument();
    });
  });
});
