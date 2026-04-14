import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import Compliance from './Compliance';

const { mockDrivers, mockInspections, mockAuditLogs } = vi.hoisted(() => ({
  mockDrivers: [
    {
      id: 'd-1',
      driver_id: 'DRV-001',
      license_expiry: '2027-06-01',
      background_check_last_date: '2025-12-01',
      medical_check_due_date: '2026-06-01',
      status: 'VALID',
    },
    {
      id: 'd-2',
      driver_id: 'DRV-002',
      license_expiry: '2026-05-01',
      background_check_last_date: '2025-10-01',
      medical_check_due_date: '2026-05-15',
      status: 'EXPIRING_SOON',
    },
    {
      id: 'd-3',
      driver_id: 'DRV-003',
      license_expiry: '2025-01-01',
      background_check_last_date: '2024-01-01',
      medical_check_due_date: '2025-01-01',
      status: 'EXPIRED',
    },
  ],
  mockInspections: [
    {
      id: 'ins-1',
      vehicle_id: 'BUS-01',
      driver_id: 'DRV-001',
      type: 'PRE_TRIP',
      is_passed: true,
      createdAt: new Date().toISOString(),
    },
  ],
  mockAuditLogs: [
    {
      id: 'log-1',
      user_id: 'admin-1',
      action: 'UPDATE_DRIVER',
      resource: 'driver/DRV-001',
      details: { field: 'license' },
      createdAt: new Date().toISOString(),
    },
  ],
}));

vi.mock('../services/api', () => ({
  complianceApi: {
    getAllCompliance: vi.fn().mockResolvedValue(mockDrivers),
    getAllInspections: vi.fn().mockResolvedValue(mockInspections),
    getAuditLogs: vi.fn().mockResolvedValue(mockAuditLogs),
  },
}));

describe('Compliance Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderCompliance = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Compliance />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>,
    );
  };

  it('shows loading state initially', () => {
    renderCompliance();
    expect(screen.getByText(/Loading compliance data/i)).toBeInTheDocument();
  });

  it('renders page header after loading', async () => {
    renderCompliance();
    await waitFor(() => {
      expect(screen.getByText('Compliance & Safety')).toBeInTheDocument();
    });
  });

  it('renders driver compliance stats cards', async () => {
    renderCompliance();
    await waitFor(() => {
      expect(screen.getByText('Compliant Drivers')).toBeInTheDocument();
      expect(screen.getByText('Expiring Soon')).toBeInTheDocument();
      expect(screen.getByText('Expired Docs')).toBeInTheDocument();
    });
  });

  it('displays driver IDs in the table', async () => {
    renderCompliance();
    await waitFor(() => {
      expect(screen.getByText('DRV-001')).toBeInTheDocument();
      expect(screen.getByText('DRV-002')).toBeInTheDocument();
      expect(screen.getByText('DRV-003')).toBeInTheDocument();
    });
  });

  it('switches to inspections tab and shows data', async () => {
    renderCompliance();
    await waitFor(() => {
      expect(screen.getByText('inspections')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('inspections'));

    await waitFor(() => {
      expect(screen.getByText('Recent Vehicle Inspections')).toBeInTheDocument();
      expect(screen.getByText('BUS-01')).toBeInTheDocument();
      expect(screen.getByText('PASS')).toBeInTheDocument();
    });
  });

  it('switches to audit tab and shows log data', async () => {
    renderCompliance();
    await waitFor(() => {
      expect(screen.getByText('audit')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('audit'));

    await waitFor(() => {
      expect(screen.getByText('System Audit Logs')).toBeInTheDocument();
      expect(screen.getByText('admin-1')).toBeInTheDocument();
      expect(screen.getByText('UPDATE_DRIVER')).toBeInTheDocument();
    });
  });
});
