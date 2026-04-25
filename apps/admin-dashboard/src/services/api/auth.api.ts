import type { User } from '../../types';
import { apiClient, AUTH_TOKEN_KEY } from './api-client';

interface LoginResponse {
  user: User;
}

interface MeResponse {
  user: User;
}

interface GatewayUser {
  id: string;
  email: string;
  role: User['role'];
  firstName?: string;
  lastName?: string;
  schoolId?: string;
  boardId?: string;
}

interface GatewayLoginResponse {
  user: GatewayUser;
  accessToken?: string;
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post<GatewayLoginResponse>('/api/v1/auth/login', {
      email,
      password,
    });
    if (response.data.accessToken) {
      localStorage.setItem(AUTH_TOKEN_KEY, response.data.accessToken);
    }
    const nameParts = [response.data.user.firstName, response.data.user.lastName].filter(Boolean);

    return {
      user: {
        id: response.data.user.id,
        email: response.data.user.email,
        role: response.data.user.role,
        name: nameParts.length ? nameParts.join(' ') : response.data.user.email,
        schoolId: response.data.user.schoolId,
        boardId: response.data.user.boardId,
      },
    };
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/v1/auth/logout');
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  },

  async me(): Promise<MeResponse> {
    const response = await apiClient.get<GatewayUser>('/api/v1/auth/me');
    const nameParts = [response.data.firstName, response.data.lastName].filter(Boolean);

    return {
      user: {
        id: response.data.id,
        email: response.data.email,
        role: response.data.role,
        name: nameParts.length ? nameParts.join(' ') : response.data.email,
        schoolId: response.data.schoolId,
        boardId: response.data.boardId,
      },
    };
  },
};
