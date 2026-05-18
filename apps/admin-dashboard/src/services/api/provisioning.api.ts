import { apiClient } from './api-client';

export type InvitableRole = 'STA_ADMIN' | 'BOARD_ADMIN' | 'SCHOOL_ADMIN' | 'DRIVER' | 'PARENT';

export interface InviteUserPayload {
  email: string;
  role: InvitableRole;
  schoolId?: string;
  boardId?: string;
}

export interface ProvisionedUser {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  schoolId?: string;
  boardId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface InviteResponse {
  message: string;
  invitationUrl: string;
}

export const provisioningApi = {
  async inviteUser(payload: InviteUserPayload): Promise<InviteResponse> {
    const response = await apiClient.post<InviteResponse>('/api/v1/provisioning/invite', payload);
    return response.data;
  },

  async listUsers(): Promise<ProvisionedUser[]> {
    const response = await apiClient.get<ProvisionedUser[]>('/api/v1/provisioning/users');
    return response.data;
  },

  async deactivateUser(userId: string): Promise<{ message: string }> {
    const response = await apiClient.patch<{ message: string }>(
      `/api/v1/provisioning/users/${userId}/deactivate`,
    );
    return response.data;
  },

  async reactivateUser(userId: string): Promise<{ message: string }> {
    const response = await apiClient.patch<{ message: string }>(
      `/api/v1/provisioning/users/${userId}/reactivate`,
    );
    return response.data;
  },
};
