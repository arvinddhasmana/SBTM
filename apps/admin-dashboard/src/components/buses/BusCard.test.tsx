import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BusCard from './BusCard';
import BusList from './BusList';
import type { LiveLocation, Route } from '../../types';

const mockLocation: LiveLocation = {
  routeId: 'ROUTE-PM',
  vehicleId: 'BUS-01',
  lastUpdate: new Date().toISOString(),
  position: { lat: 45.39, lng: -75.71 },
  etaToNextStopMinutes: 5,
  deviationFlag: false,
  status: 'normal',
};

const mockRoute: Route = {
  id: 'ROUTE-PM',
  name: 'PM Route',
  schoolId: 's1',
  direction: 'PM',
  startTime: '15:00',
  estimatedDuration: 60,
  stops: [],
};

describe('BusCard', () => {
  it('renders vehicle ID and route name', () => {
    render(<BusCard location={mockLocation} route={mockRoute} />);
    expect(screen.getByText('BUS-01')).toBeInTheDocument();
    expect(screen.getByText('PM Route')).toBeInTheDocument();
  });

  it('shows status badge', () => {
    render(<BusCard location={mockLocation} />);
    expect(screen.getByText('normal')).toBeInTheDocument();
  });

  it('shows deviation flag when present', () => {
    const devLoc = { ...mockLocation, deviationFlag: true };
    render(<BusCard location={devLoc} />);
    expect(screen.getByText('DEV')).toBeInTheDocument();
  });

  it('shows ETA', () => {
    render(<BusCard location={mockLocation} />);
    expect(screen.getByText('ETA 5m')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<BusCard location={mockLocation} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('bus-card-BUS-01'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies emergency status style', () => {
    const emergencyLoc = { ...mockLocation, status: 'emergency' as const };
    render(<BusCard location={emergencyLoc} />);
    expect(screen.getByText('emergency')).toBeInTheDocument();
  });
});

describe('BusList', () => {
  it('renders bus cards for each location', () => {
    render(<BusList locations={[mockLocation]} routes={[mockRoute]} onBusClick={() => {}} />);
    expect(screen.getByText('BUS-01')).toBeInTheDocument();
  });

  it('shows empty message when no buses', () => {
    render(<BusList locations={[]} routes={[]} />);
    expect(screen.getByText('No buses on route')).toBeInTheDocument();
  });

  it('calls onBusClick when a bus card is clicked', () => {
    const onBusClick = vi.fn();
    render(<BusList locations={[mockLocation]} routes={[mockRoute]} onBusClick={onBusClick} />);
    fireEvent.click(screen.getByTestId('bus-card-BUS-01'));
    expect(onBusClick).toHaveBeenCalledWith(mockLocation);
  });
});
