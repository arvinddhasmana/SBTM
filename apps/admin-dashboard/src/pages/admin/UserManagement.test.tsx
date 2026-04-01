import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserManagement } from './UserManagement';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: {
      id: 'osta-1',
      email: 'admin@test.example',
      role: 'OSTA_ADMIN',
    },
  }),
}));

vi.mock('../../services/api/provisioning.api', () => ({
  provisioningApi: {
    listUsers: vi.fn().mockResolvedValue([
      { id: 'u-1', email: 'user1@test.example', role: 'PARENT', isActive: true },
      { id: 'u-2', email: 'user2@test.example', role: 'DRIVER', isActive: false },
    ]),
    inviteUser: vi.fn(),
    deactivateUser: vi.fn(),
    reactivateUser: vi.fn(),
  },
}));

vi.mock('../../services/api/organization.api', () => ({
  organizationApi: {
    listSchools: vi.fn().mockResolvedValue([{ id: 's-1', name: 'Test Primary', boardId: 'b-1' }]),
  },
}));

const renderComponent = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <UserManagement />
      </BrowserRouter>
    </QueryClientProvider>,
  );
};

describe('UserManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page heading', async () => {
    renderComponent();
    expect(screen.getByText(/user management/i)).toBeInTheDocument();
  });

  it('shows invite user button for admin', async () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /invite user/i })).toBeInTheDocument();
  });

  it('loads and displays users from API', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('user1@test.example')).toBeInTheDocument();
      expect(screen.getByText('user2@test.example')).toBeInTheDocument();
    });
  });

  it('shows active/inactive badges for users', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', async () => {
    const { provisioningApi } = await import('../../services/api/provisioning.api');
    vi.mocked(provisioningApi.listUsers).mockImplementationOnce(
      () => new Promise(() => {}), // never resolves during this test
    );
    renderComponent();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows no users when API fails', async () => {
    const { provisioningApi } = await import('../../services/api/provisioning.api');
    vi.mocked(provisioningApi.listUsers).mockRejectedValueOnce(new Error('Network error'));
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/no users found/i)).toBeInTheDocument();
    });
  });
});
