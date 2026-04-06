import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AlertConfirmationModal from './AlertConfirmationModal';
import type { Alert } from '../../types';

describe('AlertConfirmationModal', () => {
  const mockAlert: Alert = {
    id: 'alert-001',
    schoolId: 'school-001',
    routeId: 'route-123',
    vehicleId: 'bus-45',
    driverId: 'driver-001',
    timestamp: new Date().toISOString(),
    // createdAt set to "now" so timer shows ~2:00
    createdAt: new Date().toISOString(),
    lat: 45.392,
    lng: -75.713,
    eventType: 'PANIC_BUTTON',
    status: 'PENDING_CONFIRMATION',
    tier: 'TIER_1',
    description: 'Test emergency',
  };

  const mockOnConfirm = vi.fn().mockResolvedValue(undefined);
  const mockOnFalseAlarm = vi.fn().mockResolvedValue(undefined);
  const mockOnRequestInfo = vi.fn().mockResolvedValue(undefined);
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderModal = () =>
    render(
      <AlertConfirmationModal
        alert={mockAlert}
        onConfirm={mockOnConfirm}
        onFalseAlarm={mockOnFalseAlarm}
        onRequestInfo={mockOnRequestInfo}
        onClose={mockOnClose}
      />,
    );

  it('renders modal with alert details', () => {
    renderModal();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Alert Requires Confirmation/i)).toBeInTheDocument();
    expect(screen.getByText(/TIER_1|Tier 1/i)).toBeInTheDocument();
  });

  it('shows alert route and vehicle information', () => {
    renderModal();

    expect(screen.getByText('route-123')).toBeInTheDocument();
    expect(screen.getByText('bus-45')).toBeInTheDocument();
  });

  it('shows alert description', () => {
    renderModal();

    expect(screen.getByText(/Test emergency/i)).toBeInTheDocument();
  });

  it('renders all three action buttons', () => {
    renderModal();

    expect(screen.getByTestId('btn-confirm')).toBeInTheDocument();
    expect(screen.getByTestId('btn-false-alarm')).toBeInTheDocument();
    expect(screen.getByTestId('btn-request-info')).toBeInTheDocument();
  });

  it('calls onConfirm with alert ID when confirm button is clicked', async () => {
    renderModal();

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-confirm'));
    });

    expect(mockOnConfirm).toHaveBeenCalledWith('alert-001');
  });

  it('calls onFalseAlarm with alert ID when false alarm button is clicked', async () => {
    renderModal();

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-false-alarm'));
    });

    expect(mockOnFalseAlarm).toHaveBeenCalledWith('alert-001');
  });

  it('calls onRequestInfo with alert ID when request info button is clicked', async () => {
    renderModal();

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-request-info'));
    });

    expect(mockOnRequestInfo).toHaveBeenCalledWith('alert-001');
  });

  it('calls onClose when close button is clicked', () => {
    renderModal();

    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('disables buttons while an action is in progress', async () => {
    // Make onConfirm hang to simulate loading state
    const slowConfirm = vi.fn(() => new Promise<void>(() => {}));
    render(
      <AlertConfirmationModal
        alert={mockAlert}
        onConfirm={slowConfirm}
        onFalseAlarm={mockOnFalseAlarm}
        onRequestInfo={mockOnRequestInfo}
        onClose={mockOnClose}
      />,
    );

    fireEvent.click(screen.getByTestId('btn-confirm'));

    // Buttons should be disabled while acting
    expect(screen.getByTestId('btn-confirm')).toBeDisabled();
    expect(screen.getByTestId('btn-false-alarm')).toBeDisabled();
    expect(screen.getByTestId('btn-request-info')).toBeDisabled();
  });

  it('shows countdown timer', () => {
    renderModal();

    // Timer should show close to 2:00 (since createdAt = now)
    const timerEl = screen.getByTestId('countdown-timer');
    expect(timerEl).toBeInTheDocument();
    // Timer text should contain a digit pattern like "1:59" or "2:00"
    expect(timerEl.textContent).toMatch(/^\d:\d{2}$/);
  });

  it('closes modal when timer reaches zero', () => {
    // Set createdAt to 3 minutes ago (beyond the 2-minute window)
    const expiredAlert: Alert = {
      ...mockAlert,
      createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    };

    render(
      <AlertConfirmationModal
        alert={expiredAlert}
        onConfirm={mockOnConfirm}
        onFalseAlarm={mockOnFalseAlarm}
        onRequestInfo={mockOnRequestInfo}
        onClose={mockOnClose}
      />,
    );

    // Modal should auto-close immediately when timer is already at zero
    expect(mockOnClose).toHaveBeenCalled();
  });
});
