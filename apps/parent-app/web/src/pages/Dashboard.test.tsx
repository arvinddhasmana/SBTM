import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './Dashboard';
import * as AuthContext from '../context/AuthContext';
import { parentApi } from '../services/api';

// Mock the AuthContext
vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

vi.mock('../services/api', () => ({
  parentApi: {
    getActiveAlert: vi.fn(),
    getChildren: vi.fn().mockResolvedValue([]),
  },
}));

// Disable EventSource to avoid SSE side-effects in tests
const originalEventSource = globalThis.EventSource;
beforeEach(() => {
  (globalThis as any).EventSource = undefined;
});
afterEach(() => {
  (globalThis as any).EventSource = originalEventSource;
});

describe('Dashboard Page', () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it('renders children list correctly', () => {
    // Mock user with children
    const mockUser = {
      id: '1',
      name: 'Test Parent',
      email: 'test@test.com',
      children: [
        {
          id: 'c1',
          name: 'Child One',
          schoolName: 'School A',
          routeId: 'r1',
          vehicleId: 'v1',
          status: 'on_bus' as const,
          avatarUrl: 'http://test.com/1.png',
        },
      ],
    };

    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Child One')).toBeInTheDocument();
    expect(screen.getByText('School A')).toBeInTheDocument();
    expect(screen.getByText('On the Bus')).toBeInTheDocument();
  });

  it('shows empty state when no children', () => {
    // Mock user with no children
    const mockUser = {
      id: '1',
      name: 'Test Parent',
      email: 'test@test.com',
      children: [],
    };

    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText(/no children linked to your account/i)).toBeInTheDocument();
  });

  it('displays emergency alert banner when an alert is active', async () => {
    const mockUser = {
      id: '1',
      name: 'Test Parent',
      email: 'test@test.com',
      children: [
        {
          id: 'c1',
          name: 'Child One',
          schoolName: 'School A',
          routeId: 'r1',
          vehicleId: 'v1',
          status: 'on_bus' as const,
          avatarUrl: 'http://test.com/1.png',
        },
      ],
    };

    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    vi.mocked(parentApi.getActiveAlert).mockResolvedValue({
      id: 'alert-1',
      routeId: 'r1',
      vehicleId: 'v1',
      eventType: 'PANIC_BUTTON',
      message: "Emergency reported on your child's bus.",
      createdAt: '2026-04-04T10:00:00Z',
    });

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Panic Button')).toBeInTheDocument();
    });
    expect(screen.getByText("Emergency reported on your child's bus.")).toBeInTheDocument();
  });
});
