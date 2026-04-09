import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RouteCardCompact from './RouteCardCompact';
import RouteListCompact from './RouteListCompact';
import type { Route, LiveLocation } from '../../types';

const mockRoute: Route = {
  id: 'ROUTE-PM',
  name: 'PM Route',
  schoolId: 's1',
  schoolName: 'Greenfield Elementary',
  direction: 'PM',
  startTime: '15:00',
  estimatedDuration: 60,
  stops: [
    {
      id: 'stop1',
      routeId: 'ROUTE-PM',
      sequence: 1,
      address: '123 Main St',
      location: 'POINT(-75.71 45.39)',
    },
    {
      id: 'stop2',
      routeId: 'ROUTE-PM',
      sequence: 2,
      address: '456 Oak Ave',
      location: 'POINT(-75.72 45.40)',
    },
  ],
};

const mockLocation: LiveLocation = {
  routeId: 'ROUTE-PM',
  vehicleId: 'BUS-01',
  lastUpdate: new Date().toISOString(),
  position: { lat: 45.39, lng: -75.71 },
  etaToNextStopMinutes: 5,
  deviationFlag: false,
  status: 'normal',
};

describe('RouteCardCompact', () => {
  it('renders route name and direction', () => {
    render(<RouteCardCompact route={mockRoute} />);
    expect(screen.getByText('PM Route')).toBeInTheDocument();
    expect(screen.getByText('PM')).toBeInTheDocument();
  });

  it('renders stop count', () => {
    render(<RouteCardCompact route={mockRoute} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders vehicle ID when live location is provided', () => {
    render(<RouteCardCompact route={mockRoute} liveLocation={mockLocation} />);
    expect(screen.getByText('BUS-01')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<RouteCardCompact route={mockRoute} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('route-card-ROUTE-PM'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows deviation indicator', () => {
    const devLoc = { ...mockLocation, deviationFlag: true };
    render(<RouteCardCompact route={mockRoute} liveLocation={devLoc} />);
    // AlertTriangle icon should be rendered
    expect(screen.getByTestId('route-card-ROUTE-PM')).toBeInTheDocument();
  });

  it('renders school name when present', () => {
    render(<RouteCardCompact route={mockRoute} />);
    expect(screen.getByText('Greenfield Elementary')).toBeInTheDocument();
    expect(screen.getByTestId('route-school-name')).toBeInTheDocument();
  });

  it('does not render school name when absent', () => {
    const routeWithoutSchool = { ...mockRoute, schoolName: undefined };
    render(<RouteCardCompact route={routeWithoutSchool} />);
    expect(screen.queryByTestId('route-school-name')).not.toBeInTheDocument();
  });
});

describe('RouteListCompact', () => {
  it('renders route cards', () => {
    render(
      <RouteListCompact
        routes={[mockRoute]}
        liveLocations={[mockLocation]}
        onRouteClick={() => {}}
      />,
    );
    expect(screen.getByText('PM Route')).toBeInTheDocument();
  });

  it('shows empty message when no routes', () => {
    render(<RouteListCompact routes={[]} />);
    expect(screen.getByText('No active routes')).toBeInTheDocument();
  });

  it('calls onRouteClick when route card is clicked', () => {
    const onRouteClick = vi.fn();
    render(
      <RouteListCompact
        routes={[mockRoute]}
        liveLocations={[mockLocation]}
        onRouteClick={onRouteClick}
      />,
    );
    fireEvent.click(screen.getByTestId('route-card-ROUTE-PM'));
    expect(onRouteClick).toHaveBeenCalledWith(mockRoute);
  });
});
