import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StudentTable from './StudentTable';

const mockStudents = [
  {
    id: 's-1',
    first_name: 'Alice',
    last_name: 'Smith',
    grade: 'Grade 3',
    address: '123 Main St',
    status: 'ENROLLED',
    am_route_id: 'R-101',
    pm_route_id: 'R-102',
  },
  {
    id: 's-2',
    first_name: 'Bob',
    last_name: 'Jones',
    grade: 'Grade 5',
    address: '',
    status: 'WITHDRAWN',
    am_route_id: undefined,
    pm_route_id: undefined,
  },
];

describe('StudentTable', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnAssign = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTable = (students = mockStudents) => {
    return render(
      <StudentTable
        students={students}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAssign={mockOnAssign}
      />,
    );
  };

  it('renders student names', () => {
    renderTable();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });

  it('displays grade information', () => {
    renderTable();
    expect(screen.getByText('Grade 3')).toBeInTheDocument();
    expect(screen.getByText('Grade 5')).toBeInTheDocument();
  });

  it('shows route assignments when present', () => {
    renderTable();
    expect(screen.getByText(/AM: R-101/)).toBeInTheDocument();
    expect(screen.getByText(/PM: R-102/)).toBeInTheDocument();
  });

  it('shows "No routes assigned" when student has no routes', () => {
    renderTable();
    expect(screen.getByText('No routes assigned')).toBeInTheDocument();
  });

  it('shows empty state when there are no students', () => {
    renderTable([]);
    expect(screen.getByText('No students found.')).toBeInTheDocument();
  });
});
