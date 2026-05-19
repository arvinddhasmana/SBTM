import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ActiveRouteScreen from './ActiveRouteScreen';

// Mock all external dependencies
jest.mock('react-native-maps', () => {
  const ReactNative = require('react-native');
  const ReactModule = require('react');
  const MockMapView = ReactModule.forwardRef((props: any, ref: any) => (
    <ReactNative.View ref={ref} testID="map-view" onPress={props.onPress}>
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

jest.mock('react-native-svg', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: RN.View,
    Svg: RN.View,
    Path: RN.View,
    Circle: RN.View,
    Line: RN.View,
    Rect: RN.View,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: any) => children,
}));

jest.mock('../services/gps.service', () => ({
  GPSService: {
    requestPermissions: jest.fn().mockResolvedValue(undefined),
    getCurrentLocation: jest.fn().mockResolvedValue({
      coords: { latitude: 45.35, longitude: -75.79, heading: 0, speed: 10 },
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

jest.mock('../hooks/useRouteStatus', () => ({
  useRouteStatus: jest.fn(() => ({ status: 'normal', infoRequestCount: 0 })),
}));

jest.mock('../hooks/usePanicDetection', () => ({
  usePanicDetection: jest.fn(() => ({ registerTap: jest.fn() })),
}));

jest.mock('../components/PanicCountdownModal', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: ({ visible, reason }: any) =>
      visible ? (
        <RN.View testID="panic-countdown-modal">
          <RN.Text>{reason}</RN.Text>
        </RN.View>
      ) : null,
  };
});

jest.mock('../utils/polyline', () => ({
  decodePolyline: jest.fn(() => []),
}));

jest.mock('expo-location', () => ({
  watchPositionAsync: jest.fn().mockResolvedValue({ remove: jest.fn() }),
  Accuracy: { High: 6 },
}));

jest.mock('../services/api.service', () => ({
  get: jest.fn(),
  post: jest.fn(),
  create: jest.fn(() => ({
    interceptors: { request: { use: jest.fn() } },
  })),
}));

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
    visitedStopIds: [],
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

  it('renders the route name in collapsed panel', () => {
    render(<ActiveRouteScreen navigation={mockNavigation} />);
    expect(screen.getByText('Morning Route')).toBeTruthy();
  });

  it('renders direction badge', () => {
    render(<ActiveRouteScreen navigation={mockNavigation} />);
    expect(screen.getByText('AM')).toBeTruthy();
  });

  it('renders PANIC button always visible in collapsed strip', () => {
    render(<ActiveRouteScreen navigation={mockNavigation} />);
    expect(screen.getByText('PANIC')).toBeTruthy();
  });

  it('renders action buttons in expandable section', () => {
    render(<ActiveRouteScreen navigation={mockNavigation} />);
    expect(screen.getByText('Roster')).toBeTruthy();
    expect(screen.getByText('Messages')).toBeTruthy();
    expect(screen.getByText('End')).toBeTruthy();
  });

  it('renders Report Incident button', () => {
    render(<ActiveRouteScreen navigation={mockNavigation} />);
    expect(screen.getByText('Report Incident')).toBeTruthy();
  });

  it('renders PM direction for PM route', () => {
    setStoreState({ routeDirection: 'PM' });
    render(<ActiveRouteScreen navigation={mockNavigation} />);
    expect(screen.getByText('PM')).toBeTruthy();
  });

  it('renders speed indicator', () => {
    render(<ActiveRouteScreen navigation={mockNavigation} />);
    expect(screen.getByText('km/h')).toBeTruthy();
  });
});
