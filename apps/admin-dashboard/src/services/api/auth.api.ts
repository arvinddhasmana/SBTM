import type { AnchorKind, User, UserRole } from '../../types';
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
  role: UserRole;
  firstName?: string;
  lastName?: string;
  anchorKind: AnchorKind | null;
  anchorId: string | null;
  preferredLanguage?: string;
}

interface GatewayLoginResponse {
  user: GatewayUser;
  accessToken?: string;
}

const projectUser = (raw: GatewayUser): User => {
  const nameParts = [raw.firstName, raw.lastName].filter(Boolean);
  return {
    id: raw.id,
    email: raw.email,
    role: raw.role,
    name: nameParts.length ? nameParts.join(' ') : raw.email,
    anchorKind: raw.anchorKind,
    anchorId: raw.anchorId,
    preferredLanguage: raw.preferredLanguage,
  };
};

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post<GatewayLoginResponse>('/api/v1/auth/login', {
      email,
      password,
    });
    if (response.data.accessToken) {
      localStorage.setItem(AUTH_TOKEN_KEY, response.data.accessToken);
    }
    return { user: projectUser(response.data.user) };
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
    return { user: projectUser(response.data) };
  },
};
