import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './Layout';
import * as AuthContext from '../context/AuthContext';

// Mock the AuthContext
vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

// Mock the useAlerts hook
vi.mock('../hooks/useAlerts', () => ({
  useAlerts: vi.fn(() => ({ alerts: [], error: null, refresh: vi.fn() })),
}));

// Mock the parentApi
vi.mock('../services/api', () => ({
  parentApi: {
    getActiveAlert: vi.fn(),
    getChildren: vi.fn().mockResolvedValue([]),
  },
}));

// Mock lucide-react icons to avoid SVG rendering issues
vi.mock('lucide-react', () => ({
  Bus: () => 'BusIcon',
  LogOut: () => 'LogOutIcon',
  User: () => 'UserIcon',
  Bell: () => 'BellIcon',
  Menu: () => 'MenuIcon',
  X: () => 'XIcon',
  ClipboardX: () => 'ClipboardXIcon',
  Settings: () => 'SettingsIcon',
  Languages: () => 'LanguagesIcon',
  Globe: () => 'GlobeIcon',
  ChevronDown: () => 'ChevronDownIcon',
}));

// Disable EventSource
const originalEventSource = globalThis.EventSource;
beforeEach(() => {
  (globalThis as any).EventSource = undefined;
});
afterEach(() => {
  (globalThis as any).EventSource = originalEventSource;
});

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>,
  );
}

describe('Layout Component', () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it('renders the Parent Portal brand text', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: '1', name: 'Jane Parent', email: 'jane@test.com', children: [] },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    renderWithProviders(<Layout />);

    expect(screen.getByText('Parent Portal')).toBeInTheDocument();
  });

  it('displays the user name', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: '1', name: 'Jane Parent', email: 'jane@test.com', children: [] },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    renderWithProviders(<Layout />);

    expect(screen.getByText('Jane Parent')).toBeInTheDocument();
  });

  it('renders navigation links including Report Absence', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: '1', name: 'Jane Parent', email: 'jane@test.com', children: [] },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    renderWithProviders(<Layout />);

    expect(screen.getByText('Report Absence')).toBeInTheDocument();
  });

  it('renders the PARENT role label', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: '1', name: 'Jane Parent', email: 'jane@test.com', children: [] },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    renderWithProviders(<Layout />);

    expect(screen.getByText('PARENT')).toBeInTheDocument();
  });
});
