import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EditStudentModal from './EditStudentModal';

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
  address: '123 Main St',
  status: 'ENROLLED',
};

describe('EditStudentModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (isOpen = true, student = mockStudent) => {
    return render(
      <EditStudentModal
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

  it('renders nothing when student is null', () => {
    const { container } = render(
      <EditStudentModal
        isOpen={true}
        onClose={mockOnClose}
        student={null}
        onSuccess={mockOnSuccess}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the edit form with pre-filled data', () => {
    renderModal();
    expect(screen.getByText('Edit Student')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Smith')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Grade 3')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument();
  });

  it('submits updated data and calls onSuccess', async () => {
    renderModal();

    fireEvent.change(screen.getByDisplayValue('Alice'), {
      target: { value: 'Alicia' },
    });

    fireEvent.submit(screen.getByText('Save Changes').closest('form')!);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
