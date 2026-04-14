import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ActiveRouteScreen from './ActiveRouteScreen';

// Mock all external dependencies
jest.mock('react-native-maps', () => {
  const ReactNative = require('react-native');
  const ReactModule = require('react');
  const MockMapView = ReactModule.forwardRef((props: any, ref: any) => (
    <ReactNative.View ref={ref} testID="map-view">
      {props.children}
    </ReactNative.View>
  ));
  MockMapView.displayName = 'MockMapView';
  return {
    __esModule: true,
    default: MockMapView,
    Marker: ({ children, title }: any) => (
      <ReactNative.View testID={`marker-${title}`}>
        <ReactNative.Text>{title}</ReactNative.Text>
        {children}
      </ReactNative.View>
    ),
    Polyline: () => <ReactNative.View testID="polyline" />,
  };
});

jest.mock('../services/gps.service', () => ({
  GPSService: {
    requestPermissions: jest.fn().mockResolvedValue(undefined),
    getCurrentLocation: jest.fn().mockResolvedValue({
      coords: { latitude: 45.35, longitude: -75.79, heading: 0 },
    }),
    startTracking: jest.fn().mockResolvedValue(undefined),
    stopTracking: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../services/emergency.service', () => ({
  EmergencyService: {
    triggerPanic: jest.fn().mockResolvedValue(undefined),
    reportIncident: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../services/alert.service', () => ({
  AlertService: {
    getActiveAlerts: jest.fn().mockResolvedValue([]),
    getAlertAuditLog: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../hooks/useBleScanning', () => ({
  useBleScanning: jest.fn(() => ({ scanState: 'idle' })),
}));

jest.mock('../utils/polyline', () => ({
  decodePolyline: jest.fn(() => []),
}));

jest.mock('expo-location', () => ({
  watchPositionAsync: jest.fn().mockResolvedValue({ remove: jest.fn() }),
  Accuracy: { High: 6 },
}));

// Mock api.service to prevent import-time errors
jest.mock('../services/api.service', () => ({
  get: jest.fn(),
  post: jest.fn(),
  create: jest.fn(() => ({
    interceptors: { request: { use: jest.fn() } },
  })),
}));

// Mock react-native Alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

const mockNavigation = { navigate: jest.fn(), popToTop: jest.fn() };

let mockStoreState: Record<string, any> = {};

jest.mock('../store/useDriverStore', () => {
  const store = jest.fn((selector: any) => selector(mockStoreState));
  return { useDriverStore: store };
});

function setStoreState(overrides: Partial<typeof mockStoreState>) {
  mockStoreState = {
    activeRoute: {
      id: 'route-1',
      name: 'Morning Route',
      schoolId: 'school-1',
      vehicleId: 'bus-1',
      startTime: '07:30',
      endTime: '08:30',
      direction: 'AM',
      schoolName: 'Greenfield Elementary',
      polyline: '',
    },
    driver: { id: 'driver-1', name: 'John Doe', email: 'john@test.com', assignedRoutes: [] },
    endRoute: jest.fn(),
    stops: [],
    routeDirection: 'AM',
    ...overrides,
  };
}

describe('ActiveRouteScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setStoreState({});
  });

  it('renders No Active Route when activeRoute is null', () => {
    setStoreState({ activeRoute: null });
    render(<ActiveRouteScreen navigation={mockNavigation} />);
    expect(screen.getByText('No Active Route')).toBeTruthy();
  });

  it('renders the route name and direction', () => {
    render(<ActiveRouteScreen navigation={mockNavigation} />);
    expect(screen.getByText('Morning Route')).toBeTruthy();
    expect(screen.getByText('AM Route')).toBeTruthy();
  });

  it('renders Roster, Messages, and End Route buttons', () => {
    render(<ActiveRouteScreen navigation={mockNavigation} />);
    expect(screen.getByText('Roster')).toBeTruthy();
    expect(screen.getByText('Messages')).toBeTruthy();
    expect(screen.getByText('End Route')).toBeTruthy();
  });

  it('renders PANIC and Report Incident buttons', () => {
    render(<ActiveRouteScreen navigation={mockNavigation} />);
    expect(screen.getByText('PANIC')).toBeTruthy();
    expect(screen.getByText('Report Incident')).toBeTruthy();
  });

  it('renders PM Route text for PM direction', () => {
    setStoreState({ routeDirection: 'PM' });
    render(<ActiveRouteScreen navigation={mockNavigation} />);
    expect(screen.getByText('PM Route')).toBeTruthy();
  });
});
