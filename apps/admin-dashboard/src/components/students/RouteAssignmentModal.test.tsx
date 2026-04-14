import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RouteAssignmentModal from './RouteAssignmentModal';

vi.mock('../../services/api', () => ({
  routesApi: {
    getActiveRoutes: vi.fn().mockResolvedValue([
      { id: 'R-101', name: 'Route 101' },
      { id: 'R-102', name: 'Route 102' },
    ]),
  },
}));

const mockStudent = {
  id: 's-1',
  first_name: 'Alice',
  last_name: 'Smith',
  grade: 'Grade 3',
  school_id: 's0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c',
  am_route_id: '',
  pm_route_id: '',
  am_stop_id: '',
  pm_stop_id: '',
};

describe('RouteAssignmentModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (isOpen = true) => {
    return render(
      <RouteAssignmentModal
        isOpen={isOpen}
        onClose={mockOnClose}
        student={mockStudent}
        onSave={mockOnSave}
      />,
    );
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = renderModal(false);
    expect(container.innerHTML).toBe('');
  });

  it('renders the route assignment dialog when open', () => {
    renderModal();
    expect(screen.getByText('Route Assignment')).toBeInTheDocument();
  });

  it('displays student info', async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });
  });

  it('shows AM and PM route selectors after routes load', async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('AM Route')).toBeInTheDocument();
      expect(screen.getByText('PM Route')).toBeInTheDocument();
    });
  });
});
