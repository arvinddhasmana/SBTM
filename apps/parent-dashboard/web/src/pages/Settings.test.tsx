import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Settings from './Settings';
import { parentApi } from '../services/api';

vi.mock('../services/api', () => ({
  parentApi: {
    getNotificationPreferences: vi.fn(),
    updateNotificationPreferences: vi.fn(),
  },
}));

function renderSettings() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Settings Page', () => {
  beforeEach(() => {
    vi.mocked(parentApi.getNotificationPreferences).mockResolvedValue([]);
    vi.mocked(parentApi.updateNotificationPreferences).mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it('renders event type cards after loading', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('Child Boarded')).toBeInTheDocument();
    });
    expect(screen.getByText('Child Alighted')).toBeInTheDocument();
    expect(screen.getByText('Emergency Alerts')).toBeInTheDocument();
  });

  it('shows emergency alerts as always-on', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('Always On')).toBeInTheDocument();
    });
  });

  it('renders channel toggle buttons', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('Child Boarded')).toBeInTheDocument();
    });

    const pushButtons = screen.getAllByText('Push');
    const emailButtons = screen.getAllByText('Email');
    expect(pushButtons.length).toBeGreaterThanOrEqual(3);
    expect(emailButtons.length).toBeGreaterThanOrEqual(3);
  });

  it('calls API with preferences on save', async () => {
    const user = userEvent.setup();
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('Child Boarded')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save preferences/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(parentApi.updateNotificationPreferences).toHaveBeenCalled();
    });
  });

  it('shows success message after saving', async () => {
    const user = userEvent.setup();
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('Child Boarded')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save preferences/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Preferences saved successfully.')).toBeInTheDocument();
    });
  });
});
