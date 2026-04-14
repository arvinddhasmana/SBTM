import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { TenantDashboard } from './TenantDashboard';

const { mockBoards, mockSchools } = vi.hoisted(() => ({
  mockBoards: [
    { id: 'board-1', name: 'Durham DSB' },
    { id: 'board-2', name: 'Ottawa DSB' },
  ],
  mockSchools: [
    { id: 'sch-1', name: 'Maple Ridge Elementary', boardId: 'board-1' },
    { id: 'sch-2', name: 'Oak Park Secondary', boardId: 'board-1' },
    { id: 'sch-3', name: 'River Valley School', boardId: 'board-2' },
  ],
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'u-1',
      email: 'admin@osta.ca',
      role: 'OSTA_ADMIN',
    },
  })),
}));

vi.mock('../../services/api/organization.api', () => ({
  organizationApi: {
    listBoards: vi.fn(() => Promise.resolve(mockBoards)),
    listSchools: vi.fn(() => Promise.resolve(mockSchools)),
  },
}));

describe('TenantDashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <TenantDashboard />
      </BrowserRouter>,
    );
  };

  it('shows loading state initially', () => {
    renderComponent();
    expect(screen.getByText(/Loading tenant overview/i)).toBeInTheDocument();
  });

  it('renders OSTA-Wide Overview heading for admin', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('OSTA-Wide Overview')).toBeInTheDocument();
    });
  });

  it('displays board and school counts', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Total Boards')).toBeInTheDocument();
      expect(screen.getByText('Total Schools')).toBeInTheDocument();
    });
  });

  it('displays boards table with school counts', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getAllByText('Durham DSB').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Ottawa DSB').length).toBeGreaterThanOrEqual(1);
    });
  });
});
