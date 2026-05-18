import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SchoolsList } from './SchoolsList';

const { mockSchools, mockBoards } = vi.hoisted(() => ({
  mockSchools: [
    { id: 'sch-1', name: 'Maple Ridge Elementary', boardId: 'board-1' },
    { id: 'sch-2', name: 'Oak Park Secondary', boardId: 'board-1' },
  ],
  mockBoards: [{ id: 'board-1', name: 'Durham District School Board' }],
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: {
      id: 'u-1',
      email: 'admin@osta.ca',
      role: 'STA_ADMIN',
    },
  }),
}));

vi.mock('../../services/api/organization.api', () => ({
  organizationApi: {
    listSchools: vi.fn().mockResolvedValue(mockSchools),
    listBoards: vi.fn().mockResolvedValue(mockBoards),
    createSchool: vi.fn().mockResolvedValue({ id: 'sch-new' }),
    updateSchool: vi.fn().mockResolvedValue({}),
    deleteSchool: vi.fn().mockResolvedValue({}),
  },
}));

describe('SchoolsList Page', () => {
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
          <SchoolsList />
        </BrowserRouter>
      </QueryClientProvider>,
    );
  };

  it('renders the page heading', () => {
    renderComponent();
    expect(screen.getByText('Schools')).toBeInTheDocument();
  });

  it('shows Add School button for admin users', () => {
    renderComponent();
    expect(screen.getByText('+ Add School')).toBeInTheDocument();
  });

  it('displays schools after loading', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Maple Ridge Elementary')).toBeInTheDocument();
      expect(screen.getByText('Oak Park Secondary')).toBeInTheDocument();
    });
  });

  it('shows create form when Add School is clicked', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('+ Add School'));

    expect(screen.getByText('Create School')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Maple Ridge Elementary')).toBeInTheDocument();
  });

  it('shows empty state when no schools found', async () => {
    const { organizationApi } = await import('../../services/api/organization.api');
    vi.mocked(organizationApi.listSchools).mockResolvedValueOnce([]);

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('No schools found.')).toBeInTheDocument();
    });
  });
});
