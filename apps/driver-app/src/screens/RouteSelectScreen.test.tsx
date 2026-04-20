import React from 'react';
import { render, screen } from '@testing-library/react-native';
import RouteSelectScreen from './RouteSelectScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock the Zustand store
const mockLogout = jest.fn();
const mockSetActiveRoute = jest.fn();

jest.mock('../store/useDriverStore', () => {
  const store = jest.fn((selector: any) => {
    const state = {
      driver: {
        id: 'driver-1',
        name: 'John Doe',
        email: 'john@test.com',
        assignedRoutes: [
          {
            id: 'route-1',
            name: 'Morning Route',
            schoolId: 'school-1',
            vehicleId: 'bus-1',
            startTime: '07:30',
            endTime: '08:30',
            direction: 'AM',
            schoolName: 'Greenfield Elementary',
          },
          {
            id: 'route-2',
            name: 'Afternoon Route',
            schoolId: 'school-1',
            vehicleId: 'bus-1',
            startTime: '15:00',
            endTime: '16:00',
            direction: 'PM',
            schoolName: 'Greenfield Elementary',
          },
        ],
      },
      setActiveRoute: mockSetActiveRoute,
    };
    return selector(state);
  });
  store.getState = jest.fn(() => ({ logout: mockLogout }));
  return { useDriverStore: store };
});

// Mock react-native Alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

const mockNavigation = { navigate: jest.fn() };

describe('RouteSelectScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the driver welcome message', () => {
    render(<RouteSelectScreen navigation={mockNavigation} />);
    expect(screen.getByText('Welcome, John Doe')).toBeTruthy();
  });

  it('renders the list of assigned routes', () => {
    render(<RouteSelectScreen navigation={mockNavigation} />);
    expect(screen.getByText('Morning Route')).toBeTruthy();
    expect(screen.getByText('Afternoon Route')).toBeTruthy();
  });

  it('displays formatted start times for routes', () => {
    render(<RouteSelectScreen navigation={mockNavigation} />);
    expect(screen.getByText('Start: 7:30 AM')).toBeTruthy();
    expect(screen.getByText('Start: 3:00 PM')).toBeTruthy();
  });

  it('renders a Log Out button', () => {
    render(<RouteSelectScreen navigation={mockNavigation} />);
    expect(screen.getByText('Log Out')).toBeTruthy();
  });
});
