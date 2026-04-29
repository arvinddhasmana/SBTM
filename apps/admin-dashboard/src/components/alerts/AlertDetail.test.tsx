import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import AlertDetail from './AlertDetail';
import type { Alert, AlertAuditEntry } from '../../types';

function renderWithQueryClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('AlertDetail', () => {
  const baseAlert: Alert = {
    id: 'alert-001',
    schoolId: 'school-001',
    routeId: 'route-123',
    vehicleId: 'bus-45',
    driverId: 'driver-001',
    timestamp: new Date().toISOString(),
    lat: 45.392,
    lng: -75.713,
    eventType: 'INCIDENT',
    status: 'ACTIVE',
    tier: 'TIER_1',
    description: 'Test alert description',
  };

  const defaultProps = {
    alert: baseAlert,
    onClose: vi.fn(),
    onResolve: vi.fn(),
  };

  it('renders alert details', () => {
    renderWithQueryClient(<AlertDetail {...defaultProps} />);
    expect(screen.getByText('Alert Details')).toBeInTheDocument();
    expect(screen.getByText('Test alert description')).toBeInTheDocument();
    expect(screen.getByText('bus-45')).toBeInTheDocument();
    expect(screen.getByText('route-123')).toBeInTheDocument();
  });

  it('shows tier badge', () => {
    renderWithQueryClient(<AlertDetail {...defaultProps} />);
    expect(screen.getByText('Tier 1 — Safety Critical')).toBeInTheDocument();
  });

  describe('ACTIVE alert', () => {
    it('shows Resolve Incident button', () => {
      renderWithQueryClient(<AlertDetail {...defaultProps} />);
      expect(screen.getByTestId('btn-resolve-confirmed')).toBeInTheDocument();
    });

    it('shows Add Status Update button when handler provided', () => {
      renderWithQueryClient(<AlertDetail {...defaultProps} onAddStatusUpdate={vi.fn()} />);
      expect(screen.getByTestId('btn-add-update')).toBeInTheDocument();
    });
  });

  describe('CONFIRMED alert', () => {
    const confirmedAlert: Alert = {
      ...baseAlert,
      status: 'CONFIRMED',
      confirmedAt: new Date().toISOString(),
      confirmedBy: 'admin-001',
    };

    it('shows Add Status Update and Resolve Incident buttons', () => {
      renderWithQueryClient(
        <AlertDetail {...defaultProps} alert={confirmedAlert} onAddStatusUpdate={vi.fn()} />,
      );
      expect(screen.getByTestId('btn-add-update')).toBeInTheDocument();
      expect(screen.getByTestId('btn-resolve-confirmed')).toBeInTheDocument();
    });

    it('shows confirmed status badge', () => {
      renderWithQueryClient(<AlertDetail {...defaultProps} alert={confirmedAlert} />);
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
    });

    it('opens status update textarea on button click', () => {
      renderWithQueryClient(
        <AlertDetail {...defaultProps} alert={confirmedAlert} onAddStatusUpdate={vi.fn()} />,
      );
      fireEvent.click(screen.getByTestId('btn-add-update'));
      expect(screen.getByTestId('update-notes-input')).toBeInTheDocument();
      expect(screen.getByTestId('submit-update-btn')).toBeInTheDocument();
    });

    it('opens resolve textarea on Resolve Incident click', () => {
      renderWithQueryClient(<AlertDetail {...defaultProps} alert={confirmedAlert} />);
      fireEvent.click(screen.getByTestId('btn-resolve-confirmed'));
      expect(screen.getByTestId('resolve-notes-input')).toBeInTheDocument();
      expect(screen.getByTestId('submit-resolve-btn')).toBeInTheDocument();
    });
  });

  describe('PENDING_CONFIRMATION alert', () => {
    const pendingAlert: Alert = {
      ...baseAlert,
      status: 'PENDING_CONFIRMATION',
    };

    it('shows Tier 1 confirmation buttons', () => {
      renderWithQueryClient(
        <AlertDetail
          {...defaultProps}
          alert={pendingAlert}
          onConfirm={vi.fn()}
          onFalseAlarm={vi.fn()}
          onRequestInfo={vi.fn()}
        />,
      );
      expect(screen.getByText('Confirm')).toBeInTheDocument();
      expect(screen.getByText('False Alarm')).toBeInTheDocument();
      expect(screen.getByText('Request Info')).toBeInTheDocument();
    });
  });

  describe('RESOLVED alert', () => {
    const resolvedAlert: Alert = {
      ...baseAlert,
      status: 'RESOLVED',
    };

    it('shows only Close button', () => {
      renderWithQueryClient(<AlertDetail {...defaultProps} alert={resolvedAlert} />);
      expect(screen.getByText('Close')).toBeInTheDocument();
      expect(screen.queryByTestId('btn-add-update')).not.toBeInTheDocument();
      expect(screen.queryByTestId('btn-resolve-confirmed')).not.toBeInTheDocument();
    });
  });

  describe('audit timeline', () => {
    const auditTrail: AlertAuditEntry[] = [
      {
        id: 'audit-1',
        alertId: 'alert-001',
        eventType: 'CREATED',
        actorUserId: null,
        actorRole: null,
        notes: null,
        escalationLevel: null,
        eventTimestamp: new Date().toISOString(),
      },
      {
        id: 'audit-2',
        alertId: 'alert-001',
        eventType: 'STATUS_UPDATE',
        actorUserId: 'admin-001',
        actorRole: 'SCHOOL_ADMIN',
        notes: 'Police arrived on scene',
        escalationLevel: null,
        eventTimestamp: new Date().toISOString(),
      },
    ];

    it('renders audit timeline when provided', () => {
      renderWithQueryClient(<AlertDetail {...defaultProps} auditTrail={auditTrail} />);
      expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Status Update')).toBeInTheDocument();
      expect(screen.getByText('Police arrived on scene')).toBeInTheDocument();
    });

    it('does not render timeline when empty', () => {
      renderWithQueryClient(<AlertDetail {...defaultProps} auditTrail={[]} />);
      expect(screen.queryByText('Activity Timeline')).not.toBeInTheDocument();
    });
  });
});
