import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BulkImportModal from './BulkImportModal';

describe('BulkImportModal', () => {
  const mockOnClose = vi.fn();
  const mockOnImport = vi.fn().mockResolvedValue({ success: 5, failed: 0, errors: [] });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (isOpen = true) => {
    return render(
      <BulkImportModal isOpen={isOpen} onClose={mockOnClose} onImport={mockOnImport} />,
    );
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = renderModal(false);
    expect(container.innerHTML).toBe('');
  });

  it('renders the bulk import dialog when open', () => {
    renderModal();
    expect(screen.getByText('Bulk Import Students')).toBeInTheDocument();
    expect(screen.getByText('Click to select CSV file')).toBeInTheDocument();
  });

  it('shows Start Import button disabled when no file selected', () => {
    renderModal();
    const importBtn = screen.getByText('Start Import');
    expect(importBtn).toBeInTheDocument();
    expect(importBtn).toBeDisabled();
  });

  it('calls onClose when Cancel is clicked', () => {
    renderModal();
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
