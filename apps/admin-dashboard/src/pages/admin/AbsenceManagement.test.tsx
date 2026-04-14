import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AbsenceManagement } from './AbsenceManagement';

const { mockAbsences } = vi.hoisted(() => ({
  mockAbsences: [
    {
      id: 'abs-1',
      studentId: 'student-1',
      tripDate: '2026-04-14',
      routeType: 'AM',
      confirmationStatus: 'PENDING',
      notes: 'Sick day',
      confirmationNotes: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'abs-2',
      studentId: 'student-2',
      tripDate: '2026-04-14',
      routeType: 'BOTH',
      confirmationStatus: 'CONFIRMED',
      notes: 'Family trip',
      confirmationNotes: 'Confirmed by office',
      createdAt: new Date().toISOString(),
    },
  ],
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: {
      id: 'u-1',
      email: 'admin@school.ca',
      role: 'SCHOOL_ADMIN',
      schoolId: 'school-1',
    },
  }),
}));

vi.mock('../../services/api/absence.api', () => ({
  absenceApi: {
    listAbsences: vi.fn().mockResolvedValue(mockAbsences),
    confirmAbsence: vi.fn().mockResolvedValue({}),
    rejectAbsence: vi.fn().mockResolvedValue({}),
    deleteAbsence: vi.fn().mockResolvedValue({}),
  },
}));

describe('AbsenceManagement Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AbsenceManagement />
        </BrowserRouter>
      </QueryClientProvider>,
    );
  };

  it('renders the page heading', () => {
    renderComponent();
    expect(screen.getByText('Absence Reports')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    renderComponent();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays absence records after loading', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('student-1')).toBeInTheDocument();
      expect(screen.getByText('student-2')).toBeInTheDocument();
    });
  });

  it('shows Confirm and Reject buttons for PENDING absences as school admin', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Confirm')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
    });
  });

  it('displays route type labels correctly', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Morning (AM)')).toBeInTheDocument();
      expect(screen.getByText('Full Day (Both)')).toBeInTheDocument();
    });
  });

  it('shows empty state when no absences exist', async () => {
    const { absenceApi } = await import('../../services/api/absence.api');
    vi.mocked(absenceApi.listAbsences).mockResolvedValueOnce([]);

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/No absences reported/i)).toBeInTheDocument();
    });
  });
});
