import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PresenceTable } from './PresenceTable';

const mockEvents = [
  {
    id: 'ev-1',
    studentId: 'stu-1',
    firstName: 'Alice',
    lastName: 'Smith',
    grade: 'Grade 3',
    eventType: 'BOARD' as const,
    routeId: 'R-101',
    vehicleId: 'BUS-01',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'ev-2',
    studentId: 'stu-2',
    firstName: 'Bob',
    lastName: 'Jones',
    grade: 'Grade 5',
    eventType: 'ALIGHT' as const,
    routeId: 'R-102',
    vehicleId: 'BUS-02',
    timestamp: new Date().toISOString(),
  },
];

describe('PresenceTable', () => {
  const mockOnPageChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTable = (events = mockEvents, total = 2, page = 1) => {
    return render(
      <PresenceTable
        events={events}
        total={total}
        page={page}
        limit={10}
        onPageChange={mockOnPageChange}
      />,
    );
  };

  it('renders student names in the table', () => {
    renderTable();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });

  it('shows status badges for board and alight events', () => {
    renderTable();
    expect(screen.getByText(/On Bus/)).toBeInTheDocument();
    expect(screen.getByText('Dropped Off')).toBeInTheDocument();
  });

  it('shows empty state when no events', () => {
    renderTable([], 0);
    expect(screen.getByText('No presence events found.')).toBeInTheDocument();
  });

  it('shows pagination controls with correct counts', () => {
    renderTable(mockEvents, 25, 1);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });
});
