import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AlertCard from './AlertCard';
import type { Alert } from '../../types';

describe('AlertCard', () => {
    const mockAlert: Alert = {
        id: 'alert-001',
        routeId: 'route-123',
        vehicleId: 'bus-45',
        timestamp: new Date().toISOString(),
        eventType: 'PANIC_BUTTON',
        status: 'ACTIVE',
        description: 'Test alert description',
    };

    it('renders alert card with event type', () => {
        render(
            <BrowserRouter>
                <AlertCard alert={mockAlert} />
            </BrowserRouter>
        );

        expect(screen.getByText(/Panic Button/i)).toBeInTheDocument();
    });

    it('renders alert description', () => {
        render(
            <BrowserRouter>
                <AlertCard alert={mockAlert} />
            </BrowserRouter>
        );

        expect(screen.getByText(/Test alert description/i)).toBeInTheDocument();
    });

    it('renders active status badge for active alert', () => {
        render(
            <BrowserRouter>
                <AlertCard alert={mockAlert} />
            </BrowserRouter>
        );

        expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders resolved status badge for resolved alert', () => {
        const resolvedAlert = { ...mockAlert, status: 'RESOLVED' as const };
        render(
            <BrowserRouter>
                <AlertCard alert={resolvedAlert} />
            </BrowserRouter>
        );

        expect(screen.getByText('Resolved')).toBeInTheDocument();
    });

    it('calls onClick when clicked', () => {
        const handleClick = vi.fn();
        render(
            <BrowserRouter>
                <AlertCard alert={mockAlert} onClick={handleClick} />
            </BrowserRouter>
        );

        screen.getByRole('button').click();
        expect(handleClick).toHaveBeenCalled();
    });

    it('shows vehicle ID', () => {
        render(
            <BrowserRouter>
                <AlertCard alert={mockAlert} />
            </BrowserRouter>
        );

        expect(screen.getByText(/bus-45/i)).toBeInTheDocument();
    });
});
