import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authApi } from './auth.api';

// Mock axios
vi.mock('axios', () => ({
    default: {
        post: vi.fn(),
        get: vi.fn(),
        isAxiosError: vi.fn((error) => error.isAxiosError),
    },
}));

import axios from 'axios';

describe('authApi', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('login', () => {
        it('should return user and token on successful login', async () => {
            const mockResponse = {
                data: {
                    user: {
                        id: 'admin-001',
                        email: 'admin@example.com',
                        name: 'Admin User',
                        role: 'ADMIN',
                    },
                    token: 'test-jwt-token',
                },
            };

            vi.mocked(axios.post).mockResolvedValueOnce(mockResponse);

            const result = await authApi.login('admin@example.com', 'password');

            expect(result).toEqual(mockResponse.data);
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/auth/login'),
                { email: 'admin@example.com', password: 'password' }
            );
        });

        it('should return mock data when API is unavailable', async () => {
            const networkError = { isAxiosError: true, response: undefined };
            vi.mocked(axios.post).mockRejectedValueOnce(networkError);
            vi.mocked(axios.isAxiosError).mockReturnValueOnce(true);

            const result = await authApi.login('test@example.com', 'password');

            expect(result.user.email).toBe('test@example.com');
            expect(result.user.role).toBe('ADMIN');
            expect(result.token).toContain('mock-jwt-token-');
        });

        it('should throw error on API error with response', async () => {
            const apiError = { isAxiosError: true, response: { status: 401 } };
            vi.mocked(axios.post).mockRejectedValueOnce(apiError);
            vi.mocked(axios.isAxiosError).mockReturnValueOnce(true);

            await expect(authApi.login('test@example.com', 'wrong')).rejects.toEqual(apiError);
        });
    });

    describe('me', () => {
        it('should return current user info', async () => {
            const mockResponse = {
                data: {
                    user: {
                        id: 'admin-001',
                        email: 'admin@example.com',
                        name: 'Admin User',
                        role: 'ADMIN',
                    },
                },
            };

            vi.mocked(axios.get).mockResolvedValueOnce(mockResponse);

            const result = await authApi.me('test-token');

            expect(result).toEqual(mockResponse.data);
            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/auth/me'),
                { headers: { Authorization: 'Bearer test-token' } }
            );
        });
    });
});
