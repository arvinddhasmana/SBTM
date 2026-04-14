import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WithdrawStudentModal from './WithdrawStudentModal';

vi.mock('../../services/api', () => ({
  studentManagementApi: {
    updateStudent: vi.fn().mockResolvedValue({}),
  },
}));

const mockStudent = {
  id: 's-1',
  first_name: 'Alice',
  last_name: 'Smith',
  grade: 'Grade 3',
  status: 'ENROLLED',
};

describe('WithdrawStudentModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (isOpen = true, student: any = mockStudent) => {
    return render(
      <WithdrawStudentModal
        isOpen={isOpen}
        onClose={mockOnClose}
        student={student}
        onSuccess={mockOnSuccess}
      />,
    );
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = renderModal(false);
    expect(container.innerHTML).toBe('');
  });

  it('renders the confirmation dialog with student name', () => {
    renderModal();
    expect(screen.getByText('Withdraw Student')).toBeInTheDocument();
    expect(screen.getByText(/Alice Smith/)).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    renderModal();
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
