import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import AlertMessagesScreen from './AlertMessagesScreen';
import { AlertService } from '../services/alert.service';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock the alert service
jest.mock('../services/alert.service', () => ({
  AlertService: {
    getActiveAlerts: jest.fn(),
    getAlertAuditLog: jest.fn(),
    addStatusUpdate: jest.fn(),
  },
}));

// Mock react-native Alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Mock api.service to prevent import-time errors
jest.mock('../services/api.service', () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  create: jest.fn(() => ({
    interceptors: { request: { use: jest.fn() } },
  })),
}));

jest.mock('../store/useDriverStore', () => {
  const store = jest.fn((selector: any) =>
    selector({
      activeRoute: { id: 'route-1', name: 'Morning Route', vehicleId: 'bus-1' },
      driver: { id: 'driver-1', name: 'John Doe' },
    }),
  );
  return { useDriverStore: store };
});

describe('AlertMessagesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (AlertService.getActiveAlerts as jest.Mock).mockReturnValue(new Promise(() => {})); // never resolves
    render(<AlertMessagesScreen />);
    expect(screen.getByText(/Loading alerts/)).toBeTruthy();
  });

  it('renders empty state when no alerts exist', async () => {
    (AlertService.getActiveAlerts as jest.Mock).mockResolvedValue([]);
    render(<AlertMessagesScreen />);

    await waitFor(() => {
      expect(screen.getByText('No active alerts on this route.')).toBeTruthy();
    });
  });

  it('renders alert cards when alerts exist', async () => {
    (AlertService.getActiveAlerts as jest.Mock).mockResolvedValue([
      {
        id: 'a1',
        vehicleId: 'bus-1',
        routeId: 'route-1',
        eventType: 'PANIC_BUTTON',
        status: 'ACTIVE',
        timestamp: '2026-01-01T10:00:00Z',
        createdAt: '2026-01-01T10:00:00Z',
      },
    ]);
    (AlertService.getAlertAuditLog as jest.Mock).mockResolvedValue([
      {
        id: 'log1',
        alertId: 'a1',
        action: 'INFO_REQUESTED',
        notes: 'Please provide details',
        actorRole: 'ADMIN',
        timestamp: '2026-01-01T10:05:00Z',
      },
    ]);

    render(<AlertMessagesScreen />);

    await waitFor(() => {
      expect(screen.getByText('PANIC BUTTON')).toBeTruthy();
    });
  });

  it('renders header and subheader text', async () => {
    (AlertService.getActiveAlerts as jest.Mock).mockResolvedValue([]);
    render(<AlertMessagesScreen />);

    await waitFor(() => {
      expect(screen.getByText('Alert Messages')).toBeTruthy();
    });
  });
});
