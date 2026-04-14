import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { BoardsList } from './BoardsList';

const { mockBoards } = vi.hoisted(() => ({
  mockBoards: [
    { id: 'board-1', name: 'Durham District School Board', schools: [{ id: 's1' }, { id: 's2' }] },
    { id: 'board-2', name: 'Ottawa-Carleton DSB', schools: [] },
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

vi.mock('../../services/api/organization.api', () => ({
  organizationApi: {
    listBoards: vi.fn().mockResolvedValue(mockBoards),
    createBoard: vi.fn().mockResolvedValue({ id: 'board-new' }),
    updateBoard: vi.fn().mockResolvedValue({}),
    deleteBoard: vi.fn().mockResolvedValue({}),
  },
}));

describe('BoardsList Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <BoardsList />
      </BrowserRouter>,
    );
  };

  it('renders the page heading', () => {
    renderComponent();
    expect(screen.getByText('School Boards')).toBeInTheDocument();
  });

  it('shows Add Board button for OSTA admin', () => {
    renderComponent();
    expect(screen.getByText('+ Add Board')).toBeInTheDocument();
  });

  it('displays boards after loading', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Durham District School Board')).toBeInTheDocument();
      expect(screen.getByText('Ottawa-Carleton DSB')).toBeInTheDocument();
    });
  });

  it('shows create form when Add Board is clicked', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Durham District School Board')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Add Board'));

    expect(screen.getByText('Create Board')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Durham District School Board')).toBeInTheDocument();
  });

  it('shows empty state when no boards exist', async () => {
    const { organizationApi } = await import('../../services/api/organization.api');
    vi.mocked(organizationApi.listBoards).mockResolvedValueOnce([]);

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('No boards found.')).toBeInTheDocument();
    });
  });
});
