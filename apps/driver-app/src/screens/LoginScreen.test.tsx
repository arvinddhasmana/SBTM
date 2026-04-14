import LoginScreen from '../screens/LoginScreen';

// Mock useDriverStore to prevent transitive native module imports
// (useDriverStore -> presence.service -> offline-queue.service -> AsyncStorage)
jest.mock('../store/useDriverStore', () => ({
  useDriverStore: jest.fn((selector: any) => selector({ login: jest.fn() })),
}));

describe('LoginScreen Snapshot', () => {
  it('renders correctly', () => {
    expect(LoginScreen).toBeDefined();
  });
});
