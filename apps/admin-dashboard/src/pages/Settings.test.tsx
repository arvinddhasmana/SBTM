import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Settings from './Settings';

const mockUser = {
  id: 'u-1',
  name: 'Jane Admin',
  email: 'jane@osta.ca',
  role: 'STA_ADMIN',
};

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: mockUser })),
}));

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderSettings = () => {
    return render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>,
    );
  };

  it('renders the page header', () => {
    renderSettings();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Manage your account and preferences')).toBeInTheDocument();
  });

  it('displays user profile information', () => {
    renderSettings();
    expect(screen.getAllByText('Jane Admin').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('jane@osta.ca')).toBeInTheDocument();
    expect(screen.getAllByText('STA_ADMIN').length).toBeGreaterThanOrEqual(1);
  });

  it('renders notification preferences section', () => {
    renderSettings();
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    expect(screen.getByText('Emergency Alerts')).toBeInTheDocument();
    expect(screen.getByText('Route Deviations')).toBeInTheDocument();
    expect(screen.getByText('Daily Summary')).toBeInTheDocument();
  });

  it('renders security and about sections', () => {
    renderSettings();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText(/Version 1.0.0/)).toBeInTheDocument();
  });
});
