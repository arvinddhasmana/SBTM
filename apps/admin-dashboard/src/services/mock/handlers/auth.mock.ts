import { MOCK_USER } from '../data/auth.data';

export const mockAuthApi = {
  login: async (email: string, _password?: string) => ({
    user: { ...MOCK_USER, email },
  }),
  logout: async () => {},
  me: async () => ({ user: MOCK_USER }),
};
