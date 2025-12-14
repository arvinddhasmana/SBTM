import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import * as AuthContext from '../context/AuthContext';

// Mock the AuthContext
vi.mock('../context/AuthContext', async () => {
    const actual = await vi.importActual('../context/AuthContext');
    return {
        ...actual,
        useAuth: vi.fn(),
    };
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
                    avatarUrl: 'http://test.com/1.png'
                }
            ]
        };

        vi.mocked(AuthContext.useAuth).mockReturnValue({
            user: mockUser,
            isAuthenticated: true,
            login: vi.fn(),
            logout: vi.fn(),
            isLoading: false
        });

        render(
            <BrowserRouter>
                <Dashboard />
            </BrowserRouter>
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
            children: []
        };

        vi.mocked(AuthContext.useAuth).mockReturnValue({
            user: mockUser,
            isAuthenticated: true,
            login: vi.fn(),
            logout: vi.fn(),
            isLoading: false
        });

        render(
            <BrowserRouter>
                <Dashboard />
            </BrowserRouter>
        );

        expect(screen.getByText(/no children linked to your account/i)).toBeInTheDocument();
    });
});
