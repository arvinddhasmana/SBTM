import React from 'react';
import { render, screen } from '@testing-library/react-native';
import RosterScreen from './RosterScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock react-native-svg
jest.mock('react-native-svg', () => ({
  SvgXml: () => 'SvgXml',
}));

// Mock react-native Alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

const mockToggleStudentStatus = jest.fn();
const mockRefreshRoster = jest.fn();
const mockBoardAll = jest.fn();
const mockAlightAll = jest.fn();

let mockState: Record<string, any> = {};

jest.mock('../store/useDriverStore', () => {
  const store = jest.fn((selector: any) => selector(mockState));
  return { useDriverStore: store };
});

function setMockState(overrides: Partial<typeof mockState>) {
  mockState = {
    students: [],
    stops: [],
    rosterLoadState: 'loaded',
    rosterError: null,
    isOffline: false,
    visitedStopIds: [],
    toggleStudentStatus: mockToggleStudentStatus,
    refreshRoster: mockRefreshRoster,
    routeDirection: 'AM',
    boardAll: mockBoardAll,
    alightAll: mockAlightAll,
    ...overrides,
  };
}

describe('RosterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockState({});
  });

  it('renders loading state', () => {
    setMockState({ rosterLoadState: 'loading' });
    render(<RosterScreen />);
    expect(screen.getByText(/Loading roster/)).toBeTruthy();
  });

  it('renders empty roster message', () => {
    setMockState({ students: [], rosterLoadState: 'loaded' });
    render(<RosterScreen />);
    expect(screen.getByText('No students on this route yet.')).toBeTruthy();
  });

  it('renders students with their names and status', () => {
    setMockState({
      students: [
        { id: 's1', name: 'Alice Johnson', status: 'NOT_BOARDED', stopId: 'stop-1' },
        { id: 's2', name: 'Bob Smith', status: 'BOARDED', stopId: 'stop-1' },
      ],
      stops: [{ id: 'stop-1', stopName: 'Oak Street', sequence: 1, arrivalTime: '07:45' }],
    });

    render(<RosterScreen />);
    expect(screen.getByText('Alice Johnson')).toBeTruthy();
    expect(screen.getByText('Bob Smith')).toBeTruthy();
    expect(screen.getByText('Not Boarded')).toBeTruthy();
    expect(screen.getByText('Boarded')).toBeTruthy();
  });

  it('shows offline banner when isOffline is true', () => {
    setMockState({ isOffline: true });
    render(<RosterScreen />);
    expect(screen.getByText(/Offline/)).toBeTruthy();
  });

  it('renders error state with retry button', () => {
    setMockState({
      rosterLoadState: 'error',
      rosterError: 'Failed to load roster',
    });
    render(<RosterScreen />);
    expect(screen.getByText('Failed to load roster')).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();
  });
});
