import axios from 'axios';
import type { User } from '../../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface LoginResponse {
    user: User;
    token: string;
}

interface MeResponse {
    user: User;
}

export const authApi = {
    /**
     * Login with email and password
     */
    async login(email: string, password: string): Promise<LoginResponse> {
        try {
            const response = await axios.post<LoginResponse>(
                `${API_BASE_URL}/auth/login`,
                { email, password }
            );
            return response.data;
        } catch (error) {
            // For prototype/demo, return mock data if API is not available
            if (axios.isAxiosError(error) && !error.response) {
                // Simulate login for demo purposes
                await new Promise(resolve => setTimeout(resolve, 500));
                return {
                    user: {
                        id: 'admin-001',
                        email: email,
                        name: 'Admin User',
                        role: 'ADMIN',
                    },
                    token: 'mock-jwt-token-' + Date.now(),
                };
            }
            throw error;
        }
    },

    /**
     * Get current user info
     */
    async me(token: string): Promise<MeResponse> {
        const response = await axios.get<MeResponse>(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    },
};
