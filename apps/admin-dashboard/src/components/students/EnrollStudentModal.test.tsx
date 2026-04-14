import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EnrollStudentModal from './EnrollStudentModal';

vi.mock('../../services/api', () => ({
  studentManagementApi: {
    enrollStudent: vi.fn().mockResolvedValue({ id: 's-new' }),
  },
}));

describe('EnrollStudentModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (isOpen = true) => {
    return render(
      <EnrollStudentModal isOpen={isOpen} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = renderModal(false);
    expect(container.innerHTML).toBe('');
  });

  it('renders the enrollment form when open', () => {
    renderModal();
    expect(screen.getByRole('heading', { name: /Enroll Student/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter first name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter last name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Grade 3')).toBeInTheDocument();
  });

  it('shows Cancel and Enroll Student buttons', () => {
    renderModal();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enroll Student/i })).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    renderModal();
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('submits the form and calls onSuccess', async () => {
    renderModal();

    fireEvent.change(screen.getByPlaceholderText('Enter first name'), {
      target: { value: 'Alice' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter last name'), {
      target: { value: 'Smith' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Grade 3'), {
      target: { value: 'Grade 3' },
    });

    const submitButton = screen.getByRole('button', { name: /Enroll Student/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
