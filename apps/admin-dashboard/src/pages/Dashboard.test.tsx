import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import Dashboard from './Dashboard';

// Mock the APIs
vi.mock('../services/api', () => ({
    alertsApi: {
        getActiveAlerts: vi.fn().mockResolvedValue([]),
    },
    routesApi: {
        getActiveRoutes: vi.fn().mockResolvedValue([]),
        getAllLiveLocations: vi.fn().mockResolvedValue([]),
    },
    presenceApi: {
        getAllBoardedStudents: vi.fn().mockResolvedValue([]),
    },
}));

// Mock Leaflet
vi.mock('leaflet', () => ({
    default: {
        map: vi.fn(() => ({
            setView: vi.fn().mockReturnThis(),
            remove: vi.fn(),
            fitBounds: vi.fn(),
        })),
        tileLayer: vi.fn(() => ({
            addTo: vi.fn(),
        })),
        marker: vi.fn(() => ({
            addTo: vi.fn().mockReturnThis(),
            on: vi.fn().mockReturnThis(),
            bindPopup: vi.fn().mockReturnThis(),
            remove: vi.fn(),
        })),
        divIcon: vi.fn(),
        latLngBounds: vi.fn(),
    },
}));

describe('Dashboard Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderDashboard = () => {
        return render(
            <BrowserRouter>
                <AuthProvider>
                    <Dashboard />
                </AuthProvider>
            </BrowserRouter>
        );
    };

    it('shows loading state initially', () => {
        renderDashboard();
        expect(screen.getByText(/Loading dashboard/i)).toBeInTheDocument();
    });

    it('renders dashboard content after loading', async () => {
        renderDashboard();

        await waitFor(() => {
            expect(screen.getByText('Dashboard')).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('renders stat cards after loading', async () => {
        renderDashboard();

        await waitFor(() => {
            expect(screen.getByText('Active Routes')).toBeInTheDocument();
        }, { timeout: 3000 });
    });
});
