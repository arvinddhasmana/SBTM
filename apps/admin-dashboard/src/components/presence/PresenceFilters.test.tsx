import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PresenceFilters } from './PresenceFilters';

describe('PresenceFilters', () => {
  const mockOnFilterChange = vi.fn();
  const defaultFilters = {
    studentName: '',
    routeId: '',
    eventType: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderFilters = (filters = defaultFilters) => {
    return render(<PresenceFilters filters={filters} onFilterChange={mockOnFilterChange} />);
  };

  it('renders search input and filter dropdowns', () => {
    renderFilters();
    expect(screen.getByPlaceholderText('Search students...')).toBeInTheDocument();
    expect(screen.getByText('All Events')).toBeInTheDocument();
    expect(screen.getByText('All Routes')).toBeInTheDocument();
  });

  it('calls onFilterChange when search input changes', () => {
    renderFilters();
    fireEvent.change(screen.getByPlaceholderText('Search students...'), {
      target: { value: 'Alice' },
    });
    expect(mockOnFilterChange).toHaveBeenCalledWith('studentName', 'Alice');
  });

  it('calls onFilterChange when event type dropdown changes', () => {
    renderFilters();
    const selects = screen.getAllByRole('combobox');
    // First select is event type
    fireEvent.change(selects[0], { target: { value: 'BOARD' } });
    expect(mockOnFilterChange).toHaveBeenCalledWith('eventType', 'BOARD');
  });
});
