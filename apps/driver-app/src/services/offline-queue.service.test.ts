import { OfflineQueueService } from './offline-queue.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('OfflineQueueService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('should enqueue an event and persist to AsyncStorage', async () => {
    await OfflineQueueService.enqueue('gps', '/routes/locations', { lat: 45, lng: -75 });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@sbtm/offline_queue', expect.any(String));

    const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
    expect(savedData).toHaveLength(1);
    expect(savedData[0].type).toBe('gps');
    expect(savedData[0].endpoint).toBe('/routes/locations');
    expect(savedData[0].retries).toBe(0);
  });

  it('should evict the oldest event when queue reaches max capacity', async () => {
    // Simulate a queue that is already at max size (500)
    const existingQueue = Array.from({ length: 500 }, (_, i) => ({
      id: `event-${i}`,
      type: 'gps',
      endpoint: '/test',
      payload: {},
      retries: 0,
      createdAt: new Date().toISOString(),
    }));
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingQueue));

    await OfflineQueueService.enqueue('emergency', '/emergency-events', { panic: true });

    const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
    expect(savedData).toHaveLength(500);
    // The oldest (event-0) should have been evicted
    expect(savedData[0].id).toBe('event-1');
    // The new event should be at the end
    expect(savedData[savedData.length - 1].type).toBe('emergency');
  });

  it('should flush all events by calling the poster function', async () => {
    const queuedEvents = [
      { id: 'e1', type: 'gps', endpoint: '/gps', payload: { lat: 1 }, retries: 0, createdAt: '' },
      {
        id: 'e2',
        type: 'emergency',
        endpoint: '/emergency',
        payload: { alert: true },
        retries: 0,
        createdAt: '',
      },
    ];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(queuedEvents));

    const poster = jest.fn().mockResolvedValue(undefined);
    await OfflineQueueService.flush(poster);

    expect(poster).toHaveBeenCalledTimes(2);
    expect(poster).toHaveBeenCalledWith('/gps', { lat: 1 });
    expect(poster).toHaveBeenCalledWith('/emergency', { alert: true });

    // Queue should be cleared after successful flush
    const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
    expect(savedData).toHaveLength(0);
  });

  it('should retain failed events with incremented retry count', async () => {
    const queuedEvents = [
      { id: 'e1', type: 'gps', endpoint: '/gps', payload: {}, retries: 0, createdAt: '' },
    ];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(queuedEvents));

    const poster = jest.fn().mockRejectedValue(new Error('Still offline'));
    await OfflineQueueService.flush(poster);

    const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
    expect(savedData).toHaveLength(1);
    expect(savedData[0].retries).toBe(1);
  });

  it('should drop events that exceed MAX_RETRIES (5)', async () => {
    const queuedEvents = [
      { id: 'e1', type: 'gps', endpoint: '/gps', payload: {}, retries: 4, createdAt: '' },
    ];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(queuedEvents));

    const poster = jest.fn().mockRejectedValue(new Error('Failed'));
    await OfflineQueueService.flush(poster);

    // retries would be 5 which equals MAX_RETRIES, so event should be dropped
    const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
    expect(savedData).toHaveLength(0);
  });

  it('should return current queue size', async () => {
    const queuedEvents = [
      { id: 'e1', type: 'gps', endpoint: '/gps', payload: {}, retries: 0, createdAt: '' },
      { id: 'e2', type: 'gps', endpoint: '/gps', payload: {}, retries: 0, createdAt: '' },
    ];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(queuedEvents));

    const size = await OfflineQueueService.size();

    expect(size).toBe(2);
  });

  it('should clear the entire queue', async () => {
    await OfflineQueueService.clear();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@sbtm/offline_queue', '[]');
  });

  it('should not call poster when queue is empty', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');

    const poster = jest.fn();
    await OfflineQueueService.flush(poster);

    expect(poster).not.toHaveBeenCalled();
  });
});
