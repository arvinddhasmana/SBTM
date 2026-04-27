import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AbsenceReport from './AbsenceReport';
import * as AuthContext from '../context/AuthContext';

vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

vi.mock('../services/api', () => ({
  parentApi: {
    reportAbsence: vi.fn(),
  },
}));

const mockUserWithChildren = {
  id: 'parent-1',
  name: 'Test Parent',
  email: 'parent@test.example',
  children: [
    {
      id: 'child-1',
      name: 'Child One',
      schoolName: 'Test School',
      routeId: 'r-1',
      vehicleId: 'v-1',
      status: 'on_bus' as const,
    },
    {
      id: 'child-2',
      name: 'Child Two',
      schoolName: 'Test School',
      routeId: 'r-2',
      vehicleId: 'v-2',
      status: 'at_school' as const,
    },
  ],
};

const mockUserNoChildren = {
  id: 'parent-2',
  name: 'No Kids Parent',
  email: 'nokids@test.example',
  children: [] as never[],
};

describe('AbsenceReport', () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  beforeEach(() => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUserWithChildren,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });
  });

  it('renders the absence report form for a parent with children', () => {
    render(
      <BrowserRouter>
        <AbsenceReport />
      </BrowserRouter>,
    );
    expect(screen.getByText(/report an absence/i)).toBeInTheDocument();
    expect(screen.getByText(/^Child$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Date$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /report absence/i })).toBeInTheDocument();
  });

  it('shows fallback when parent has no linked children', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUserNoChildren,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });
    render(
      <BrowserRouter>
        <AbsenceReport />
      </BrowserRouter>,
    );
    expect(screen.getByText(/no children associated/i)).toBeInTheDocument();
  });

  it('shows success message after successful submission', async () => {
    const { parentApi } = await import('../services/api');
    vi.mocked(parentApi.reportAbsence).mockResolvedValueOnce({} as never);

    render(
      <BrowserRouter>
        <AbsenceReport />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /report absence/i }));

    await waitFor(() => {
      expect(screen.getByText(/absence reported successfully/i)).toBeInTheDocument();
    });
  });

  it('shows error message on API failure', async () => {
    const { parentApi } = await import('../services/api');
    vi.mocked(parentApi.reportAbsence).mockRejectedValueOnce(new Error('Server error'));

    render(
      <BrowserRouter>
        <AbsenceReport />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /report absence/i }));

    await waitFor(() => {
      // Component uses err.message directly, so "Server error" appears in the alert
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
    });
  });

  it('disables submit button while submitting', async () => {
    const { parentApi } = await import('../services/api');
    vi.mocked(parentApi.reportAbsence).mockImplementation(() => new Promise(() => {}));

    render(
      <BrowserRouter>
        <AbsenceReport />
      </BrowserRouter>,
    );

    const submit = screen.getByRole('button', { name: /report absence/i });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(submit).toBeDisabled();
    });
  });
});
