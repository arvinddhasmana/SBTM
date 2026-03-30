import { MOCK_USER, MOCK_TOKEN } from '../data/auth.data';

export const mockAuthApi = {
    login: async (email: string, _password?: string) => ({
        accessToken: MOCK_TOKEN,
        user: { ...MOCK_USER, email },
    }),
    getProfile: async () => MOCK_USER,
};
