import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AlertCard from './AlertCard';
import type { Alert } from '../../types';

describe('AlertCard', () => {
  const mockAlert: Alert = {
    id: 'alert-001',
    schoolId: 'school-001',
    routeId: 'route-123',
    vehicleId: 'bus-45',
    driverId: 'driver-001',
    timestamp: new Date().toISOString(),
    lat: 45.392,
    lng: -75.713,
    eventType: 'PANIC_BUTTON',
    status: 'ACTIVE',
    description: 'Test alert description',
  };

  it('renders alert card with event type', () => {
    render(
      <BrowserRouter>
        <AlertCard alert={mockAlert} />
      </BrowserRouter>,
    );

    expect(screen.getByText(/PANIC/i)).toBeInTheDocument();
  });

  it('renders alert description', () => {
    render(
      <BrowserRouter>
        <AlertCard alert={mockAlert} />
      </BrowserRouter>,
    );

    expect(screen.getByText(/Test alert description/i)).toBeInTheDocument();
  });

  it('renders active alert without reduced opacity', () => {
    const { container } = render(
      <BrowserRouter>
        <AlertCard alert={mockAlert} />
      </BrowserRouter>,
    );

    const button = screen.getByRole('button');
    expect(button.className).not.toContain('opacity-30');
  });

  it('renders resolved alert with reduced opacity', () => {
    const resolvedAlert = { ...mockAlert, status: 'RESOLVED' as const };
    const { container } = render(
      <BrowserRouter>
        <AlertCard alert={resolvedAlert} />
      </BrowserRouter>,
    );

    const button = screen.getByRole('button');
    expect(button.className).toContain('opacity-50');
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(
      <BrowserRouter>
        <AlertCard alert={mockAlert} onClick={handleClick} />
      </BrowserRouter>,
    );

    screen.getByRole('button').click();
    expect(handleClick).toHaveBeenCalled();
  });

  it('shows vehicle ID', () => {
    render(
      <BrowserRouter>
        <AlertCard alert={mockAlert} />
      </BrowserRouter>,
    );

    expect(screen.getByText(/bus-45/i)).toBeInTheDocument();
  });
});
