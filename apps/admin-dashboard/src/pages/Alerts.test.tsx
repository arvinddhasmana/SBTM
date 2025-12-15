import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import Alerts from './Alerts';

// Mock the API
vi.mock('../services/api', () => ({
    alertsApi: {
        getAllAlerts: vi.fn().mockResolvedValue([
            { id: 'alert-1', eventType: 'PANIC_BUTTON', status: 'ACTIVE', timestamp: new Date().toISOString(), routeId: 'route-1', vehicleId: 'bus-1', description: 'Test alert' },
            { id: 'alert-2', eventType: 'INCIDENT', status: 'RESOLVED', timestamp: new Date().toISOString(), routeId: 'route-2', vehicleId: 'bus-2', description: 'Resolved alert' },
        ]),
        resolveAlert: vi.fn().mockImplementation((id) => Promise.resolve({ id, status: 'RESOLVED' })),
    },
}));

describe('Alerts Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderAlerts = () => {
        return render(
            <BrowserRouter>
                <AuthProvider>
                    <Alerts />
                </AuthProvider>
            </BrowserRouter>
        );
    };

    it('shows loading state initially', () => {
        renderAlerts();
        expect(screen.getByText(/Loading alerts/i)).toBeInTheDocument();
    });

    it('renders alerts header after loading', async () => {
        renderAlerts();

        await waitFor(() => {
            expect(screen.getByText('Alerts Management')).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('renders filter buttons', async () => {
        renderAlerts();

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
        }, { timeout: 3000 });
    });
});
