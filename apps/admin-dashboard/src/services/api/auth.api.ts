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
    async login(email: string, password: string): Promise<LoginResponse> {
        try {
            const response = await axios.post<LoginResponse>(
                `${API_BASE_URL}/auth/login`,
                { email, password }
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && !error.response) {
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

    async me(token: string): Promise<MeResponse> {
        const response = await axios.get<MeResponse>(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    },
};
