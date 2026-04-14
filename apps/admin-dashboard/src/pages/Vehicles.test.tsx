import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import Vehicles from './Vehicles';

const { mockVehicles } = vi.hoisted(() => ({
  mockVehicles: [
    { id: 'BUS-01', licensePlate: 'ONT-1234', status: 'ACTIVE', schoolId: 's1' },
    { id: 'BUS-02', licensePlate: 'ONT-5678', status: 'MAINTENANCE', schoolId: 's1' },
  ],
}));

vi.mock('../services/api/fleet.api', () => ({
  fleetApi: {
    getAllVehicles: vi.fn().mockResolvedValue(mockVehicles),
    createVehicle: vi.fn().mockResolvedValue({ id: 'BUS-new' }),
    updateVehicle: vi.fn().mockResolvedValue({}),
    deleteVehicle: vi.fn().mockResolvedValue({}),
  },
}));

describe('Vehicles Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderVehicles = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Vehicles />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>,
    );
  };

  it('shows loading state initially', () => {
    renderVehicles();
    expect(screen.getByText(/Loading fleet/i)).toBeInTheDocument();
  });

  it('renders fleet header after loading', async () => {
    renderVehicles();
    await waitFor(() => {
      expect(screen.getByText('Fleet Management')).toBeInTheDocument();
    });
  });

  it('displays vehicle data in the table', async () => {
    renderVehicles();
    await waitFor(() => {
      expect(screen.getByText('BUS-01')).toBeInTheDocument();
      expect(screen.getByText('ONT-1234')).toBeInTheDocument();
      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    });
  });

  it('shows Add Vehicle button', async () => {
    renderVehicles();
    await waitFor(() => {
      expect(screen.getByText('Add Vehicle')).toBeInTheDocument();
    });
  });

  it('opens modal when Add Vehicle is clicked', async () => {
    renderVehicles();
    await waitFor(() => {
      expect(screen.getByText('Add Vehicle')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Vehicle'));

    expect(screen.getByText('Add New Vehicle')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. BUS-101')).toBeInTheDocument();
  });
});
